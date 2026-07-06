from sqlalchemy import Integer, case, func, select
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_org_role
from app.models import MediaAsset, Membership, PipelineRun

router = APIRouter(tags=["analytics"])


@router.get("/orgs/{org_id}/analytics/overview")
async def overview(org_id: str, _: Membership = Depends(require_org_role("viewer")),
                   db: AsyncSession = Depends(get_db)):
    runs = (
        await db.execute(
            select(
                func.count(PipelineRun.id),
                func.coalesce(func.sum(case((PipelineRun.status == "succeeded", 1), else_=0)), 0),
                func.coalesce(func.sum(case((PipelineRun.status == "failed", 1), else_=0)), 0),
                func.coalesce(func.sum(PipelineRun.credits_used), 0),
            ).where(PipelineRun.org_id == org_id)
        )
    ).one()
    minutes = (
        await db.execute(
            select(func.coalesce(func.sum(MediaAsset.duration_seconds), 0.0))
            .where(MediaAsset.org_id == org_id)
        )
    ).scalar_one()
    by_template = (
        await db.execute(
            select(PipelineRun.template, func.count(PipelineRun.id).cast(Integer))
            .where(PipelineRun.org_id == org_id).group_by(PipelineRun.template)
        )
    ).all()
    by_day = (
        await db.execute(
            select(func.date_trunc("day", PipelineRun.created_at).label("day"),
                   func.count(PipelineRun.id))
            .where(PipelineRun.org_id == org_id)
            .group_by("day").order_by("day").limit(30)
        )
    ).all()
    return {
        "totalRuns": runs[0], "succeeded": runs[1], "failed": runs[2],
        "creditsUsed": runs[3], "mediaMinutes": round((minutes or 0) / 60, 1),
        "byTemplate": [{"template": t, "count": c} for t, c in by_template],
        "byDay": [{"day": d.isoformat(), "count": c} for d, c in by_day],
    }
