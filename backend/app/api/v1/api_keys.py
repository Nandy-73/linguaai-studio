from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_org_role
from app.core.security import generate_api_key
from app.models import ApiKey, Membership
from app.schemas.voice import ApiKeyCreate, ApiKeyCreated, ApiKeyOut

router = APIRouter(tags=["api-keys"])


@router.get("/orgs/{org_id}/api-keys", response_model=list[ApiKeyOut])
async def list_keys(org_id: str, _: Membership = Depends(require_org_role("admin")),
                    db: AsyncSession = Depends(get_db)):
    return (
        await db.execute(select(ApiKey).where(ApiKey.org_id == org_id)
                         .order_by(ApiKey.created_at.desc()))
    ).scalars().all()


@router.post("/orgs/{org_id}/api-keys", response_model=ApiKeyCreated, status_code=201)
async def create_key(org_id: str, body: ApiKeyCreate,
                     _: Membership = Depends(require_org_role("owner")),
                     db: AsyncSession = Depends(get_db)):
    plaintext, prefix, hashed = generate_api_key()
    key = ApiKey(org_id=org_id, name=body.name, prefix=prefix,
                 hashed_secret=hashed, scopes=body.scopes)
    db.add(key)
    await db.commit()
    out = ApiKeyCreated.model_validate({**key.__dict__, "plaintext": plaintext})
    return out


@router.delete("/orgs/{org_id}/api-keys/{key_id}", status_code=204)
async def revoke_key(org_id: str, key_id: str,
                     _: Membership = Depends(require_org_role("owner")),
                     db: AsyncSession = Depends(get_db)):
    key = await db.get(ApiKey, key_id)
    if key is None or key.org_id != org_id:
        raise HTTPException(404, "API key not found")
    key.revoked = True
    await db.commit()
