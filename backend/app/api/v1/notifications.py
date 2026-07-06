from fastapi import APIRouter, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Notification, User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(user: User = Depends(get_current_user),
                             db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(select(Notification).where(Notification.user_id == user.id)
                         .order_by(Notification.created_at.desc()).limit(50))
    ).scalars().all()
    return [
        {"id": n.id, "type": n.type, "title": n.title, "body": n.body,
         "data": n.data, "read": n.read, "created_at": n.created_at.isoformat()}
        for n in rows
    ]


@router.post("/read-all", status_code=204)
async def mark_all_read(user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    await db.execute(update(Notification).where(Notification.user_id == user.id)
                     .values(read=True))
    await db.commit()
