from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_org_or_404, require_org_role
from app.models import Membership, UsageRecord

router = APIRouter(tags=["billing"])

PLANS = [
    {"id": "free", "name": "Free", "price": 0, "credits": 300,
     "features": ["30 min/mo transcription", "Subtitles", "1 seat", "Watermarked exports"]},
    {"id": "creator", "name": "Creator", "price": 24, "credits": 3000,
     "features": ["AI dubbing (open engines)", "2 voice clones", "3 seats", "No watermark"]},
    {"id": "studio", "name": "Studio", "price": 89, "credits": 15000,
     "features": ["Premium voice engines", "10 voice clones", "API access", "Priority queue"]},
    {"id": "business", "name": "Business", "price": 399, "credits": 80000,
     "features": ["Per-project access control", "Analytics+", "SLA", "Dedicated support"]},
]


@router.get("/billing/plans")
async def plans():
    return {"plans": PLANS}


@router.get("/orgs/{org_id}/billing")
async def billing_overview(org_id: str, _: Membership = Depends(require_org_role("viewer")),
                           db: AsyncSession = Depends(get_db)):
    org = await get_org_or_404(org_id, db)
    usage = (
        await db.execute(select(UsageRecord).where(UsageRecord.org_id == org_id)
                         .order_by(UsageRecord.created_at.desc()).limit(50))
    ).scalars().all()
    return {
        "plan": org.plan,
        "credits": org.credits,
        "usage": [
            {"id": u.id, "credits": u.credits, "kind": u.kind,
             "description": u.description, "created_at": u.created_at.isoformat()}
            for u in usage
        ],
    }


@router.post("/orgs/{org_id}/billing/checkout")
async def checkout(org_id: str, plan_id: str,
                   _: Membership = Depends(require_org_role("owner"))):
    # Stripe integration lands post-thesis; endpoint reserves the contract.
    return {"status": "not_implemented",
            "message": f"Stripe checkout for plan '{plan_id}' is not enabled in this build."}
