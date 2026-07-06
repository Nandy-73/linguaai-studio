"""Smoke tests that require no running services."""
from app.services import languages, subtitles
from app.services.pipelines import STAGE_QUEUES, TEMPLATES, estimate_credits


def test_language_registry_loads():
    langs = languages.all_languages()
    assert len(langs) >= 100
    assert languages.is_supported("ta")
    styles = languages.styles_for("ta")
    ids = [s["id"] for s in styles]
    assert "tanglish" in ids and "spoken" in ids


def test_every_stage_has_a_queue():
    for template, stages in TEMPLATES.items():
        for stage in stages:
            assert stage in STAGE_QUEUES, f"{stage} in {template} has no queue"


def test_credit_estimation():
    assert estimate_credits("subtitles", 600, 2) == 2 * 10 * 2
    assert estimate_credits("video_dubbing", None, 1) >= 10


def test_srt_rendering():
    segments = [
        {"start": 0.0, "end": 2.5, "text": "Hello", "translations": {"fr": {"text": "Bonjour"}}},
        {"start": 2.5, "end": 5.0, "text": "World", "translations": {"fr": {"text": "Monde"}}},
    ]
    srt = subtitles.to_srt(segments, "fr")
    assert "00:00:00,000 --> 00:00:02,500" in srt
    assert "Bonjour" in srt
    vtt = subtitles.to_vtt(segments)
    assert vtt.startswith("WEBVTT")
    assert "Hello" in vtt
