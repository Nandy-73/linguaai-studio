from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_org_role, require_project_role
from app.core.mongo import get_mongo
from app.models import MediaAsset, Membership, Organization, PipelineRun, User
from app.schemas.run import RunCreate, RunOut, SegmentPatch
from app.services import pipelines, storage, subtitles

router = APIRouter(tags=["runs"])


async def _get_run_for_user(run_id: str, user: User, db: AsyncSession) -> PipelineRun:
    run = (
        await db.execute(
            select(PipelineRun).where(PipelineRun.id == run_id)
            .options(selectinload(PipelineRun.stages))
        )
    ).scalar_one_or_none()
    if run is None:
        raise HTTPException(404, "Run not found")
    member = (
        await db.execute(select(Membership).where(
            Membership.org_id == run.org_id, Membership.user_id == user.id))
    ).scalar_one_or_none()
    if member is None:
        raise HTTPException(404, "Run not found")
    return run


@router.post("/projects/{project_id}/runs", response_model=RunOut, status_code=202)
async def create_run(body: RunCreate, access=Depends(require_project_role("editor")),
                     db: AsyncSession = Depends(get_db)):
    project, _ = access
    asset = await db.get(MediaAsset, body.asset_id)
    if asset is None or asset.project_id != project.id:
        raise HTTPException(404, "Asset not found")
    org = await db.get(Organization, project.org_id)
    run = await pipelines.create_run(
        db, org, project.id, asset, body.template, body.target_languages, body.styles,
        {**body.params, "voice_mode": body.voice_mode, "character_voices": body.character_voices},
    )
    full = (
        await db.execute(
            select(PipelineRun).where(PipelineRun.id == run.id)
            .options(selectinload(PipelineRun.stages))
        )
    ).scalar_one()
    return full


@router.get("/projects/{project_id}/runs", response_model=list[RunOut])
async def list_project_runs(access=Depends(require_project_role("viewer")),
                            db: AsyncSession = Depends(get_db)):
    project, _ = access
    rows = (
        await db.execute(
            select(PipelineRun).where(PipelineRun.project_id == project.id)
            .options(selectinload(PipelineRun.stages))
            .order_by(PipelineRun.created_at.desc()).limit(100)
        )
    ).scalars().all()
    return rows


@router.get("/orgs/{org_id}/runs", response_model=list[RunOut])
async def list_org_runs(org_id: str, status: str | None = None,
                        _: Membership = Depends(require_org_role("viewer")),
                        db: AsyncSession = Depends(get_db)):
    q = (select(PipelineRun).where(PipelineRun.org_id == org_id)
         .options(selectinload(PipelineRun.stages))
         .order_by(PipelineRun.created_at.desc()).limit(200))
    if status:
        q = q.where(PipelineRun.status == status)
    return (await db.execute(q)).scalars().all()


@router.get("/runs/{run_id}", response_model=RunOut)
async def get_run(run_id: str, user: User = Depends(get_current_user),
                  db: AsyncSession = Depends(get_db)):
    return await _get_run_for_user(run_id, user, db)


@router.post("/runs/{run_id}/cancel", response_model=RunOut)
async def cancel_run(run_id: str, user: User = Depends(get_current_user),
                     db: AsyncSession = Depends(get_db)):
    run = await _get_run_for_user(run_id, user, db)
    await pipelines.cancel_run(db, run)
    return await _get_run_for_user(run_id, user, db)


@router.get("/runs/{run_id}/transcript")
async def get_transcript(run_id: str, user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    await _get_run_for_user(run_id, user, db)
    doc = await get_mongo().transcripts.find_one({"_id": run_id})
    if doc is None:
        raise HTTPException(404, "Transcript not available yet")
    doc["run_id"] = doc.pop("_id")
    return doc


@router.patch("/runs/{run_id}/segments/{index}")
async def patch_segment(run_id: str, index: int, body: SegmentPatch,
                        user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    await _get_run_for_user(run_id, user, db)
    field = f"segments.{index}.translations.{body.lang}.text"
    result = await get_mongo().transcripts.update_one(
        {"_id": run_id}, {"$set": {field: body.text, f"segments.{index}.edited": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Transcript not found")
    await get_mongo().edit_events.insert_one(
        {"run_id": run_id, "segment": index, "lang": body.lang,
         "text": body.text, "user_id": user.id}
    )
    return {"ok": True}


@router.get("/runs/{run_id}/subtitles.{fmt}")
async def export_subtitles(run_id: str, fmt: str, lang: str | None = None,
                           user: User = Depends(get_current_user),
                           db: AsyncSession = Depends(get_db)):
    await _get_run_for_user(run_id, user, db)
    if fmt not in ("srt", "vtt"):
        raise HTTPException(422, "Format must be srt or vtt")
    doc = await get_mongo().transcripts.find_one({"_id": run_id})
    if doc is None:
        raise HTTPException(404, "Transcript not available")
    segments = doc.get("segments", [])
    content = subtitles.to_srt(segments, lang) if fmt == "srt" else subtitles.to_vtt(segments, lang)
    media_type = "application/x-subrip" if fmt == "srt" else "text/vtt"
    suffix = f".{lang}" if lang else ""
    return Response(content, media_type=media_type, headers={
        "Content-Disposition": f'attachment; filename="subtitles{suffix}.{fmt}"'})


@router.get("/runs/{run_id}/artifacts")
async def list_artifacts(run_id: str, user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    run = await _get_run_for_user(run_id, user, db)
    out = []
    for stage in run.stages:
        if stage.artifact_key:
            out.append({
                "stage": stage.name,
                "key": stage.artifact_key,
                "url": storage.presign_get(stage.artifact_key,
                                           filename=stage.artifact_key.rsplit("/", 1)[-1]),
            })
    return out
