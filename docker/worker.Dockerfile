FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models TORCH_HOME=/models

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ai-services/requirements.txt .
RUN pip install -r requirements.txt
# Heavy ML dependencies (WhisperX, pyannote, TTS engines) are installed on GPU
# images only:  pip install -r requirements-ml.txt
COPY ai-services/requirements-ml.txt .

COPY ai-services/ .

CMD ["sh", "-c", "python -m worker.healthcheck & celery -A worker.celery_app worker --loglevel=info -Q q.media,q.asr,q.mt,q.tts --concurrency=2"]
