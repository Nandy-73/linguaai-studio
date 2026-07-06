import json
from typing import Any

from app.core.redis import get_redis


def run_channel(run_id: str) -> str:
    return f"run.{run_id}"


async def publish_run_event(run_id: str, event_type: str, data: dict[str, Any]) -> None:
    payload = json.dumps({"type": event_type, "runId": run_id, "data": data})
    await get_redis().publish(run_channel(run_id), payload)
