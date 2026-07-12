import re
from datetime import datetime, timezone
from urllib.parse import urlencode
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token, create_refresh_token, decode_token, hash_password, verify_password,
)
from app.models import Membership, OAuthAccount, Organization, RefreshToken, User
from app.schemas.auth import LoginIn, RefreshIn, RegisterIn, TokenPair, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

OAUTH_PROVIDERS = {
    "google": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
        "client_id": lambda: settings.GOOGLE_CLIENT_ID,
        "client_secret": lambda: settings.GOOGLE_CLIENT_SECRET,
    },
    "github": {
        "auth_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "scope": "read:user user:email",
        "client_id": lambda: settings.GITHUB_CLIENT_ID,
        "client_secret": lambda: settings.GITHUB_CLIENT_SECRET,
    },
    "microsoft": {
        "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "userinfo_url": "https://graph.microsoft.com/oidc/userinfo",
        "scope": "openid email profile",
        "client_id": lambda: settings.MICROSOFT_CLIENT_ID,
        "client_secret": lambda: settings.MICROSOFT_CLIENT_SECRET,
    },
}


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "workspace"
    return f"{slug}-{uuid4().hex[:6]}"


async def _create_user_with_org(db: AsyncSession, email: str, name: str,
                                hashed_password: str | None) -> User:
    user = User(email=email, name=name, hashed_password=hashed_password)
    db.add(user)
    await db.flush()
    org = Organization(name=f"{name.split(' ')[0]}'s Workspace" if name else "My Workspace",
                       slug=_slugify(name or email), credits=settings.FREE_PLAN_CREDITS)
    db.add(org)
    await db.flush()
    db.add(Membership(org_id=org.id, user_id=user.id, role="owner"))
    return user


async def _issue_tokens(db: AsyncSession, user: User) -> TokenPair:
    access = create_access_token(user.id)
    refresh, jti, exp = create_refresh_token(user.id)
    db.add(RefreshToken(jti=jti, user_id=user.id, expires_at=exp))
    await db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/register", response_model=TokenPair, status_code=201)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(409, "An account with this email already exists")
    user = await _create_user_with_org(db, body.email, body.name, hash_password(body.password))
    return await _issue_tokens(db, user)


@router.post("/login", response_model=TokenPair)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if user is None or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account disabled")
    return await _issue_tokens(db, user)


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshIn, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token, "refresh")
    except ValueError:
        raise HTTPException(401, "Invalid refresh token")
    record = await db.get(RefreshToken, payload["jti"])
    if record is None or record.revoked:
        raise HTTPException(401, "Refresh token revoked")
    record.revoked = True  # rotation: one-time use
    user = await db.get(User, payload["sub"])
    if user is None or not user.is_active:
        raise HTTPException(401, "User not found")
    return await _issue_tokens(db, user)


@router.post("/logout", status_code=204)
async def logout(body: RefreshIn, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token, "refresh")
        record = await db.get(RefreshToken, payload["jti"])
        if record:
            record.revoked = True
            await db.commit()
    except ValueError:
        pass


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.get("/oauth-providers")
async def oauth_providers():
    """Which OAuth providers are configured — drives the sign-in page buttons."""
    return {"providers": [name for name, conf in OAUTH_PROVIDERS.items() if conf["client_id"]()]}


@router.get("/oauth/{provider}")
async def oauth_start(provider: str):
    conf = OAUTH_PROVIDERS.get(provider)
    if conf is None or not conf["client_id"]():
        raise HTTPException(404, f"OAuth provider '{provider}' is not configured")
    params = {
        "client_id": conf["client_id"](),
        "redirect_uri": f"{settings.FRONTEND_URL}/api/v1/auth/oauth/{provider}/callback",
        "response_type": "code",
        "scope": conf["scope"],
    }
    return RedirectResponse(f"{conf['auth_url']}?{urlencode(params)}")


@router.get("/oauth/{provider}/callback")
async def oauth_callback(provider: str, code: str, db: AsyncSession = Depends(get_db)):
    conf = OAUTH_PROVIDERS.get(provider)
    if conf is None or not conf["client_id"]():
        raise HTTPException(404, "Provider not configured")
    async with httpx.AsyncClient(timeout=30) as client:
        token_resp = await client.post(
            conf["token_url"],
            data={
                "client_id": conf["client_id"](),
                "client_secret": conf["client_secret"](),
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": f"{settings.FRONTEND_URL}/api/v1/auth/oauth/{provider}/callback",
            },
            headers={"Accept": "application/json"},
        )
        token_resp.raise_for_status()
        access = token_resp.json().get("access_token")
        info_resp = await client.get(conf["userinfo_url"],
                                     headers={"Authorization": f"Bearer {access}"})
        info_resp.raise_for_status()
        info = info_resp.json()

    provider_id = str(info.get("sub") or info.get("id"))
    email = info.get("email") or f"{provider_id}@{provider}.local"
    name = info.get("name") or info.get("login") or email.split("@")[0]

    account = (
        await db.execute(select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_account_id == provider_id,
        ))
    ).scalar_one_or_none()
    if account:
        user = await db.get(User, account.user_id)
    else:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user is None:
            user = await _create_user_with_org(db, email, name, None)
        db.add(OAuthAccount(user_id=user.id, provider=provider, provider_account_id=provider_id))
        await db.flush()

    pair = await _issue_tokens(db, user)
    frag = urlencode({"access_token": pair.access_token, "refresh_token": pair.refresh_token})
    return RedirectResponse(f"{settings.FRONTEND_URL}/login#{frag}")


# housekeeping helper used by tests/admin
async def purge_expired_refresh_tokens(db: AsyncSession) -> int:
    now = datetime.now(timezone.utc)
    rows = (await db.execute(select(RefreshToken).where(RefreshToken.expires_at < now))).scalars().all()
    for r in rows:
        await db.delete(r)
    await db.commit()
    return len(rows)
