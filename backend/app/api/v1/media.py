from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_project_role
from app.models import MediaAsset
from app.schemas.media import AssetOut, UploadRequest, UploadTicket
from app.services import storage

router = APIRouter(tags=["media"])


@router.post("/projects/{project_id}/assets", response_model=UploadTicket, status_code=201)
async def request_upload(body: UploadRequest,
                         access=Depends(require_project_role("editor")),
                         db: AsyncSession = Depends(get_db)):
    project, _ = access
    if body.kind not in ("video", "audio", "document"):
        raise HTTPException(422, "kind must be video, audio or document")
    asset = MediaAsset(org_id=project.org_id, project_id=project.id, kind=body.kind,
                       filename=body.filename, content_type=body.content_type,
                       size_bytes=body.size_bytes, storage_key="")
    db.add(asset)
    await db.flush()
    asset.storage_key = storage.media_key(project.org_id, project.id, asset.id, body.filename)
    await db.commit()
    return UploadTicket(
        asset_id=asset.id,
        upload_url=storage.presign_put(asset.storage_key, body.content_type),
        storage_key=asset.storage_key,
    )


@router.post("/projects/{project_id}/assets/{asset_id}/confirm", response_model=AssetOut)
async def confirm_upload(asset_id: str, access=Depends(require_project_role("editor")),
                         db: AsyncSession = Depends(get_db)):
    project, _ = access
    asset = await db.get(MediaAsset, asset_id)
    if asset is None or asset.project_id != project.id:
        raise HTTPException(404, "Asset not found")
    try:
        head = storage.client().head_object(Bucket=storage.settings.S3_BUCKET, Key=asset.storage_key)
        asset.size_bytes = head["ContentLength"]
        asset.status = "ready"
    except Exception:
        raise HTTPException(409, "Upload not found in storage — did the PUT succeed?")
    await db.commit()
    return asset


@router.get("/projects/{project_id}/assets", response_model=list[AssetOut])
async def list_assets(access=Depends(require_project_role("viewer")),
                      db: AsyncSession = Depends(get_db)):
    project, _ = access
    rows = (
        await db.execute(select(MediaAsset).where(MediaAsset.project_id == project.id)
                         .order_by(MediaAsset.created_at.desc()))
    ).scalars().all()
    return rows


@router.get("/projects/{project_id}/assets/{asset_id}/download-url")
async def download_url(asset_id: str, access=Depends(require_project_role("viewer")),
                       db: AsyncSession = Depends(get_db)):
    project, _ = access
    asset = await db.get(MediaAsset, asset_id)
    if asset is None or asset.project_id != project.id:
        raise HTTPException(404, "Asset not found")
    return {"url": storage.presign_get(asset.storage_key, filename=asset.filename)}


@router.delete("/projects/{project_id}/assets/{asset_id}", status_code=204)
async def delete_asset(asset_id: str, access=Depends(require_project_role("editor")),
                       db: AsyncSession = Depends(get_db)):
    project, _ = access
    asset = await db.get(MediaAsset, asset_id)
    if asset is None or asset.project_id != project.id:
        raise HTTPException(404, "Asset not found")
    storage.delete_prefix(f"media/{project.org_id}/{project.id}/{asset.id}/")
    await db.delete(asset)
    await db.commit()
