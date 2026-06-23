from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import Project, User, UserRole
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, db: Session) -> None:
        self.repo = ProjectRepository(db)

    def create(self, data: ProjectCreate, owner: User) -> Project:
        project = Project(
            name=data.name,
            description=data.description,
            owner_id=owner.id,
        )
        return self.repo.create(project)

    def get_or_404(self, project_id: int) -> Project:
        project = self.repo.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не знайдено",
            )
        return project

    def list_for_user(self, user: User) -> list[Project]:
        return self.repo.get_accessible(user.id, user.role == UserRole.ADMIN)

    def update(self, project: Project, data: ProjectUpdate, actor: User) -> Project:
        self._require_owner(project, actor)
        if data.name is not None:
            project.name = data.name
        if data.description is not None:
            project.description = data.description
        return self.repo.update(project)

    def delete(self, project: Project, actor: User) -> None:
        self._require_owner(project, actor)
        self.repo.delete(project)

    @staticmethod
    def _require_owner(project: Project, user: User) -> None:
        if user.role == UserRole.ADMIN:
            return
        if project.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостатньо прав",
            )
