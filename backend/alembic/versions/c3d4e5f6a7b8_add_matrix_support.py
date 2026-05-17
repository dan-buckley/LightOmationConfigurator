"""add_matrix_support

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-05-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('lights', schema=None) as batch_op:
        batch_op.add_column(sa.Column('light_type', sa.Text(), nullable=True, server_default='strip'))
        batch_op.add_column(sa.Column('shortcode', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('preset_slot_scheme', sa.Text(), nullable=True))

    with op.batch_alter_table('light_segment_config_entries', schema=None) as batch_op:
        batch_op.add_column(sa.Column('start_y', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('stop_y', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('colour', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('light_segment_config_entries', schema=None) as batch_op:
        batch_op.drop_column('colour')
        batch_op.drop_column('stop_y')
        batch_op.drop_column('start_y')

    with op.batch_alter_table('lights', schema=None) as batch_op:
        batch_op.drop_column('preset_slot_scheme')
        batch_op.drop_column('shortcode')
        batch_op.drop_column('light_type')
