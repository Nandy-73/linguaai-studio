from fastapi import APIRouter

from app.api.v1 import (
    admin, analytics, api_keys, auth, billing, chat, internal, languages,
    live, media, notifications, orgs, projects, runs, users, voices, ws,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(orgs.router)
api_router.include_router(projects.router)
api_router.include_router(media.router)
api_router.include_router(runs.router)
api_router.include_router(languages.router)
api_router.include_router(voices.router)
api_router.include_router(api_keys.router)
api_router.include_router(billing.router)
api_router.include_router(analytics.router)
api_router.include_router(notifications.router)
api_router.include_router(chat.router)
api_router.include_router(live.router)
api_router.include_router(admin.router)
api_router.include_router(internal.router)
api_router.include_router(ws.router)
