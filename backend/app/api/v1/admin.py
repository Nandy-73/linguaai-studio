from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_superuser
from app.core.redis import get_redis
from app.models import Organization, PipelineRun, UsageRecord, User

router = APIRouter(prefix="/admin", tags=["admin"])

QUEUES = ["q.media", "q.asr", "q.mt", "q.tts"]


@router.get("/overview")
async def overview(_: User = Depends(require_superuser), db: AsyncSession = Depends(get_db)):
    users = (await db.execute(select(func.count(User.id)))).scalar_one()
    orgs = (await db.execute(select(func.count(Organization.id)))).scalar_one()
    runs = (await db.execute(select(func.count(PipelineRun.id)))).scalar_one()
    running = (
        await db.execute(select(func.count(PipelineRun.id))
                         .where(PipelineRun.status.in_(("queued", "running"))))
    ).scalar_one()
    redis = get_redis()
    queue_depths = {q: await redis.llen(q) for q in QUEUES}
    return {"users": users, "orgs": orgs, "totalRuns": runs,
            "activeRuns": running, "queueDepths": queue_depths}


@router.get("/users")
async def list_users(_: User = Depends(require_superuser), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(select(User).order_by(User.created_at.desc()).limit(200))
    ).scalars().all()
    return [
        {"id": u.id, "email": u.email, "name": u.name, "is_active": u.is_active,
         "is_superuser": u.is_superuser, "created_at": u.created_at.isoformat()}
        for u in rows
    ]


@router.get("/orgs")
async def list_orgs(_: User = Depends(require_superuser), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(select(Organization).order_by(Organization.created_at.desc()).limit(200))
    ).scalars().all()
    return [
        {"id": o.id, "name": o.name, "slug": o.slug, "plan": o.plan,
         "credits": o.credits, "created_at": o.created_at.isoformat()}
        for o in rows
    ]


@router.post("/orgs/{org_id}/grant-credits")
async def grant_credits(org_id: str, amount: int,
                        _: User = Depends(require_superuser),
                        db: AsyncSession = Depends(get_db)):
    org = await db.get(Organization, org_id)
    if org:
        org.credits += amount
        db.add(UsageRecord(org_id=org_id, credits=amount, kind="grant",
                           description="Admin credit grant"))
        await db.commit()
        return {"id": org.id, "credits": org.credits}
    return {"error": "org not found"}


@router.post("/users/{user_id}/toggle-active")
async def toggle_active(user_id: str, _: User = Depends(require_superuser),
                        db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if user:
        user.is_active = not user.is_active
        await db.commit()
        return {"id": user.id, "is_active": user.is_active}
    return {"error": "user not found"}
