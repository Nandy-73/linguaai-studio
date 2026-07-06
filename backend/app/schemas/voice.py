from datetime import datetime

from pydantic import BaseModel, Field


class VoiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    kind: str = "stock"
    engine: str = "xtts"
    category: str = "adult_male"
    language_coverage: list[str] = []
    consent_granted: bool = False


class VoiceOut(BaseModel):
    id: str
    name: str
    kind: str
    engine: str
    category: str
    language_coverage: list
    consent_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CharacterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = "adult_male"
    speaker_label: str | None = None
    voice_id: str | None = None


class CharacterOut(BaseModel):
    id: str
    project_id: str
    name: str
    category: str
    speaker_label: str | None
    voice_id: str | None
    traits: dict

    model_config = {"from_attributes": True}


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    scopes: list[str] = ["read", "write"]


class ApiKeyOut(BaseModel):
    id: str
    name: str
    prefix: str
    scopes: list
    revoked: bool
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreated(ApiKeyOut):
    plaintext: str  # returned exactly once
