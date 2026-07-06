import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.events import run_channel
from app.core.redis import get_redis
from app.core.security import decode_token
from app.models import Membership, PipelineRun

router = APIRouter()


@router.websocket("/ws/runs/{run_id}")
async def run_events(websocket: WebSocket, run_id: str, token: str = ""):
    # Authenticate: JWT passed as ?token= on the upgrade request
    try:
        payload = decode_token(token, "access")
    except ValueError:
        await websocket.close(code=4401)
        return

    async with SessionLocal() as db:
        run = await db.get(PipelineRun, run_id)
        if run is None:
            await websocket.close(code=4404)
            return
        member = (
            await db.execute(select(Membership).where(
                Membership.org_id == run.org_id, Membership.user_id == payload["sub"]))
        ).scalar_one_or_none()
        if member is None:
            await websocket.close(code=4403)
            return

    await websocket.accept()
    pubsub = get_redis().pubsub()
    await pubsub.subscribe(run_channel(run_id))
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=25)
            if message is not None:
                await websocket.send_text(message["data"])
            else:
                await websocket.send_text('{"type":"ping"}')
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    finally:
        await pubsub.unsubscribe(run_channel(run_id))
        await pubsub.aclose()
