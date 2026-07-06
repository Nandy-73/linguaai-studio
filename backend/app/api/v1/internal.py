"""Endpoints called by AI workers only — protected by the shared internal token."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models import MediaAsset, StageRun
from app.services import pipelines

router = APIRouter(prefix="/internal", tags=["internal"])


def verify_internal(x_internal_token: str = Header(...)) -> None:
    if x_internal_token != settings.INTERNAL_TOKEN:
        raise HTTPException(401, "Invalid internal token")


class StageComplete(BaseModel):
    status: str  # succeeded | failed
    artifact_key: str | None = None
    meta: dict = {}
    error: str | None = None


@router.post("/stages/{stage_run_id}/complete", dependencies=[Depends(verify_internal)])
async def stage_complete(stage_run_id: str, body: StageComplete,
                         db: AsyncSession = Depends(get_db)):
    stage = await db.get(StageRun, stage_run_id)
    if stage is None:
        raise HTTPException(404, "Stage not found")
    if stage.status in ("succeeded", "failed", "skipped"):
        return {"ok": True, "note": "stage already terminal — duplicate callback ignored"}
    await pipelines.complete_stage(db, stage, body.status, body.artifact_key,
                                   body.meta, body.error)
    return {"ok": True}


@router.post("/stages/{stage_run_id}/started", dependencies=[Depends(verify_internal)])
async def stage_started(stage_run_id: str, db: AsyncSession = Depends(get_db)):
    stage = await db.get(StageRun, stage_run_id)
    if stage and stage.status == "queued":
        stage.status = "running"
        stage.started_at = datetime.now(timezone.utc)
        await db.commit()
    return {"ok": True}


class ProbeResult(BaseModel):
    duration_seconds: float | None = None
    probe: dict = {}


@router.post("/assets/{asset_id}/probe", dependencies=[Depends(verify_internal)])
async def update_probe(asset_id: str, body: ProbeResult, db: AsyncSession = Depends(get_db)):
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")
    asset.duration_seconds = body.duration_seconds
    asset.probe = body.probe
    await db.commit()
    return {"ok": True}
