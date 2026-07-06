from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.celery_client import send_stage_task
from app.core.config import settings
from app.core.events import publish_run_event
from app.models import MediaAsset, Organization, PipelineRun, StageRun, UsageRecord
from app.services import languages

TEMPLATES: dict[str, list[str]] = {
    "video_dubbing": [
        "probe", "speaker_detection", "diarization", "asr", "language_detection",
        "emotion", "translation", "style_selection", "voice_generation",
        "subtitle_generation", "audio_mixing", "video_render",
    ],
    "audio_dubbing": [
        "probe", "diarization", "asr", "language_detection", "emotion",
        "translation", "style_selection", "voice_generation", "audio_mixing",
    ],
    "subtitles": ["probe", "asr", "language_detection", "translation", "subtitle_generation"],
    "document": ["document_extract", "translation", "document_render"],
}

STAGE_QUEUES: dict[str, str] = {
    "probe": "q.media", "document_extract": "q.media", "document_render": "q.media",
    "subtitle_generation": "q.media", "audio_mixing": "q.media", "video_render": "q.media",
    "speaker_detection": "q.asr", "diarization": "q.asr", "asr": "q.asr",
    "language_detection": "q.asr", "emotion": "q.asr",
    "translation": "q.mt", "style_selection": "q.mt",
    "voice_generation": "q.tts",
}

# Credits per media-minute by template (simple flat model for the skeleton)
CREDIT_RATES = {"subtitles": 2, "audio_dubbing": 6, "video_dubbing": 10, "document": 1}

MAX_ATTEMPTS = 3


def estimate_credits(template: str, duration_seconds: float | None, n_targets: int) -> int:
    minutes = max(1, round((duration_seconds or 60) / 60))
    return CREDIT_RATES.get(template, 5) * minutes * max(1, n_targets)


async def create_run(
    db: AsyncSession, org: Organization, project_id: str, asset: MediaAsset,
    template: str, target_languages: list[str], styles: dict[str, str], params: dict,
) -> PipelineRun:
    if template not in TEMPLATES:
        raise HTTPException(422, f"Unknown template '{template}'")
    if asset.status != "ready":
        raise HTTPException(409, "Asset is not ready yet")
    for lang in target_languages:
        if not languages.is_supported(lang):
            raise HTTPException(422, f"Unsupported target language '{lang}'")

    cost = estimate_credits(template, asset.duration_seconds, len(target_languages))
    if org.credits < cost:
        raise HTTPException(402, f"Insufficient credits: need {cost}, have {org.credits}")

    resolved_styles = {
        lang: (styles.get(lang) or "auto") for lang in target_languages
    }
    run = PipelineRun(
        org_id=org.id, project_id=project_id, asset_id=asset.id, template=template,
        params={**params, "target_languages": target_languages, "styles": resolved_styles,
                "source_key": asset.storage_key, "estimated_credits": cost},
        status="queued",
    )
    db.add(run)
    await db.flush()

    for i, name in enumerate(TEMPLATES[template]):
        db.add(StageRun(run_id=run.id, name=name, position=i, queue=STAGE_QUEUES[name]))

    org.credits -= cost
    run.credits_used = cost
    db.add(UsageRecord(org_id=org.id, run_id=run.id, credits=-cost, kind="run",
                       description=f"{template} × {len(target_languages)} languages"))
    await db.commit()
    await db.refresh(run, ["stages"])
    await _dispatch_next(db, run)
    return run


async def _dispatch_next(db: AsyncSession, run: PipelineRun) -> None:
    stages = (
        await db.execute(
            select(StageRun).where(StageRun.run_id == run.id).order_by(StageRun.position)
        )
    ).scalars().all()
    nxt = next((s for s in stages if s.status in ("pending",)), None)
    if nxt is None:
        run.status = "succeeded"
        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        await publish_run_event(run.id, "run.completed", {"status": "succeeded"})
        return

    nxt.status = "queued"
    nxt.attempt += 1
    if run.status == "queued":
        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
    await db.commit()

    send_stage_task(
        stage_name=nxt.name, queue=nxt.queue,
        payload={
            "stage_run_id": nxt.id, "run_id": run.id, "org_id": run.org_id,
            "asset_id": run.asset_id, "template": run.template, "params": run.params,
            "source_key": run.params.get("source_key"),
            "callback_url": f"{settings.BACKEND_URL}/api/v1/internal/stages/{nxt.id}/complete",
            "internal_token": settings.INTERNAL_TOKEN,
        },
    )
    await publish_run_event(run.id, "stage.started", {"stage": nxt.name, "position": nxt.position})


async def complete_stage(
    db: AsyncSession, stage: StageRun, status: str,
    artifact_key: str | None, meta: dict, error: str | None,
) -> None:
    run = await db.get(PipelineRun, stage.run_id)
    now = datetime.now(timezone.utc)
    stage.finished_at = now
    stage.meta = {**(stage.meta or {}), **(meta or {})}
    stage.artifact_key = artifact_key or stage.artifact_key

    if status == "succeeded":
        stage.status = "succeeded"
        await db.commit()
        await publish_run_event(run.id, "stage.completed", {"stage": stage.name, "meta": stage.meta})
        await _dispatch_next(db, run)
        return

    if stage.attempt < MAX_ATTEMPTS:
        stage.status = "pending"
        stage.error = error
        await db.commit()
        await publish_run_event(run.id, "stage.retrying", {"stage": stage.name, "attempt": stage.attempt})
        await _dispatch_next(db, run)
        return

    stage.status = "failed"
    stage.error = error
    run.status = "failed"
    run.error = f"Stage '{stage.name}' failed: {error}"
    run.finished_at = now
    await db.commit()
    await publish_run_event(run.id, "run.failed", {"stage": stage.name, "error": error})


async def cancel_run(db: AsyncSession, run: PipelineRun) -> None:
    if run.status in ("succeeded", "failed", "canceled"):
        raise HTTPException(409, "Run already finished")
    run.status = "canceled"
    run.finished_at = datetime.now(timezone.utc)
    stages = (
        await db.execute(select(StageRun).where(StageRun.run_id == run.id))
    ).scalars().all()
    for s in stages:
        if s.status in ("pending", "queued", "running"):
            s.status = "skipped"
    await db.commit()
    await publish_run_event(run.id, "run.canceled", {})
