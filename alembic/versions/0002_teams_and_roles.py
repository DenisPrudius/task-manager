"""teams and roles

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-12 12:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    userrole = sa.Enum("admin", "team_lead", "member", name="userrole")
    userrole.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.Enum("admin", "team_lead", "member", name="userrole"),
            server_default="member",
            nullable=False,
        ),
    )
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("leader_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["leader_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_teams_name", "teams", ["name"])
    op.create_index("ix_teams_leader_id", "teams", ["leader_id"])

    op.create_table(
        "team_members",
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("team_id", "user_id"),
    )

    op.add_column(
        "tasks",
        sa.Column("team_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key("fk_tasks_team_id", "tasks", "teams", ["team_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_tasks_team_id", "tasks", ["team_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_team_id", "tasks")
    op.drop_constraint("fk_tasks_team_id", "tasks", type_="foreignkey")
    op.drop_column("tasks", "team_id")
    op.drop_table("team_members")
    op.drop_index("ix_teams_leader_id", "teams")
    op.drop_index("ix_teams_name", "teams")
    op.drop_table("teams")
    op.drop_index("ix_users_role", "users")
    op.drop_column("users", "role")
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
