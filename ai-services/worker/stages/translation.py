"""LACTE — Language-Aware Contextual Translation Engine.

Stage `translation`: context-aware translation per target language, rendered
DIRECTLY in the resolved native style (register, honorifics, dialect,
code-mixing) — one LLM call per segment instead of a separate style-rewrite
pass. Halves API volume (free-tier rate limits) and gives the model full
context in a single decision.

Stage `style_selection`: with styling merged into translation, this stage
just records the resolved style map (kept as a distinct stage so the
pipeline template, progress UI and API contracts stay unchanged).

Live mode uses an OpenAI-compatible endpoint (Groq/vLLM); mock mode produces
tagged deterministic output so the pipeline stays runnable anywhere.
"""
import json
import time

import httpx

from worker import common, config
from worker.celery_app import celery_app

# Free-tier Groq allows ~30 requests/min — space calls to stay under it.
THROTTLE_SECONDS = 2.0
LLM_RETRIES = 4


def _llm(system: str, user: str, max_tokens: int = 800) -> str:
    """Chat completion with 429/5xx-aware backoff (honours Retry-After)."""
    last_error = "rate limited"
    for attempt in range(LLM_RETRIES + 1):
        resp = httpx.post(
            f"{config.LLM_BASE_URL.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {config.LLM_API_KEY or 'none'}"},
            json={"model": config.LLM_MODEL, "temperature": 0.3, "max_tokens": max_tokens,
                  "messages": [{"role": "system", "content": system},
                               {"role": "user", "content": user}]},
            timeout=180,
        )
        if resp.status_code == 429 and attempt < LLM_RETRIES:
            retry_after = resp.headers.get("retry-after")
            try:
                wait = float(retry_after) if retry_after else 5.0 * (2 ** attempt)
            except ValueError:
                wait = 5.0 * (2 ** attempt)
            last_error = f"429 (waited {wait:.0f}s, attempt {attempt + 1})"
            time.sleep(min(wait + 1.0, 65.0))
            continue
        if resp.status_code >= 500 and attempt < LLM_RETRIES:
            time.sleep(3.0)
            continue
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    raise RuntimeError(f"LLM unavailable after {LLM_RETRIES + 1} attempts: {last_error}")


def _live() -> bool:
    return bool(config.LLM_BASE_URL) and config.AI_MOCK_MODE != "always"


def _context_window(segments: list[dict], index: int, radius: int = 2) -> str:
    lo, hi = max(0, index - radius), min(len(segments), index + radius + 1)
    return " / ".join(s["text"] for s in segments[lo:hi])


def _resolve_style(lang: str, requested: str) -> dict:
    """Ask the platform's language registry; fall back to a neutral style."""
    try:
        data = common.backend_get(f"/api/v1/languages/{lang}/styles")
        styles = {s["id"]: s for s in data["styles"]}
        if requested != "auto" and requested in styles:
            return styles[requested]
        return styles.get(data["default"], {"id": "standard", "name": "Standard", "axes": {}})
    except Exception:
        return {"id": "standard", "name": "Standard", "axes": {}}


def _style_directive(style: dict, lang: str) -> str:
    axes = style.get("axes", {})
    parts = [f"Target language: {lang}.", f"Style: {style.get('name', 'Standard')}."]
    if axes.get("register"):
        parts.append(f"Register: {axes['register']}.")
    if axes.get("honorific"):
        parts.append(f"Honorific level: {axes['honorific']} — apply the correct verb "
                     "morphology and pronouns consistently.")
    if axes.get("region"):
        parts.append(f"Regional variety: {axes['region']} — use its lexis and idiom.")
    if axes.get("script"):
        parts.append(f"Script: {axes['script']}.")
    if axes.get("codemix"):
        parts.append("Natural code-mixing with English is expected (as native urban "
                     f"speakers talk), level {axes['codemix']}/3.")
    if axes.get("simplification"):
        parts.append(f"Simplification: {axes['simplification']} — short sentences, "
                     "common words only.")
    if axes.get("modality") == "spoken":
        parts.append("Spoken feel: contractions and natural rhythm, as if said aloud.")
    return " ".join(parts)


