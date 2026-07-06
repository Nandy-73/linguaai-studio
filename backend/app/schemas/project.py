from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = ""
    source_language: str | None = None
    target_languages: list[str] = []


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    source_language: str | None = None
    target_languages: list[str] | None = None
    settings: dict | None = None


class ProjectOut(BaseModel):
    id: str
    org_id: str
    name: str
    description: str
    source_language: str | None
    target_languages: list
    settings: dict
    created_at: datetime

    model_config = {"from_attributes": True}
