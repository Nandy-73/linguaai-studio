from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, uid


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    source_language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    target_languages: Mapped[list] = mapped_column(JSON, default=list)  # ["fr", "ta", ...]
    settings: Mapped[dict] = mapped_column(JSON, default=dict)  # styles, glossary refs, defaults
