"""Initial schema — all core tables.

Revision ID: 0001
Revises:
Create Date: 2026-07-05
"""
from alembic import op

from app.core.database import Base
import app.models  # noqa: F401  — ensure every model is registered

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Bootstrap migration: creates the full schema from model metadata.
    # Subsequent migrations use `alembic revision --autogenerate` as normal.
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