def _translate_segment(seg: dict, segments: list[dict], src_lang: str,
                       tgt_lang: str, directive: str, emotion: str) -> str:
    if _live():
        system = (
            "You are LACTE, a context-aware dubbing translator. Translate the SEGMENT "
            f"from {src_lang} into natural speech. {directive} "
            "Use the CONTEXT only for disambiguation — translate only the SEGMENT. "
            "Preserve names, technical terms and punctuation; keep the speaker's "
            f"emotion ({emotion}); translate idioms by meaning, never word-for-word. "
            "Keep it close to the original's spoken length. "
            "Return ONLY the translation."
        )
        user = (f"CONTEXT: {_context_window(segments, seg['index'])}\n"
                f"SEGMENT: {seg['text']}")
        return _llm(system, user)
    return f"[{tgt_lang}] {seg['text']}"


@celery_app.task(name="stages.translation")
@common.stage_task("translation")
def translation(payload: dict):
    db = common.mongo()
    doc = db.transcripts.find_one({"_id": payload["run_id"]})
    if doc is None:
        raise RuntimeError("Transcript missing — run ASR/extract first")
    segments = doc.get("segments", [])
    src_lang = doc.get("language", "en")
    targets = payload["params"].get("target_languages", [])
    requested = payload["params"].get("styles", {})

    # Resolve each target's native style up front so translation renders
    # directly in style — no second LLM pass needed.
    resolved: dict[str, dict] = {
        lang: _resolve_style(lang, requested.get(lang, "auto")) for lang in targets
    }

    total = max(1, len(segments) * len(targets))
    done = 0
    for lang in targets:
        style = resolved[lang]
        directive = _style_directive(style, lang)
        for seg in segments:
            text = _translate_segment(seg, segments, src_lang, lang, directive,
                                      seg.get("emotion", "neutral"))
            db.transcripts.update_one(
                {"_id": payload["run_id"]},
                {"$set": {f"segments.{seg['index']}.translations.{lang}":
                          {"text": text, "style": style["id"], "qe": None}}},
            )
            done += 1
            if done % 3 == 0:
                common.progress(payload, int(done / total * 100), f"translating {lang}")
            if _live():
                time.sleep(THROTTLE_SECONDS)  # stay under free-tier rate limits

    db.transcripts.update_one(
        {"_id": payload["run_id"]},
        {"$set": {"styles": {lang: s["id"] for lang, s in resolved.items()}}},
    )
    key = common.artifact_key(payload, "translation-report.json")
    common.upload_text(
        json.dumps({"source": src_lang, "targets": targets,
                    "styles": {lang: s["id"] for lang, s in resolved.items()},
                    "segments": len(segments),
                    "engine": "llm" if _live() else "mock"}),
        key, "application/json")
    return key, {"targets": targets,
                 "styles": {lang: s["id"] for lang, s in resolved.items()},
                 "engine": "llm" if _live() else "mock"}


@celery_app.task(name="stages.style_selection")
@common.stage_task("style_selection")
def style_selection(payload: dict):
    """Style is now applied during translation (one LLM pass instead of two —
    half the API volume, and the model styles with full context). This stage
    verifies and records the resolved style map."""
    db = common.mongo()
    doc = db.transcripts.find_one({"_id": payload["run_id"]})
    if doc is None:
        raise RuntimeError("Transcript missing")
    styles = doc.get("styles") or {}
    targets = payload["params"].get("target_languages", [])
    missing = [lang for lang in targets
               if not any((s.get("translations") or {}).get(lang)
                          for s in doc.get("segments", []))]
    if missing:
        raise RuntimeError(f"No translations found for: {', '.join(missing)}")
    return None, {"styles": styles, "engine": "merged-into-translation"}
