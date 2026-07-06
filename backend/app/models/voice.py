from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, uid

SPEAKER_CATEGORIES = [
    "adult_male", "adult_female", "teen_boy", "teen_girl",
    "child_boy", "child_girl", "old_male", "old_female", "narrator",
]


class Voice(Base, TimestampMixin):
    __tablename__ = "voices"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(20), default="stock")  # stock|cloned
    engine: Mapped[str] = mapped_column(String(40), default="xtts")  # xtts|openvoice|cosyvoice|fishspeech
    category: Mapped[str] = mapped_column(String(30), default="adult_male")
    language_coverage: Mapped[list] = mapped_column(JSON, default=list)
    ref_storage_key: Mapped[str | None] = mapped_column(String(600), nullable=True)
    consent_status: Mapped[str] = mapped_column(String(20), default="none")  # none|granted|revoked
    profile: Mapped[dict] = mapped_column(JSON, default=dict)


class Character(Base, TimestampMixin):
    __tablename__ = "characters"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(30), default="adult_male")
    speaker_label: Mapped[str | None] = mapped_column(String(40), nullable=True)  # e.g. SPEAKER_00
    voice_id: Mapped[str | None] = mapped_column(ForeignKey("voices.id", ondelete="SET NULL"), nullable=True)
    traits: Mapped[dict] = mapped_column(JSON, default=dict)
