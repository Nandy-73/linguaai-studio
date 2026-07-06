from datetime import datetime

from pydantic import BaseModel, Field


class UploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=300)
    content_type: str = "application/octet-stream"
    size_bytes: int = Field(ge=0, le=20 * 1024**3)
    kind: str = "video"  # video|audio|document


class UploadTicket(BaseModel):
    asset_id: str
    upload_url: str
    storage_key: str


class AssetOut(BaseModel):
    id: str
    project_id: str
    kind: str
    filename: str
    content_type: str
    size_bytes: int
    duration_seconds: float | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
