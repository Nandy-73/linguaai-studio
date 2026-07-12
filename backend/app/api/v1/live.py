"""Live translation — low-latency text translation for the Live Captions page.

The browser does streaming speech-to-text locally (Web Speech API); each
finalized utterance is POSTed here and translated with the configured LLM
(style-aware, using the same language/style registry as the batch pipeline).
Falls back to tagged mock output when no LLM endpoint is configured.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.deps import get_current_user
from app.models import User
from app.services import languages, llm

router = APIRouter(prefix="/live", tags=["live"])


class LiveTranslateIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    target_lang: str = "ta"
    style: str = "auto"


@router.post("/translate")
async def live_translate(body: LiveTranslateIn, _: User = Depends(get_current_user)):
    if not languages.is_supported(body.target_lang):
        raise HTTPException(422, f"Unsupported language '{body.target_lang}'")

    styles = {s["id"]: s for s in languages.styles_for(body.target_lang)}
    style_id = body.style if body.style in styles else languages.default_style(body.target_lang)
    style = styles.get(style_id, {"id": style_id, "name": "Standard", "axes": {}})

    translated = await llm.live_translate(body.text, body.target_lang, style)
    return {"translated": translated, "style": style_id, "mock": not llm.is_live()}
