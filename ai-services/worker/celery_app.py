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
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_default_queue="q.media",
    broker_connection_retry_on_startup=True,
    # Redis transport's default visibility_timeout is 1 hour: a task fetched
    # by a worker that then dies (e.g. Render free-tier sleep/restart) stays
    # invisible — unclaimable by any worker — for up to that long. Render's
    # free tier makes worker restarts routine, not exceptional, so keep this
    # short: a stuck task becomes available for retry within 5 minutes.
    broker_transport_options={"visibility_timeout": 300},
)
