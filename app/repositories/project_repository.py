from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import Project, Task, TeamMember
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    def __init__(self, db: Session) -> None:
        super().__init__(Project, db)

    def get_by_owner(
        self, owner_id: int, skip: int = 0, limit: int = 100
    ) -> list[Project]:
        return (
            self.db.query(Project)
            .filter(Project.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_all(self) -> list[Project]:
        return self.db.query(Project).all()

    def get_accessible(self, user_id: int, is_admin: bool) -> list[Project]:
        """Returns all projects visible to the user:
        - admin: everything
        - others: owned projects + projects where they have tasks (direct or via team)
        """
        if is_admin:
            return self.db.query(Project).all()
        team_ids = (
            self.db.query(TeamMember.team_id)
            .filter(TeamMember.user_id == user_id)
            .scalar_subquery()
        )
        task_project_ids = (
            self.db.query(Task.project_id)
            .filter(or_(Task.assignee_id == user_id, Task.team_id.in_(team_ids)))
            .distinct()
            .scalar_subquery()
        )
        return (
            self.db.query(Project)
            .filter(or_(Project.owner_id == user_id, Project.id.in_(task_project_ids)))
            .all()
        )
