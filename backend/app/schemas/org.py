from pydantic import BaseModel, EmailStr, Field


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class OrgOut(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    credits: int
    role: str | None = None

    model_config = {"from_attributes": True}


class MemberOut(BaseModel):
    id: str
    user_id: str
    email: str
    name: str
    role: str


class InviteIn(BaseModel):
    email: EmailStr
    role: str = "editor"


class RoleUpdate(BaseModel):
    role: str
