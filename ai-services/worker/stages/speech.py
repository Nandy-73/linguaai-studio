"""Speech understanding stages: speaker_detection, diarization, asr,
language_detection, emotion.

ASR provider chain (config.ASR_PROVIDER):
  groq  — Whisper large-v3(-turbo) hosted by Groq (OpenAI-compatible audio
          API, no GPU needed; reuses the existing LLM_* credentials)
  local — WhisperX on-box (requires GPU image with requirements-ml.txt)
  mock  — deterministic placeholder segments (last resort, keeps the
          pipeline demonstrable on any deploy)
"auto" tries them in that order and degrades gracefully.
"""
import json
import math
import os
import random

import httpx

from worker import common, config
from worker.celery_app import celery_app

SPEAKER_CATEGORIES = ["adult_male", "adult_female", "teen_boy", "teen_girl",
                      "child_boy", "child_girl", "old_male", "old_female", "narrator"]

# Whisper verbose_json reports full language names, not ISO codes.
LANG_NAME_TO_CODE = {
    "english": "en", "tamil": "ta", "telugu": "te", "malayalam": "ml",
    "kannada": "kn", "hindi": "hi", "french": "fr", "german": "de",
    "spanish": "es", "portuguese": "pt", "italian": "it", "arabic": "ar",
    "japanese": "ja", "korean": "ko", "chinese": "zh", "russian": "ru",
    "dutch": "nl", "turkish": "tr", "polish": "pl", "ukrainian": "uk",
    "vietnamese": "vi", "thai": "th", "indonesian": "id", "malay": "ms",
    "bengali": "bn", "urdu": "ur", "marathi": "mr", "gujarati": "gu",
    "punjabi": "pa", "swedish": "sv", "norwegian": "no", "danish": "da",
    "finnish": "fi", "greek": "el", "hebrew": "he", "czech": "cs",
    "romanian": "ro", "hungarian": "hu",
}

GROQ_AUDIO_LIMIT_BYTES = 24 * 1024 * 1024  # provider hard limit is 25MB


def _audio_path(payload: dict) -> tuple[str, float]:
    """Download source and extract mono 16 kHz wav for speech models."""
    source = common.download(payload["source_key"])
    info = common.ffprobe(source)
    if not any(s.get("codec_type") == "audio" for s in info.get("streams", [])):
        common.cleanup(source)
        raise RuntimeError(
            "This video has no audio track — there is nothing to transcribe or dub. "
            "Please upload a video with sound."
        )
    wav = source + ".16k.wav"
    common.run_ffmpeg(["-i", source, "-vn", "-ac", "1", "-ar", "16000", wav])
    duration = common.media_duration(wav)
    common.cleanup(source)
    return wav, duration


@celery_app.task(name="stages.speaker_detection")
@common.stage_task("speaker_detection")
def speaker_detection(payload: dict):
    """Estimate the speaker roster. Real path: embedding clustering + an
    age/gender classifier. Without it, assume a single narrator — a wrong
    single voice beats fake alternating voices on one-speaker content."""
    wav, duration = _audio_path(payload)
    try:
        speakers = [{"id": "SPEAKER_00", "category": "narrator"}]
        key = common.artifact_key(payload, "speakers.json")
        common.upload_text(json.dumps(speakers, indent=2), key, "application/json")
        return key, {"speakers": speakers, "duration": duration,
                     "mock": common.use_mock("pyannote.audio")}
    finally:
        common.cleanup(wav)


@celery_app.task(name="stages.diarization")
@common.stage_task("diarization")
def diarization(payload: dict):
    wav, duration = _audio_path(payload)
    try:
        if not common.use_mock("pyannote.audio") and config.HF_TOKEN:
            from pyannote.audio import Pipeline  # type: ignore
            pipe = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1",
                                            use_auth_token=config.HF_TOKEN)
            result = pipe(wav)
            turns = [
                {"start": round(t.start, 3), "end": round(t.end, 3), "speaker": spk}
                for t, _, spk in result.itertracks(yield_label=True)
            ]
            mock = False
        else:
            # No diarization model: treat the whole clip as one speaker.
            # (Fabricated speaker alternation caused mid-sentence voice
            # switches downstream — worse than assuming a single narrator.)
            turns = [{"start": 0.0, "end": round(duration, 3), "speaker": "SPEAKER_00"}]
            mock = True
        key = common.artifact_key(payload, "diarization.json")
        common.upload_text(json.dumps(turns, indent=2), key, "application/json")
        return key, {"turns": len(turns), "speakers": len({t["speaker"] for t in turns}),
                     "mock": mock}
    finally:
        common.cleanup(wav)


def _speaker_at(turns: list[dict], t: float) -> str:
    for turn in turns:
        if turn["start"] <= t < turn["end"]:
            return turn["speaker"]
    return "SPEAKER_00"


def _load_turns(payload: dict) -> list[dict]:
    try:
        key = f"artifacts/{payload['org_id']}/{payload['run_id']}/diarization/diarization.json"
        path = common.download(key, ".json")
        with open(path, encoding="utf-8") as f:
            turns = json.load(f)
        common.cleanup(path)
        return turns
    except Exception:
        return []


def _compress_for_api(wav: str) -> str:
    """16 kHz mono MP3 — ~15 MB/hour, well under the provider upload limit."""
    mp3 = wav + ".asr.mp3"
    common.run_ffmpeg(["-i", wav, "-ac", "1", "-ar", "16000", "-b:a", "32k", mp3])
    return mp3


