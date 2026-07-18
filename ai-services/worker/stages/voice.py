"""Voice generation stage — per-speaker dubbed audio track per target language.

Provider chain (config.TTS_PROVIDER):
  edge — Microsoft Edge neural voices (free, no key, 100+ languages incl.
         Tamil/Telugu/Hindi etc., female+male per language)
  mock — per-speaker sine tones (keeps the pipeline runnable anywhere)

Synchronization model (the part that makes dubs feel "in sync"):
  * every segment is synthesized independently in its speaker's voice
  * the clip is decoded to PCM and measured; if it overruns its slot
    (this segment's start → next segment's start) it is tempo-compressed
    with ffmpeg atempo, capped at 1.5x to stay natural
  * the (possibly compressed) clip is pasted onto a silent PCM timeline at
    the segment's exact start timestamp — never early, never late
  * a failed segment falls back to a soft tone instead of failing the run
"""
import asyncio
import math
import os
import struct
import tempfile
import wave

from worker import common, config
from worker.celery_app import celery_app

SAMPLE_RATE = 24000
MAX_TEMPO = 1.5          # beyond this, speech sounds rushed/robotic
SPILL_SECONDS = 0.4      # how far a clip may run into the following gap

# lang → [female, male] Edge neural voices. Speakers cycle through the list
# so each diarized speaker keeps one consistent voice for the whole video.
VOICE_MAP: dict[str, list[str]] = {
    "ta": ["ta-IN-PallaviNeural", "ta-IN-ValluvarNeural"],
    "te": ["te-IN-ShrutiNeural", "te-IN-MohanNeural"],
    "ml": ["ml-IN-SobhanaNeural", "ml-IN-MidhunNeural"],
    "kn": ["kn-IN-SapnaNeural", "kn-IN-GaganNeural"],
    "hi": ["hi-IN-SwaraNeural", "hi-IN-MadhurNeural"],
    "bn": ["bn-IN-TanishaaNeural", "bn-IN-BashkarNeural"],
    "mr": ["mr-IN-AarohiNeural", "mr-IN-ManoharNeural"],
    "gu": ["gu-IN-DhwaniNeural", "gu-IN-NiranjanNeural"],
    "ur": ["ur-PK-UzmaNeural", "ur-PK-AsadNeural"],
    "en": ["en-US-AriaNeural", "en-US-GuyNeural"],
    "fr": ["fr-FR-DeniseNeural", "fr-FR-HenriNeural"],
    "de": ["de-DE-KatjaNeural", "de-DE-ConradNeural"],
    "es": ["es-ES-ElviraNeural", "es-ES-AlvaroNeural"],
    "pt": ["pt-BR-FranciscaNeural", "pt-BR-AntonioNeural"],
    "it": ["it-IT-ElsaNeural", "it-IT-DiegoNeural"],
    "ar": ["ar-SA-ZariyahNeural", "ar-SA-HamedNeural"],
    "ja": ["ja-JP-NanamiNeural", "ja-JP-KeitaNeural"],
    "ko": ["ko-KR-SunHiNeural", "ko-KR-InJoonNeural"],
    "zh": ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"],
    "ru": ["ru-RU-SvetlanaNeural", "ru-RU-DmitryNeural"],
    "tr": ["tr-TR-EmelNeural", "tr-TR-AhmetNeural"],
    "nl": ["nl-NL-FennaNeural", "nl-NL-MaartenNeural"],
    "pl": ["pl-PL-ZofiaNeural", "pl-PL-MarekNeural"],
    "uk": ["uk-UA-PolinaNeural", "uk-UA-OstapNeural"],
    "vi": ["vi-VN-HoaiMyNeural", "vi-VN-NamMinhNeural"],
    "th": ["th-TH-PremwadeeNeural", "th-TH-NiwatNeural"],
    "id": ["id-ID-GadisNeural", "id-ID-ArdiNeural"],
    "sv": ["sv-SE-SofieNeural", "sv-SE-MattiasNeural"],
    "el": ["el-GR-AthinaNeural", "el-GR-NestorasNeural"],
    "cs": ["cs-CZ-VlastaNeural", "cs-CZ-AntoninNeural"],
    "ro": ["ro-RO-AlinaNeural", "ro-RO-EmilNeural"],
    "hu": ["hu-HU-NoemiNeural", "hu-HU-TamasNeural"],
    "he": ["he-IL-HilaNeural", "he-IL-AvriNeural"],
    "fa": ["fa-IR-DilaraNeural", "fa-IR-FaridNeural"],
    "da": ["da-DK-ChristelNeural", "da-DK-JeppeNeural"],
    "fi": ["fi-FI-NooraNeural", "fi-FI-HarriNeural"],
    "no": ["nb-NO-PernilleNeural", "nb-NO-FinnNeural"],
}

# Distinct mock timbre per speaker so multi-speaker structure stays audible.
SPEAKER_FREQS = {"SPEAKER_00": 220.0, "SPEAKER_01": 330.0, "SPEAKER_02": 262.0,
                 "SPEAKER_03": 392.0}


