from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.mongo import get_mongo
from app.models import User
from app.schemas.run import ChatIn
from app.services import llm

router = APIRouter(tags=["ai"])


async def _transcript_text(run_id: str) -> str:
    doc = await get_mongo().transcripts.find_one({"_id": run_id})
    if doc is None:
        raise HTTPException(404, "No transcript for this run yet")
    lines = []
    for seg in doc.get("segments", []):
        m, s = divmod(int(seg["start"]), 60)
        lines.append(f"[{m:02d}:{s:02d}] {seg.get('speaker', '')}: {seg.get('text', '')}")
    return "\n".join(lines)


@router.post("/runs/{run_id}/chat")
async def chat(run_id: str, body: ChatIn, user: User = Depends(get_current_user),
               db: AsyncSession = Depends(get_db)):
    from app.api.v1.runs import _get_run_for_user
    await _get_run_for_user(run_id, user, db)
    text = await _transcript_text(run_id)
    answer = await llm.chat_over_transcript(text, body.message, body.lang)
    await get_mongo().chat_messages.insert_one(
        {"run_id": run_id, "user_id": user.id, "question": body.message, "answer": answer}
    )
    return {"answer": answer, "mock": not llm.is_live()}


@router.post("/runs/{run_id}/summary")
async def summary(run_id: str, lang: str = "en", kind: str = "summary",
                  user: User = Depends(get_current_user),
                  db: AsyncSession = Depends(get_db)):
    from app.api.v1.runs import _get_run_for_user
    await _get_run_for_user(run_id, user, db)
    if kind not in ("summary", "explanation", "chapters"):
        raise HTTPException(422, "kind must be summary, explanation or chapters")
    text = await _transcript_text(run_id)
    result = await llm.summarize_transcript(text, lang, kind)
    return {"result": result, "kind": kind, "mock": not llm.is_live()}
