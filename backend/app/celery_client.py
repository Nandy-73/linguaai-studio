from celery import Celery

from app.core.config import settings

# Dispatch-only Celery client: tasks are referenced by name; implementations
# live in ai-services/ workers. No shared code import required.
celery_app = Celery("linguaai-control", broker=settings.REDIS_URL)
celery_app.conf.task_default_queue = "q.media"


def send_stage_task(stage_name: str, queue: str, payload: dict) -> None:
    celery_app.send_task(f"stages.{stage_name}", kwargs={"payload": payload}, queue=queue)
