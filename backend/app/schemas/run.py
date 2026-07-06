from datetime import datetime

from pydantic import BaseModel, Field


class RunCreate(BaseModel):
    asset_id: str
    template: str = "video_dubbing"  # video_dubbing|audio_dubbing|subtitles|document
    target_languages: list[str] = Field(min_length=1)
    styles: dict[str, str] = {}          # lang -> style id ("auto" = engine decides)
    voice_mode: str = "auto"             # auto|clone|library
    character_voices: dict[str, str] = {}  # character_id -> voice_id
    params: dict = {}


class StageOut(BaseModel):
    id: str
    name: str
    position: int
    status: str
    attempt: int
    artifact_key: str | None
    error: str | None
    meta: dict
    started_at: datetime | None
    finished_at: datetime | None

    model_config = {"from_attributes": True}


class RunOut(BaseModel):
    id: str
    project_id: str
    asset_id: str
    template: str
    params: dict
    status: str
    error: str | None
    credits_used: int
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    stages: list[StageOut] = []

    model_config = {"from_attributes": True}


class SegmentPatch(BaseModel):
    lang: str
    text: str


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    lang: str = "en"
