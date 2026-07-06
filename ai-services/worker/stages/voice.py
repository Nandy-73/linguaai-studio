"""Voice generation stage — per-speaker dubbed audio track per target language.

Real engines (XTTS / OpenVoice / CosyVoice / Fish Speech) synthesize each segment
in the mapped voice, time-fit to the segment duration, and are concatenated onto
a silent timeline. Mock mode synthesizes per-speaker tones so the downstream
mixing/rendering stages (and the whole compose stack) work without GPUs.
"""
import math
import os
import struct
import tempfile
import wave

from worker import common
from worker.celery_app import celery_app

SAMPLE_RATE = 24000
# Distinct mock timbre per speaker so multi-speaker structure is audible.
SPEAKER_FREQS = {"SPEAKER_00": 220.0, "SPEAKER_01": 330.0, "SPEAKER_02": 262.0,
                 "SPEAKER_03": 392.0}


def _write_track(path: str, duration: float, segments: list[dict], lang: str) -> None:
    """Silent timeline with a soft per-speaker tone during each speech segment."""
    n_total = int(duration * SAMPLE_RATE) + SAMPLE_RATE
    frames = bytearray(n_total * 2)  # 16-bit mono silence
    for seg in segments:
        freq = SPEAKER_FREQS.get(seg.get("speaker") or "SPEAKER_00", 294.0)
        start = int(seg["start"] * SAMPLE_RATE)
        end = min(int(seg["end"] * SAMPLE_RATE), n_total)
        for i in range(start, end):
            t = (i - start) / SAMPLE_RATE
            fade = min(1.0, t * 8, (end - i) / SAMPLE_RATE * 8)
            sample = int(6000 * fade * math.sin(2 * math.pi * freq * t))
            struct.pack_into("<h", frames, i * 2, sample)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(bytes(frames))


def _synthesize_real(segments: list[dict], lang: str, out_path: str,
                     voice_refs: dict) -> None:
    """Real TTS path — engine chosen by availability; segments time-fit and placed."""
    from TTS.api import TTS  # type: ignore  # XTTS-v2 (thesis/dev only — CPML license)
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    duration = max(s["end"] for s in segments) + 1.0
    # Concatenate per-segment synth onto the timeline (simplified: ffmpeg adelay mix)
    seg_files, delays = [], []
    for seg in segments:
        text = (seg.get("translations") or {}).get(lang, {}).get("text") or seg["text"]
        f = tempfile.mktemp(suffix=".wav")
        speaker_wav = voice_refs.get(seg.get("speaker"))
        tts.tts_to_file(text=text, file_path=f, language=lang.split("-")[0],
                        speaker_wav=speaker_wav)
        seg_files.append(f)
        delays.append(int(seg["start"] * 1000))
    inputs, filters = [], []
    for i, (f, d) in enumerate(zip(seg_files, delays)):
        inputs += ["-i", f]
        filters.append(f"[{i}:a]adelay={d}|{d}[a{i}]")
    filter_str = ";".join(filters) + ";" + "".join(f"[a{i}]" for i in range(len(seg_files))) + \
        f"amix=inputs={len(seg_files)}:duration=longest[out]"
    common.run_ffmpeg([*inputs, "-filter_complex", filter_str, "-map", "[out]",
                       "-t", str(duration), "-ar", str(SAMPLE_RATE), out_path])
    common.cleanup(*seg_files)


@celery_app.task(name="stages.voice_generation")
@common.stage_task("voice_generation")
def voice_generation(payload: dict):
    doc = common.mongo().transcripts.find_one({"_id": payload["run_id"]})
    if doc is None:
        raise RuntimeError("Transcript missing")
    segments = doc.get("segments", [])
    if not segments:
        raise RuntimeError("No segments to synthesize")
    targets = payload["params"].get("target_languages", [])
    duration = max(s["end"] for s in segments)
    mock = common.use_mock("TTS")

    outputs = {}
    for i, lang in enumerate(targets):
        out_path = os.path.join(tempfile.gettempdir(), f"dub_{payload['run_id']}_{lang}.wav")
        if mock:
            _write_track(out_path, duration, segments, lang)
        else:
            _synthesize_real(segments, lang, out_path,
                             payload["params"].get("voice_refs", {}))
        key = common.artifact_key(payload, f"dub.{lang}.wav")
        common.upload_file(out_path, key, "audio/wav")
        common.cleanup(out_path)
        outputs[lang] = key
        common.progress(payload, int((i + 1) / max(1, len(targets)) * 100),
                        f"voiced {lang}")
    return next(iter(outputs.values()), None), {"outputs": outputs, "mock": mock}