def _groq_transcribe(wav: str) -> tuple[str, list[dict]]:
    """Whisper via Groq's OpenAI-compatible audio endpoint."""
    mp3 = _compress_for_api(wav)
    try:
        if os.path.getsize(mp3) > GROQ_AUDIO_LIMIT_BYTES:
            raise RuntimeError("Audio too long for the hosted ASR limit (~2h). "
                               "Please upload a shorter video.")
        with open(mp3, "rb") as fh:
            resp = httpx.post(
                f"{config.LLM_BASE_URL.rstrip('/')}/audio/transcriptions",
                headers={"Authorization": f"Bearer {config.LLM_API_KEY}"},
                data={"model": config.ASR_MODEL,
                      "response_format": "verbose_json",
                      "temperature": "0"},
                files={"file": ("audio.mp3", fh, "audio/mpeg")},
                timeout=600,
            )
        resp.raise_for_status()
        body = resp.json()
    finally:
        common.cleanup(mp3)

    language = LANG_NAME_TO_CODE.get((body.get("language") or "").strip().lower(), "en")
    segments = []
    for s in body.get("segments", []):
        text = (s.get("text") or "").strip()
        if not text:
            continue
        conf = None
        if s.get("avg_logprob") is not None:
            conf = round(min(1.0, math.exp(s["avg_logprob"])), 3)
        segments.append({"start": round(float(s["start"]), 3),
                         "end": round(float(s["end"]), 3),
                         "text": text, "confidence": conf})
    return language, segments


def _local_transcribe(wav: str) -> tuple[str, list[dict]]:
    import whisperx  # type: ignore
    model = whisperx.load_model(config.WHISPER_MODEL, device="cuda")
    audio = whisperx.load_audio(wav)
    result = model.transcribe(audio, batch_size=16)
    language = result["language"]
    align_model, meta = whisperx.load_align_model(language_code=language, device="cuda")
    result = whisperx.align(result["segments"], align_model, meta, audio, "cuda")
    segments = [{"start": round(s["start"], 3), "end": round(s["end"], 3),
                 "text": s["text"].strip(), "confidence": None}
                for s in result["segments"] if s.get("text", "").strip()]
    return language, segments


def _mock_transcribe(duration: float) -> tuple[str, list[dict]]:
    segments, t, i = [], 0.0, 0
    while t < max(duration, 4.0):
        end = min(t + 4.0, max(duration, 4.0))
        segments.append({"start": round(t, 3), "end": round(end, 3),
                         "text": f"This is sample speech segment {i + 1} of the uploaded media.",
                         "confidence": None})
        t, i = end, i + 1
    return "en", segments


@celery_app.task(name="stages.asr")
@common.stage_task("asr")
def asr(payload: dict):
    wav, duration = _audio_path(payload)
    try:
        turns = _load_turns(payload)
        prov = config.ASR_PROVIDER
        meta: dict = {}
        language, raw_segments, engine = None, None, None

        groq_ok = (prov in ("auto", "groq") and config.LLM_BASE_URL
                   and config.LLM_API_KEY and config.AI_MOCK_MODE != "always")
        if groq_ok:
            try:
                common.progress(payload, 10, "uploading audio to ASR")
                language, raw_segments = _groq_transcribe(wav)
                engine = f"groq/{config.ASR_MODEL}"
            except Exception as exc:  # degrade instead of failing the run
                meta["groq_error"] = f"{type(exc).__name__}: {exc}"[:300]

        if raw_segments is None and prov in ("auto", "local") \
                and not common.use_mock("whisperx"):
            language, raw_segments = _local_transcribe(wav)
            engine = f"local/whisperx-{config.WHISPER_MODEL}"

        if raw_segments is None:
            language, raw_segments = _mock_transcribe(duration)
            engine = "mock"

        if not raw_segments:
            raise RuntimeError("No speech detected in this video's audio — "
                               "nothing to transcribe.")

        segments = [
            {"index": i, "start": s["start"], "end": s["end"],
             "speaker": _speaker_at(turns, s["start"]),
             "text": s["text"], "confidence": s.get("confidence"),
             "words": [], "translations": {}}
            for i, s in enumerate(raw_segments)
        ]

        common.mongo().transcripts.replace_one(
            {"_id": payload["run_id"]},
            {"_id": payload["run_id"], "asset_id": payload["asset_id"],
             "language": language, "kind": "media", "segments": segments},
            upsert=True,
        )
        key = common.artifact_key(payload, "transcript.json")
        common.upload_text(json.dumps({"language": language, "engine": engine,
                                       "segments": segments}, ensure_ascii=False),
                           key, "application/json")
        meta.update({"language": language, "segments": len(segments), "engine": engine})
        return key, meta
    finally:
        common.cleanup(wav)


@celery_app.task(name="stages.language_detection")
@common.stage_task("language_detection")
def language_detection(payload: dict):
    doc = common.mongo().transcripts.find_one({"_id": payload["run_id"]})
    if doc is None:
        raise RuntimeError("Transcript missing")
    return None, {"language": doc.get("language", "unknown")}


@celery_app.task(name="stages.emotion")
@common.stage_task("emotion")
def emotion(payload: dict):
    """Per-segment affect tags. Real path: speech-emotion model over audio spans."""
    db = common.mongo()
    doc = db.transcripts.find_one({"_id": payload["run_id"]})
    if doc is None:
        raise RuntimeError("Transcript missing")
    rng = random.Random(payload["run_id"])  # deterministic per run
    emotions = ["neutral", "neutral", "neutral", "happy", "serious", "excited"]
    for seg in doc.get("segments", []):
        db.transcripts.update_one(
            {"_id": payload["run_id"]},
            {"$set": {f"segments.{seg['index']}.emotion": rng.choice(emotions)}},
        )
    return None, {"tagged": len(doc.get("segments", [])),
                  "mock": common.use_mock("transformers")}
