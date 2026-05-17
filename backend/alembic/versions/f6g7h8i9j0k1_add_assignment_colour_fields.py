"""add colour fields and timestamps to light_preset_assignments

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2026-05-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f6g7h8i9j0k1"
down_revision: Union[str, None] = "e5f6g7h8i9j0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("light_preset_assignments") as batch_op:
        batch_op.add_column(sa.Column("colour_mode", sa.Text(), nullable=False, server_default="source"))
        batch_op.add_column(sa.Column("palette_override", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("colour_slots", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("created_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("light_preset_assignments") as batch_op:
        batch_op.drop_column("updated_at")
        batch_op.drop_column("created_at")
        batch_op.drop_column("colour_slots")
        batch_op.drop_column("palette_override")
        batch_op.drop_column("colour_mode")
