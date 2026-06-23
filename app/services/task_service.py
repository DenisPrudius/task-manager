from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import ChecklistItem, Task, TaskStatus, Team, TeamMember, User, UserRole
from app.repositories.project_repository import ProjectRepository
from app.repositories.task_repository import TaskRepository
from app.repositories.team_repository import TeamRepository
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:
    def __init__(self, db: Session) -> None:
        self.repo = TaskRepository(db)
        self.project_repo = ProjectRepository(db)
        self.team_repo = TeamRepository(db)
        self.db = db

    def create(self, data: TaskCreate, actor: User) -> Task:
        self._get_project_or_404(data.project_id)
        if actor.role == UserRole.TEAM_LEAD:
            self._validate_team_lead_assignment(data, actor)
        task = Task(
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            due_date=data.due_date,
            project_id=data.project_id,
            assignee_id=data.assignee_id,
            team_id=data.team_id,
        )
        return self.repo.create(task)

    def get_or_404(self, task_id: int) -> Task:
        task = self.repo.get(task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задачу не знайдено")
        return task

    def list_for_project(self, project_id: int, skip: int = 0, limit: int = 100) -> list[Task]:
        return self.repo.get_by_project(project_id, skip, limit)

    def list_for_assignee(self, user_id: int, skip: int = 0, limit: int = 100) -> list[Task]:
        return self.repo.get_by_assignee_or_team(user_id, skip, limit)

    def list_for_team(self, team_id: int, skip: int = 0, limit: int = 100) -> list[Task]:
        return self.repo.get_by_team(team_id, skip, limit)

    def update(self, task: Task, data: TaskUpdate, actor: User) -> Task:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(task, field, value)
        return self.repo.update(task)

    def update_status(self, task: Task, new_status: TaskStatus, actor: User) -> Task:
        if actor.role in (UserRole.ADMIN, UserRole.TEAM_LEAD):
            task.status = new_status
            return self.repo.update(task)
        # Member: must be assignee or in the assigned team
        if task.assignee_id == actor.id:
            task.status = new_status
            return self.repo.update(task)
        if task.team_id and self.team_repo.is_member(task.team_id, actor.id):
            task.status = new_status
            return self.repo.update(task)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Можна змінювати статус тільки своїх задач",
        )

    def delete(self, task: Task, actor: User) -> None:
        self.repo.delete(task)

    def join(self, task: Task, actor: User) -> Task:
        if task.assignee_id is not None and task.assignee_id != actor.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Задача вже має виконавця",
            )
        task.assignee_id = actor.id
        return self.repo.update(task)

    # ── Checklist ──────────────────────────────────────────────────────────────

    def get_checklist(self, task_id: int) -> list[ChecklistItem]:
        return (
            self.db.query(ChecklistItem)
            .filter(ChecklistItem.task_id == task_id)
            .order_by(ChecklistItem.id)
            .all()
        )

    def add_checklist_item(self, task_id: int, text: str) -> ChecklistItem:
        item = ChecklistItem(task_id=task_id, text=text.strip())
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_checklist_item(self, item_id: int, text: str | None, is_done: bool | None) -> ChecklistItem:
        item = self.db.get(ChecklistItem, item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пункт не знайдено")
        if text is not None:
            item.text = text.strip()
        if is_done is not None:
            item.is_done = is_done
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_checklist_item(self, item_id: int) -> None:
        item = self.db.get(ChecklistItem, item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пункт не знайдено")
        self.db.delete(item)
        self.db.commit()

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _get_project_or_404(self, project_id: int):
        project = self.project_repo.get(project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не знайдено")
        return project

    def _validate_team_lead_assignment(self, data: TaskCreate, actor: User) -> None:
        if not data.team_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Тімлід повинен призначити задачу своїй команді",
            )
        team = self.db.get(Team, data.team_id)
        if not team or team.leader_id != actor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Можна призначати задачі тільки команді, якою ви керуєте",
            )
