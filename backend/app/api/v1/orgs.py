import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_org_role
from app.models import Invitation, Membership, Notification, Organization, User
from app.models.org import ROLE_ORDER
from app.schemas.org import InviteIn, MemberOut, OrgCreate, OrgOut, RoleUpdate

router = APIRouter(prefix="/orgs", tags=["organizations"])


@router.get("", response_model=list[OrgOut])
async def my_orgs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Organization, Membership.role)
            .join(Membership, Membership.org_id == Organization.id)
            .where(Membership.user_id == user.id)
            .order_by(Organization.created_at)
        )
    ).all()
    out = []
    for org, role in rows:
        o = OrgOut.model_validate(org)
        o.role = role
        out.append(o)
    return out


@router.post("", response_model=OrgOut, status_code=201)
async def create_org(body: OrgCreate, user: User = Depends(get_current_user),
                     db: AsyncSession = Depends(get_db)):
    slug = re.sub(r"[^a-z0-9]+", "-", body.name.lower()).strip("-") or "org"
    org = Organization(name=body.name, slug=f"{slug}-{uuid4().hex[:6]}",
                       credits=settings.FREE_PLAN_CREDITS)
    db.add(org)
    await db.flush()
    db.add(Membership(org_id=org.id, user_id=user.id, role="owner"))
    await db.commit()
    o = OrgOut.model_validate(org)
    o.role = "owner"
    return o


@router.get("/{org_id}/members", response_model=list[MemberOut])
async def members(org_id: str, _: Membership = Depends(require_org_role("viewer")),
                  db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Membership, User)
            .join(User, User.id == Membership.user_id)
            .where(Membership.org_id == org_id)
        )
    ).all()
    return [
        MemberOut(id=m.id, user_id=u.id, email=u.email, name=u.name, role=m.role)
        for m, u in rows
    ]


@router.post("/{org_id}/invitations", status_code=201)
async def invite(org_id: str, body: InviteIn,
                 _: Membership = Depends(require_org_role("owner")),
                 db: AsyncSession = Depends(get_db)):
    if body.role not in ("viewer", "editor", "admin"):
        raise HTTPException(422, "Role must be viewer, editor or admin")
    inv = Invitation(org_id=org_id, email=body.email, role=body.role)
    db.add(inv)
    invited = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if invited:
        db.add(Notification(user_id=invited.id, type="invite",
                            title="Workspace invitation",
                            body=f"You were invited to join a workspace as {body.role}.",
                            data={"org_id": org_id, "token": inv.token}))
    await db.commit()
    return {"id": inv.id, "token": inv.token, "email": inv.email, "role": inv.role}


@router.post("/invitations/{token}/accept", status_code=200)
async def accept_invitation(token: str, user: User = Depends(get_current_user),
                            db: AsyncSession = Depends(get_db)):
    inv = (await db.execute(select(Invitation).where(Invitation.token == token))).scalar_one_or_none()
    if inv is None or inv.accepted:
        raise HTTPException(404, "Invitation not found or already used")
    if inv.email.lower() != user.email.lower():
        raise HTTPException(403, "This invitation was issued to a different email")
    existing = (
        await db.execute(select(Membership).where(
            Membership.org_id == inv.org_id, Membership.user_id == user.id))
    ).scalar_one_or_none()
    if existing is None:
        db.add(Membership(org_id=inv.org_id, user_id=user.id, role=inv.role))
    inv.accepted = True
    await db.commit()
    return {"org_id": inv.org_id, "role": inv.role}


@router.patch("/{org_id}/members/{member_id}", response_model=dict)
async def change_role(org_id: str, member_id: str, body: RoleUpdate,
                      actor: Membership = Depends(require_org_role("owner")),
                      db: AsyncSession = Depends(get_db)):
    if body.role not in ROLE_ORDER:
        raise HTTPException(422, "Invalid role")
    m = await db.get(Membership, member_id)
    if m is None or m.org_id != org_id:
        raise HTTPException(404, "Member not found")
    if m.id == actor.id and body.role != "owner":
        raise HTTPException(409, "Owners cannot demote themselves")
    m.role = body.role
    await db.commit()
    return {"id": m.id, "role": m.role}


@router.delete("/{org_id}/members/{member_id}", status_code=204)
async def remove_member(org_id: str, member_id: str,
                        actor: Membership = Depends(require_org_role("owner")),
                        db: AsyncSession = Depends(get_db)):
    m = await db.get(Membership, member_id)
    if m is None or m.org_id != org_id:
        raise HTTPException(404, "Member not found")
    if m.role == "owner":
        raise HTTPException(409, "Cannot remove an owner")
    await db.delete(m)
    await db.commit()
