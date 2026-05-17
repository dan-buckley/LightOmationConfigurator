"""add segment_group_hint to master_presets and seed preset categories

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2026-05-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

revision = 'e5f6g7h8i9j0'
down_revision = 'd4e5f6g7h8i9'
branch_labels = None
depends_on = None

CATEGORIES = [
    ("Button", "Presets assigned to a physical button; typically short, punchy effects"),
    ("Playlist", "Playlist entries that cycle through other presets automatically"),
    ("Build", "Working/draft presets used during build and testing"),
    ("Standard", "General-purpose effects suitable for most lights"),
    ("All-LED", "Full-strip effects that address every LED uniformly"),
    ("Segmented", "Effects designed to address specific named segment groups"),
]


def upgrade() -> None:
    with op.batch_alter_table("master_presets") as batch_op:
        batch_op.add_column(sa.Column("segment_group_hint", sa.Text(), nullable=True))

    # Seed preset categories (skip if already present — idempotent)
    categories_table = table(
        "preset_categories",
        column("name", sa.Text),
        column("description", sa.Text),
    )
    conn = op.get_bind()
    existing = {row[0] for row in conn.execute(sa.text("SELECT name FROM preset_categories"))}
    to_insert = [
        {"name": name, "description": desc}
        for name, desc in CATEGORIES
        if name not in existing
    ]
    if to_insert:
        op.bulk_insert(categories_table, to_insert)


def downgrade() -> None:
    with op.batch_alter_table("master_presets") as batch_op:
        batch_op.drop_column("segment_group_hint")
