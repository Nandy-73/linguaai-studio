from celery import Celery

from worker import config

celery_app = Celery(
    "linguaai-workers",
    broker=config.REDIS_URL,
    include=[
        "worker.stages.media",
        "worker.stages.speech",
        "worker.stages.translation",
        "worker.stages.voice",
    ],
)
celery_app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_queue="q.media",
    broker_connection_retry_on_startup=True,
)