# ── low-level audio helpers ──────────────────────────────────────────────────
def _tone_pcm(duration: float, freq: float) -> bytes:
    n = int(duration * SAMPLE_RATE)
    buf = bytearray(n * 2)
    for i in range(n):
        t = i / SAMPLE_RATE
        fade = min(1.0, t * 8, (n - i) / SAMPLE_RATE * 8)
        struct.pack_into("<h", buf, i * 2,
                         int(6000 * fade * math.sin(2 * math.pi * freq * t)))
    return bytes(buf)


def _decode_pcm(path: str, tempo: float = 1.0) -> bytes:
    """Decode any audio file to raw s16le mono 24 kHz, optionally tempo-fit."""
    raw = path + f".{tempo:.2f}.raw"
    args = ["-i", path]
    if tempo > 1.01:
        args += ["-filter:a", f"atempo={min(tempo, 2.0):.3f}"]
    args += ["-f", "s16le", "-acodec", "pcm_s16le", "-ac", "1",
             "-ar", str(SAMPLE_RATE), raw]
    common.run_ffmpeg(args)
    with open(raw, "rb") as f:
        pcm = f.read()
    common.cleanup(raw)
    return pcm


def _edge_synthesize(text: str, voice: str) -> bytes:
    """One segment through Edge neural TTS → PCM. Raises on failure."""
    import edge_tts  # type: ignore

    mp3 = tempfile.mktemp(suffix=".mp3")

    async def _run():
        await edge_tts.Communicate(text, voice).save(mp3)

    try:
        asyncio.run(_run())
        if not os.path.exists(mp3) or os.path.getsize(mp3) < 200:
            raise RuntimeError("empty synthesis result")
        return _decode_pcm(mp3)
    finally:
        common.cleanup(mp3)


# ── stage ────────────────────────────────────────────────────────────────────
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
    total_duration = max(s["end"] for s in segments) + 2.0
    speakers = sorted({s.get("speaker") or "SPEAKER_00" for s in segments})

    use_edge = (config.TTS_PROVIDER in ("auto", "edge")
                and config.AI_MOCK_MODE != "always"
                and common.module_available("edge_tts"))

    outputs: dict[str, str] = {}
    voices_used: dict[str, dict] = {}
    failed_total = 0

    for li, lang in enumerate(targets):
        lang_voices = VOICE_MAP.get(lang) or VOICE_MAP.get(lang.split("-")[0])
        engine = "edge" if (use_edge and lang_voices) else "mock"
        voice_for = {
            spk: lang_voices[i % len(lang_voices)] if lang_voices else None
            for i, spk in enumerate(speakers)
        }
        if engine == "edge":
            voices_used[lang] = voice_for

        timeline = bytearray(int(total_duration * SAMPLE_RATE) * 2)
        failed = 0

        for si, seg in enumerate(segments):
            start_b = int(seg["start"] * SAMPLE_RATE) * 2
            next_start = segments[si + 1]["start"] if si + 1 < len(segments) \
                else total_duration
            slot = max(0.4, next_start - seg["start"])
            speaker = seg.get("speaker") or "SPEAKER_00"
            text = (seg.get("translations") or {}).get(lang, {}).get("text") \
                or seg.get("text", "")

            pcm = b""
            if engine == "edge" and text.strip():
                try:
                    pcm = _edge_synthesize(text, voice_for[speaker])
                    dur = len(pcm) / 2 / SAMPLE_RATE
                    if dur > slot * 1.05:  # overrun → tempo-fit, capped
                        tempo = min(dur / slot, MAX_TEMPO)
                        mp3 = tempfile.mktemp(suffix=".wav")
                        with wave.open(mp3, "wb") as w:
                            w.setnchannels(1); w.setsampwidth(2)
                            w.setframerate(SAMPLE_RATE); w.writeframes(pcm)
                        pcm = _decode_pcm(mp3, tempo=tempo)
                        common.cleanup(mp3)
                except Exception:
                    failed += 1
                    pcm = b""
            if not pcm:  # mock engine, empty text, or synthesis failure
                freq = SPEAKER_FREQS.get(speaker, 294.0)
                pcm = _tone_pcm(min(seg["end"] - seg["start"], slot), freq)

            limit = int((slot + SPILL_SECONDS) * SAMPLE_RATE) * 2
            pcm = pcm[:limit]
            end_b = min(start_b + len(pcm), len(timeline))
            timeline[start_b:end_b] = pcm[: end_b - start_b]

            if si % 5 == 0:
                pct = int(((li + si / len(segments)) / max(1, len(targets))) * 100)
                common.progress(payload, min(99, pct), f"{lang} segment {si + 1}/{len(segments)}")

        out_path = os.path.join(tempfile.gettempdir(),
                                f"dub_{payload['run_id']}_{lang}.wav")
        with wave.open(out_path, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SAMPLE_RATE)
            w.writeframes(bytes(timeline))
        key = common.artifact_key(payload, f"dub.{lang}.wav")
        common.upload_file(out_path, key, "audio/wav")
        common.cleanup(out_path)
        outputs[lang] = key
        failed_total += failed

    return next(iter(outputs.values()), None), {
        "outputs": outputs,
        "engine": "edge" if use_edge else "mock",
        "voices": voices_used,
        "failed_segments": failed_total,
        "speakers": speakers,
    }
