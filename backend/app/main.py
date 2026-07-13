from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.services import storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        storage.ensure_bucket()
    except Exception as exc:  # storage may lag behind on first compose start
        print(f"[startup] bucket check failed (will retry on first use): {exc}")
    yield


app = FastAPI(
    title="LinguaAI Studio API",
    version="0.1.0",
    description="AI Multimedia Localization Platform — API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}


@app.get("/healthz/deps")
async def healthz_deps():
    """Per-dependency connectivity check — pinpoints which backing service is
    unreachable (and why) without needing dashboard log access."""
    from sqlalchemy import text
    from starlette.concurrency import run_in_threadpool

    from app.core.database import engine
    from app.core.mongo import get_mongo
    from app.core.redis import get_redis

    def err(exc: Exception) -> str:
        return f"{type(exc).__name__}: {exc}"[:400]

    out: dict[str, str] = {}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        out["postgres"] = "ok"
    except Exception as exc:
        out["postgres"] = err(exc)

    try:
        await get_mongo().command("ping")
        out["mongo"] = "ok"
    except Exception as exc:
        out["mongo"] = err(exc)

    try:
        await get_redis().ping()
        out["redis"] = "ok"
    except Exception as exc:
        out["redis"] = err(exc)

    def check_broker() -> str:
        from app.celery_client import celery_app
        try:
            conn = celery_app.connection()
            conn.ensure_connection(max_retries=1, timeout=5)
            conn.release()
            return "ok"
        except Exception as exc:
            return err(exc)

    out["celery_broker"] = await run_in_threadpool(check_broker)

    return out
