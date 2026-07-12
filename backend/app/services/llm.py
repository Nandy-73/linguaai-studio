"""LLM provider — OpenAI-compatible endpoint (vLLM/Qwen) with graceful mock mode."""
import httpx

from app.core.config import settings


def is_live() -> bool:
    return bool(settings.LLM_BASE_URL)


async def complete(system: str, user: str, max_tokens: int = 1024) -> str:
    if not is_live():
        return _mock_response(user)
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{settings.LLM_BASE_URL.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.LLM_API_KEY or 'none'}"},
            json={
                "model": settings.LLM_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.3,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def _mock_response(user: str) -> str:
    return (
        "[mock LLM — configure LLM_BASE_URL to enable real responses]\n\n"
        f"Received a request of {len(user)} characters. In production this is answered by "
        f"{settings.LLM_MODEL} served via an OpenAI-compatible endpoint."
    )


async def chat_over_transcript(transcript_text: str, question: str, lang: str) -> str:
    system = (
        "You are the LinguaAI Studio assistant. Answer questions strictly from the provided "
        "transcript. Cite timestamps like [12:34] when referencing content. If the answer is "
        f"not in the transcript, say so. Respond in language: {lang}."
    )
    user = f"TRANSCRIPT:\n{transcript_text[:24000]}\n\nQUESTION: {question}"
    return await complete(system, user)


async def summarize_transcript(transcript_text: str, lang: str, kind: str = "summary") -> str:
    prompts = {
        "summary": "Produce a concise summary (max 200 words), then 5 key points.",
        "explanation": "Explain the content simply, as if to a curious newcomer. Define jargon.",
        "chapters": "Produce chapter markers: one line each, format 'MM:SS — Title'.",
    }
    system = f"You are a precise content analyst. {prompts.get(kind, prompts['summary'])} Respond in language: {lang}."
    return await complete(system, f"TRANSCRIPT:\n{transcript_text[:24000]}")


def _style_directive(style: dict, lang: str) -> str:
    axes = style.get("axes", {})
    parts = [f"Style: {style.get('name', 'Standard')}."]
    if axes.get("register"):
        parts.append(f"Register: {axes['register']}.")
    if axes.get("honorific"):
        parts.append(f"Honorific level: {axes['honorific']} — apply correct morphology consistently.")
    if axes.get("region"):
        parts.append(f"Regional variety: {axes['region']}.")
    if axes.get("script"):
        parts.append(f"Script: {axes['script']}.")
    if axes.get("codemix"):
        parts.append("Natural code-mixing with English is expected, "
                     f"level {axes['codemix']}/3 (as native urban speakers talk).")
    if axes.get("simplification"):
        parts.append(f"Simplification: {axes['simplification']} — short sentences, common words only.")
    if axes.get("modality") == "spoken":
        parts.append("Spoken feel — natural rhythm, as if said aloud.")
    return " ".join(parts)


async def live_translate(text: str, target_lang: str, style: dict) -> str:
    """Single-utterance, low-latency translation for the Live Captions page."""
    if not is_live():
        return f"[{target_lang}·{style.get('id', 'standard')}] {text}"
    system = (
        f"You are a live interpreter. Translate the user's utterance into {target_lang}. "
        f"{_style_directive(style, target_lang)} "
        "Translate idioms by meaning. Return ONLY the translation — no quotes, no notes."
    )
    return await complete(system, text, max_tokens=300)
