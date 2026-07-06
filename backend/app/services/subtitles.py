"""Subtitle rendering from transcript segments (SRT / VTT)."""


def _fmt_ts(seconds: float, sep: str) -> str:
    ms = int(round(seconds * 1000))
    h, rem = divmod(ms, 3600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def segment_text(segment: dict, lang: str | None) -> str:
    if lang and lang in (segment.get("translations") or {}):
        return segment["translations"][lang].get("text", "")
    return segment.get("text", "")


def to_srt(segments: list[dict], lang: str | None = None) -> str:
    lines = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{_fmt_ts(seg['start'], ',')} --> {_fmt_ts(seg['end'], ',')}")
        lines.append(segment_text(seg, lang).strip())
        lines.append("")
    return "\n".join(lines)


def to_vtt(segments: list[dict], lang: str | None = None) -> str:
    lines = ["WEBVTT", ""]
    for seg in segments:
        lines.append(f"{_fmt_ts(seg['start'], '.')} --> {_fmt_ts(seg['end'], '.')}")
        lines.append(segment_text(seg, lang).strip())
        lines.append("")
    return "\n".join(lines)
