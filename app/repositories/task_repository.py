from datetime import UTC, datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import Task, TaskStatus, TeamMember
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    def __init__(self, db: Session) -> None:
        super().__init__(Task, db)

    def get_by_project(
        self, project_id: int, skip: int = 0, limit: int = 100
    ) -> list[Task]:
        return (
            self.db.query(Task)
            .filter(Task.project_id == project_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_assignee_or_team(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> list[Task]:
        team_ids = (
            self.db.query(TeamMember.team_id)
            .filter(TeamMember.user_id == user_id)
            .scalar_subquery()
        )
        return (
            self.db.query(Task)
            .filter(
                or_(Task.assignee_id == user_id, Task.team_id.in_(team_ids))
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_team(
        self, team_id: int, skip: int = 0, limit: int = 100
    ) -> list[Task]:
        return (
            self.db.query(Task)
            .filter(Task.team_id == team_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_overdue(self) -> list[Task]:
        return (
            self.db.query(Task)
            .filter(
                Task.due_date < datetime.now(UTC),
                Task.status != TaskStatus.DONE,
            )
            .all()
        )
