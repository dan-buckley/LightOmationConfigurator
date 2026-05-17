"""add segment groups

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6a7b8
Create Date: 2026-05-17
"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6g7h8i9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'light_segment_groups',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('config_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.ForeignKeyConstraint(['config_id'], ['light_segment_configs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'light_segment_group_members',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('entry_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['group_id'], ['light_segment_groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['entry_id'], ['light_segment_config_entries.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('light_segment_group_members')
    op.drop_table('light_segment_groups')
