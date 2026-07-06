"""Media stages: probe, subtitle_generation, audio_mixing, video_render, documents.
CPU-only — runs on q.media."""
from pathlib import Path

from worker import common
from worker.celery_app import celery_app


def _fmt_ts(seconds: float, sep: str) -> str:
    ms = int(round(seconds * 1000))
    h, rem = divmod(ms, 3600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def _seg_text(seg: dict, lang: str | None) -> str:
    if lang and lang in (seg.get("translations") or {}):
        return seg["translations"][lang].get("text", "")
    return seg.get("text", "")


def _to_srt(segments: list[dict], lang: str | None) -> str:
    out = []
    for i, seg in enumerate(segments, 1):
        out += [str(i), f"{_fmt_ts(seg['start'], ',')} --> {_fmt_ts(seg['end'], ',')}",
                _seg_text(seg, lang).strip(), ""]
    return "\n".join(out)


def _to_vtt(segments: list[dict], lang: str | None) -> str:
    out = ["WEBVTT", ""]
    for seg in segments:
        out += [f"{_fmt_ts(seg['start'], '.')} --> {_fmt_ts(seg['end'], '.')}",
                _seg_text(seg, lang).strip(), ""]
    return "\n".join(out)


@celery_app.task(name="stages.probe")
@common.stage_task("probe")
def probe(payload: dict):
    path = common.download(payload["source_key"])
    try:
        info = common.ffprobe(path)
        duration = float(info.get("format", {}).get("duration", 0.0))
        streams = [
            {"type": s.get("codec_type"), "codec": s.get("codec_name"),
             "width": s.get("width"), "height": s.get("height"),
             "sample_rate": s.get("sample_rate")}
            for s in info.get("streams", [])
        ]
        common.backend_internal_post(
            f"/api/v1/internal/assets/{payload['asset_id']}/probe",
            {"duration_seconds": duration, "probe": {"streams": streams}},
        )
        return None, {"duration": duration, "streams": streams}
    finally:
        common.cleanup(path)


@celery_app.task(name="stages.subtitle_generation")
@common.stage_task("subtitle_generation")
def subtitle_generation(payload: dict):
    doc = common.mongo().transcripts.find_one({"_id": payload["run_id"]})
    if doc is None:
        raise RuntimeError("Transcript missing — ASR stage did not produce output")
    segments = doc.get("segments", [])
    langs = payload["params"].get("target_languages", [])
    first_key = None
    for i, lang in enumerate([None, *langs]):  # None = source-language subtitles
        tag = lang or doc.get("language", "src")
        srt_key = common.artifact_key(payload, f"subtitles.{tag}.srt")
        vtt_key = common.artifact_key(payload, f"subtitles.{tag}.vtt")
        common.upload_text(_to_srt(segments, lang), srt_key, "application/x-subrip")
        common.upload_text(_to_vtt(segments, lang), vtt_key, "text/vtt")
        first_key = first_key or srt_key
        common.progress(payload, int((i + 1) / (len(langs) + 1) * 100), f"subtitles {tag}")
    return first_key, {"languages": [doc.get("language"), *langs], "segments": len(segments)}


@celery_app.task(name="stages.audio_mixing")
@common.stage_task("audio_mixing")
def audio_mixing(payload: dict):
    source = common.download(payload["source_key"])
    langs = payload["params"].get("target_languages", [])
    mixed_keys, tmp = {}, [source]
    try:
        for i, lang in enumerate(langs):
            tts_key = f"artifacts/{payload['org_id']}/{payload['run_id']}/voice_generation/dub.{lang}.wav"
            try:
                tts_path = common.download(tts_key, ".wav")
            except Exception:
                continue  # no dub track for this language
            tmp.append(tts_path)
            out_path = tts_path.replace(".wav", ".mixed.m4a")
            tmp.append(out_path)
            # Duck the original bed under the dubbed voice, loudness-normalize.
            common.run_ffmpeg([
                "-i", source, "-i", tts_path,
                "-filter_complex",
                "[0:a]volume=0.25[bed];[bed][1:a]amix=inputs=2:duration=first:dropout_transition=0,"
                "loudnorm=I=-16:TP=-1.5[out]",
                "-map", "[out]", "-c:a", "aac", out_path,
            ])
            key = common.artifact_key(payload, f"mixed.{lang}.m4a")
            common.upload_file(out_path, key, "audio/mp4")
            mixed_keys[lang] = key
            common.progress(payload, int((i + 1) / max(1, len(langs)) * 100), f"mixed {lang}")
        if not mixed_keys:
            raise RuntimeError("No dubbed audio tracks found to mix")
        return next(iter(mixed_keys.values())), {"mixed": mixed_keys}
    finally:
        common.cleanup(*tmp)


@celery_app.task(name="stages.video_render")
@common.stage_task("video_render")
def video_render(payload: dict):
    source = common.download(payload["source_key"])
    langs = payload["params"].get("target_languages", [])
    outputs, tmp = {}, [source]
    try:
        for i, lang in enumerate(langs):
            mixed_key = f"artifacts/{payload['org_id']}/{payload['run_id']}/audio_mixing/mixed.{lang}.m4a"
            srt_key = f"artifacts/{payload['org_id']}/{payload['run_id']}/subtitle_generation/subtitles.{lang}.srt"
            try:
                mixed = common.download(mixed_key, ".m4a")
            except Exception:
                continue
            tmp.append(mixed)
            out_path = mixed.replace(".m4a", ".final.mp4")
            tmp.append(out_path)
            args = ["-i", source, "-i", mixed]
            try:
                srt = common.download(srt_key, ".srt")
                tmp.append(srt)
                args += ["-i", srt, "-map", "0:v", "-map", "1:a", "-map", "2",
                         "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
                         "-metadata:s:s:0", f"language={lang}"]
            except Exception:
                args += ["-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy"]
            common.run_ffmpeg([*args, out_path])
            key = common.artifact_key(payload, f"final.{lang}.mp4")
            common.upload_file(out_path, key, "video/mp4")
            outputs[lang] = key
            common.progress(payload, int((i + 1) / max(1, len(langs)) * 100), f"rendered {lang}")
        if not outputs:
            raise RuntimeError("Nothing to render — mixing stage produced no tracks")
        return next(iter(outputs.values())), {"outputs": outputs}
    finally:
        common.cleanup(*tmp)


@celery_app.task(name="stages.document_extract")
@common.stage_task("document_extract")
def document_extract(payload: dict):
    path = common.download(payload["source_key"])
    try:
        suffix = Path(payload["source_key"]).suffix.lower()
        if suffix in (".txt", ".md", ".srt", ".vtt"):
            text = Path(path).read_text(encoding="utf-8", errors="replace")
        else:
            raise RuntimeError(
                f"Document type '{suffix}' not supported yet (txt/md/srt/vtt in this build)")
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        segments = [
            {"index": i, "start": 0.0, "end": 0.0, "speaker": None,
             "text": p, "translations": {}}
            for i, p in enumerate(paragraphs)
        ]
        common.mongo().transcripts.replace_one(
            {"_id": payload["run_id"]},
            {"_id": payload["run_id"], "asset_id": payload["asset_id"],
             "language": "auto", "kind": "document", "segments": segments},
            upsert=True,
        )
        return None, {"paragraphs": len(segments)}
    finally:
        common.cleanup(path)


@celery_app.task(name="stages.document_render")
@common.stage_task("document_render")
def document_render(payload: dict):
    doc = common.mongo().transcripts.find_one({"_id": payload["run_id"]})
    if doc is None:
        raise RuntimeError("Extracted document missing")
    outputs = {}
    for lang in payload["params"].get("target_languages", []):
        text = "\n\n".join(
            _seg_text(seg, lang) for seg in doc.get("segments", [])
        )
        key = common.artifact_key(payload, f"translated.{lang}.txt")
        common.upload_text(text, key)
        outputs[lang] = key
    return next(iter(outputs.values()), None), {"outputs": outputs}
