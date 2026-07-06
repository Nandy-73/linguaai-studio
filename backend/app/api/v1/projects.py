from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_org_role, require_project_role
from app.models import Membership, Project
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate
from app.services import storage

router = APIRouter(tags=["projects"])


@router.get("/orgs/{org_id}/projects", response_model=list[ProjectOut])
async def list_projects(org_id: str, _: Membership = Depends(require_org_role("viewer")),
                        db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(select(Project).where(Project.org_id == org_id)
                         .order_by(Project.created_at.desc()))
    ).scalars().all()
    return rows


@router.post("/orgs/{org_id}/projects", response_model=ProjectOut, status_code=201)
async def create_project(org_id: str, body: ProjectCreate,
                         _: Membership = Depends(require_org_role("editor")),
                         db: AsyncSession = Depends(get_db)):
    project = Project(org_id=org_id, **body.model_dump())
    db.add(project)
    await db.commit()
    return project


@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(access=Depends(require_project_role("viewer"))):
    project, _ = access
    return project


@router.patch("/projects/{project_id}", response_model=ProjectOut)
async def update_project(body: ProjectUpdate,
                         access=Depends(require_project_role("editor")),
                         db: AsyncSession = Depends(get_db)):
    project, _ = access
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    await db.commit()
    return project


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(access=Depends(require_project_role("admin")),
                         db: AsyncSession = Depends(get_db)):
    project, _ = access
    storage.delete_prefix(f"media/{project.org_id}/{project.id}/")
    await db.delete(project)
    await db.commit()
