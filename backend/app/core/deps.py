from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Path, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token, hash_api_key
from app.models import ApiKey, Membership, Organization, Project, User
from app.models.org import ROLE_ORDER

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Security(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    token = creds.credentials

    # API key path (machine access)
    if token.startswith("lai_"):
        key = (
            await db.execute(select(ApiKey).where(ApiKey.hashed_secret == hash_api_key(token)))
        ).scalar_one_or_none()
        if key is None or key.revoked:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")
        key.last_used_at = datetime.now(timezone.utc)
        owner = (
            await db.execute(
                select(User)
                .join(Membership, Membership.user_id == User.id)
                .where(Membership.org_id == key.org_id, Membership.role == "owner")
            )
        ).scalars().first()
        await db.commit()
        if owner is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Orphaned API key")
        return owner

    try:
        payload = decode_token(token, "access")
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = await db.get(User, payload["sub"])
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


async def require_superuser(user: User = Depends(get_current_user)) -> User:
    if not user.is_superuser:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Superuser required")
    return user


def require_org_role(min_role: str = "viewer"):
    async def dep(
        org_id: str = Path(...),
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> Membership:
        membership = (
            await db.execute(
                select(Membership).where(
                    Membership.org_id == org_id, Membership.user_id == user.id
                )
            )
        ).scalar_one_or_none()
        if membership is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
        if ROLE_ORDER[membership.role] < ROLE_ORDER[min_role]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires {min_role} role")
        return membership

    return dep


async def get_project_access(
    project_id: str = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    min_role: str = "viewer",
) -> tuple[Project, Membership]:
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    membership = (
        await db.execute(
            select(Membership).where(
                Membership.org_id == project.org_id, Membership.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if membership is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project, membership


def require_project_role(min_role: str = "viewer"):
    async def dep(
        project_id: str = Path(...),
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> tuple[Project, Membership]:
        project, membership = await get_project_access(project_id, user, db)
        if ROLE_ORDER[membership.role] < ROLE_ORDER[min_role]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires {min_role} role")
        return project, membership

    return dep


async def get_org_or_404(org_id: str, db: AsyncSession) -> Organization:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    return org
