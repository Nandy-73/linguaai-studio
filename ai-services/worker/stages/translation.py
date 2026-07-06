"""LACTE — Language-Aware Contextual Translation Engine.

Stage `translation`: context-aware base translation per target language.
Stage `style_selection`: resolves the native style per language (auto → registry
default) and adapts translations to that style (register, honorifics, dialect,
code-mixing). Live mode uses an OpenAI-compatible LLM endpoint (vLLM/Qwen);
mock mode produces tagged deterministic output so the pipeline stays runnable.
"""
import json

import httpx

from worker import common, config
from worker.celery_app import celery_app


def _llm(system: str, user: str, max_tokens: int = 800) -> str:
    resp = httpx.post(
        f"{config.LLM_BASE_URL.rstrip('/')}/chat/completions",
        headers={"Authorization": f"Bearer {config.LLM_API_KEY or 'none'}"},
        json={"model": config.LLM_MODEL, "temperature": 0.3, "max_tokens": max_tokens,
              "messages": [{"role": "system", "content": system},
                           {"role": "user", "content": user}]},
        timeout=180,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _live() -> bool:
    return bool(config.LLM_BASE_URL) and config.AI_MOCK_MODE != "always"


def _context_window(segments: list[dict], index: int, radius: int = 2) -> str:
    lo, hi = max(0, index - radius), min(len(segments), index + radius + 1)
    return " / ".join(s["text"] for s in segments[lo:hi])


def _translate_segment(seg: dict, segments: list[dict], src_lang: str,
                       tgt_lang: str, emotion: str) -> str:
    if _live():
        system = (
            "You are LACTE, a context-aware translation engine. Translate the SEGMENT "
            f"from {src_lang} to {tgt_lang}. Use the CONTEXT for disambiguation but "
            "translate only the SEGMENT. Preserve meaning, tone and the speaker's "
            f"emotion ({emotion}). Translate idioms by meaning, never word-for-word. "
            "Return only the translation."
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

    total = max(1, len(segments) * len(targets))
    done = 0
    for lang in targets:
        for seg in segments:
            text = _translate_segment(seg, segments, src_lang, lang,
                                      seg.get("emotion", "neutral"))
            db.transcripts.update_one(
                {"_id": payload["run_id"]},
                {"$set": {f"segments.{seg['index']}.translations.{lang}":
                          {"text": text, "style": None, "qe": None}}},
            )
            done += 1
            if done % 10 == 0:
                common.progress(payload, int(done / total * 100), f"translating {lang}")

    key = common.artifact_key(payload, "translation-report.json")
    common.upload_text(
        json.dumps({"source": src_lang, "targets": targets,
                    "segments": len(segments), "engine": "llm" if _live() else "mock"}),
        key, "application/json")
    return key, {"targets": targets, "engine": "llm" if _live() else "mock"}


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
                     "speakers write), level "
                     f"{axes['codemix']}/3.")
    if axes.get("simplification"):
        parts.append(f"Simplification: {axes['simplification']} — short sentences, "
                     "common words only.")
    if axes.get("modality") == "spoken":
        parts.append("Spoken feel: contractions and natural rhythm, as if said aloud.")
    return " ".join(parts)


@celery_app.task(name="stages.style_selection")
@common.stage_task("style_selection")
def style_selection(payload: dict):
    db = common.mongo()
    doc = db.transcripts.find_one({"_id": payload["run_id"]})
    if doc is None:
        raise RuntimeError("Transcript missing")
    segments = doc.get("segments", [])
    targets = payload["params"].get("target_languages", [])
    requested = payload["params"].get("styles", {})

    resolved = {}
    for lang in targets:
        style = _resolve_style(lang, requested.get(lang, "auto"))
        resolved[lang] = style["id"]
        directive = _style_directive(style, lang)
        for seg in segments:
            tr = (seg.get("translations") or {}).get(lang)
            if not tr:
                continue
            if _live():
                adapted = _llm(
                    "You are a native-style adaptation engine. Rewrite the TRANSLATION "
                    f"so it reads like a native speaker in the requested style. {directive} "
                    "Keep the meaning identical. Return only the rewritten text.",
                    f"TRANSLATION: {tr['text']}",
                )
            else:
                adapted = tr["text"].replace(f"[{lang}]", f"[{lang}·{style['id']}]")
            db.transcripts.update_one(
                {"_id": payload["run_id"]},
                {"$set": {f"segments.{seg['index']}.translations.{lang}.text": adapted,
                          f"segments.{seg['index']}.translations.{lang}.style": style["id"]}},
            )
        common.progress(payload, int((targets.index(lang) + 1) / len(targets) * 100),
                        f"styled {lang} → {style['id']}")

    db.transcripts.update_one({"_id": payload["run_id"]},
                              {"$set": {"styles": resolved}})
    return None, {"styles": resolved, "engine": "llm" if _live() else "mock"}
