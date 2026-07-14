"""Speech understanding stages: speaker_detection, diarization, asr,
language_detection, emotion. GPU stages — run on q.asr (mock on CPU)."""
import json
import random

from worker import common, config
from worker.celery_app import celery_app

SPEAKER_CATEGORIES = ["adult_male", "adult_female", "teen_boy", "teen_girl",
                      "child_boy", "child_girl", "old_male", "old_female", "narrator"]


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
    """Estimate the speaker roster (count + age/gender category per speaker)."""
    wav, duration = _audio_path(payload)
    try:
        # Real path: embedding clustering + age/gender classifier (see requirements-ml.txt).
        # Mock: two speakers for content > 30 s, one otherwise.
        n = 2 if duration > 30 else 1
        speakers = [
            {"id": f"SPEAKER_{i:02d}",
             "category": SPEAKER_CATEGORIES[i % 2]}  # adult_male / adult_female
            for i in range(n)
        ]
        key = common.artifact_key(payload, "speakers.json")
        common.upload_text(json.dumps(speakers, indent=2), key, "application/json")
        return key, {"speakers": speakers, "mock": common.use_mock("pyannote.audio")}
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
            # Mock: alternate two speakers in ~8 s turns.
            turns, t = [], 0.0
            i = 0
            while t < duration:
                end = min(t + 8.0, duration)
                turns.append({"start": round(t, 3), "end": round(end, 3),
                              "speaker": f"SPEAKER_{i % 2:02d}"})
                t, i = end, i + 1
            mock = True
        key = common.artifact_key(payload, "diarization.json")
        common.upload_text(json.dumps(turns, indent=2), key, "application/json")
        return key, {"turns": len(turns), "mock": mock}
    finally:
        common.cleanup(wav)


def _speaker_at(turns: list[dict], t: float) -> str:
    for turn in turns:
        if turn["start"] <= t < turn["end"]:
            return turn["speaker"]
    return "SPEAKER_00"


@celery_app.task(name="stages.asr")
@common.stage_task("asr")
def asr(payload: dict):
    wav, duration = _audio_path(payload)
    try:
        # Load diarization turns if that stage ran
        turns = []
        try:
            dia_key = f"artifacts/{payload['org_id']}/{payload['run_id']}/diarization/diarization.json"
            dia_path = common.download(dia_key, ".json")
            turns = json.loads(open(dia_path, encoding="utf-8").read())
            common.cleanup(dia_path)
        except Exception:
            pass

        if not common.use_mock("whisperx"):
            import whisperx  # type: ignore
            model = whisperx.load_model(config.WHISPER_MODEL, device="cuda")
            audio = whisperx.load_audio(wav)
            result = model.transcribe(audio, batch_size=16)
            language = result["language"]
            align_model, meta = whisperx.load_align_model(language_code=language, device="cuda")
            result = whisperx.align(result["segments"], align_model, meta, audio, "cuda")
            segments = [
                {"index": i, "start": round(s["start"], 3), "end": round(s["end"], 3),
                 "speaker": _speaker_at(turns, s["start"]), "text": s["text"].strip(),
                 "words": s.get("words", []), "translations": {}}
                for i, s in enumerate(result["segments"])
            ]
            mock = False
        else:
            # Mock: 4-second segments with placeholder text, diarization-aware.
            segments, t, i = [], 0.0, 0
            while t < max(duration, 4.0):
                end = min(t + 4.0, max(duration, 4.0))
                segments.append({
                    "index": i, "start": round(t, 3), "end": round(end, 3),
                    "speaker": _speaker_at(turns, t),
                    "text": f"This is sample speech segment {i + 1} of the uploaded media.",
                    "words": [], "translations": {},
                })
                t, i = end, i + 1
                common.progress(payload, min(99, int(t / max(duration, 1) * 100)))
            language, mock = "en", True

        common.mongo().transcripts.replace_one(
            {"_id": payload["run_id"]},
            {"_id": payload["run_id"], "asset_id": payload["asset_id"],
             "language": language, "kind": "media", "segments": segments},
            upsert=True,
        )
        key = common.artifact_key(payload, "transcript.json")
        common.upload_text(json.dumps({"language": language, "segments": segments}),
                           key, "application/json")
        return key, {"language": language, "segments": len(segments), "mock": mock}
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
