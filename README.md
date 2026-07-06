# LinguaAI Studio

**AI Multimedia Localization Platform** — translate, dub and subtitle video, audio and
documents into 100+ languages with native styles (spoken Tamil vs Tanglish, keigo vs
casual, Sie vs du), multi-speaker voice preservation and a professional review studio.

> Architecture, product and research design live in [`docs/`](docs/):
> [ARCHITECTURE.md](docs/ARCHITECTURE.md) · [SAD.md](docs/SAD.md) ·
> [PRD.md](docs/PRD.md) · [AI-TRANSLATION-ENGINE.md](docs/AI-TRANSLATION-ENGINE.md)

## Quick start

```bash
cp .env.example .env        # defaults work for local docker
docker compose up --build
```

| Service | URL |
|---|---|
| App (via nginx) | http://localhost:8080 |
| API docs (OpenAPI) | http://localhost:8080/api/v1/docs *(FastAPI at `/docs` on the backend)* |
| MinIO console | http://localhost:9001 (`linguaai` / `linguaai-secret`) |

Register an account, create a project, upload a short video, pick target languages
and styles, and watch the pipeline run stage by stage.

**Mock mode:** the AI workers automatically fall back to deterministic mock
implementations for any stage whose models aren't installed (`AI_MOCK_MODE=auto`),
so the **entire pipeline runs end-to-end on a laptop with no GPU** — placeholder
transcripts, tagged translations, per-speaker tone dubs, real subtitle files and a
real rendered MP4. Install `ai-services/requirements-ml.txt` on GPU workers to go live
per stage. Point `LLM_BASE_URL` at any OpenAI-compatible endpoint (vLLM + Qwen) to
enable real LACTE translation, style adaptation, chat and summaries.

## Architecture (short version)

```
Next.js 15 (frontend) ── nginx ── FastAPI (backend, JWT + RBAC)
                                     │  PostgreSQL  · control-plane state
                                     │  MongoDB     · transcripts & segments
                                     │  Redis       · Celery broker + pub/sub (WebSockets)
                                     │  MinIO/S3    · media & artifacts (presigned URLs)
                                     └─ Celery ──► ai-services workers
                                          q.media (ffmpeg)  q.asr (WhisperX/pyannote)
                                          q.mt (LACTE)      q.tts (voice engines)
```

- Pipelines are declarative stage lists (`backend/app/services/pipelines.py`); every
  stage is idempotent, retried up to 3×, and reports back over an internal API.
- Live progress: Redis pub/sub → WebSocket `/api/v1/ws/runs/{id}`.
- The language/style registry (`backend/app/data/languages.json`) drives the UI
  pickers, validation and the style-adaptation stage — 117 languages, 15 with
  native-style systems.
- Voice cloning is consent-gated at the API level; revocation deletes reference audio.

## Repository layout

```
frontend/       Next.js 15 app — marketing site, dashboard, studios
backend/        FastAPI modular monolith + Alembic migrations
ai-services/    Celery workers: media, speech, translation (LACTE), voice
packages/       shared contracts
docker/         Dockerfiles + nginx
scripts/        dev bootstrap
docs/           architecture, PRD, research design
.github/        CI (lint, typecheck, tests, image builds)
```

## Development

```bash
# Backend only (needs local Postgres/Redis/Mongo/MinIO or compose infra)
cd backend && pip install -r requirements.txt
alembic upgrade head && uvicorn app.main:app --reload

# Frontend only
cd frontend && npm install
BACKEND_ORIGIN=http://localhost:8000 npm run dev

# Tests
cd backend && python -m pytest tests -q
cd frontend && npx tsc --noEmit
```

## Environment

All configuration is via `.env` — see [.env.example](.env.example) for every knob
(database URLs, S3, OAuth providers, LLM endpoint, mock mode, HF token for diarization).

## License note for AI models

Model licenses differ (XTTS-v2 is non-commercial; MADLAD/Qwen/CosyVoice are
permissive). The registry in `docs/ARCHITECTURE.md §7` tracks what may ship
commercially — check before enabling engines in production.
