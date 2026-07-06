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
