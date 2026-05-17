"""add_segment_configs

Revision ID: a1b2c3d4e5f6
Revises: f307e9766762
Create Date: 2026-05-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f307e9766762'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'light_segment_configs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('light_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('source_import_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['light_id'], ['lights.id'], ),
        sa.ForeignKeyConstraint(['source_import_id'], ['imported_files.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'light_segment_config_entries',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('config_id', sa.Integer(), nullable=False),
        sa.Column('segment_index', sa.Integer(), nullable=False),
        sa.Column('name', sa.Text(), nullable=True),
        sa.Column('start_led', sa.Integer(), nullable=False),
        sa.Column('stop_led', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['config_id'], ['light_segment_configs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('master_presets', schema=None) as batch_op:
        batch_op.add_column(sa.Column('segment_config_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_master_presets_segment_config_id',
            'light_segment_configs',
            ['segment_config_id'],
            ['id'],
        )


def downgrade() -> None:
    with op.batch_alter_table('master_presets', schema=None) as batch_op:
        batch_op.drop_constraint('fk_master_presets_segment_config_id', type_='foreignkey')
        batch_op.drop_column('segment_config_id')

    op.drop_table('light_segment_config_entries')
    op.drop_table('light_segment_configs')
