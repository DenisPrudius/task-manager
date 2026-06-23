from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession, TeamLeadUser
from app.schemas.checklist import ChecklistItemCreate, ChecklistItemOut, ChecklistItemUpdate
from app.schemas.task import TaskCreate, TaskOut, TaskStatusUpdate, TaskUpdate
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("/", response_model=TaskOut, status_code=201)
def create_task(data: TaskCreate, current_user: TeamLeadUser, db: DbSession):
    return TaskService(db).create(data, current_user)


@router.get("/my", response_model=list[TaskOut])
def my_tasks(current_user: CurrentUser, db: DbSession, skip: int = 0, limit: int = 100):
    return TaskService(db).list_for_assignee(current_user.id, skip, limit)


@router.get("/project/{project_id}", response_model=list[TaskOut])
def project_tasks(project_id: int, current_user: CurrentUser, db: DbSession, skip: int = 0, limit: int = 100):
    return TaskService(db).list_for_project(project_id, skip, limit)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, current_user: CurrentUser, db: DbSession):
    return TaskService(db).get_or_404(task_id)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, data: TaskUpdate, current_user: TeamLeadUser, db: DbSession):
    svc = TaskService(db)
    return svc.update(svc.get_or_404(task_id), data, current_user)


@router.patch("/{task_id}/status", response_model=TaskOut)
def update_task_status(task_id: int, data: TaskStatusUpdate, current_user: CurrentUser, db: DbSession):
    svc = TaskService(db)
    return svc.update_status(svc.get_or_404(task_id), data.status, current_user)


@router.post("/{task_id}/join", response_model=TaskOut)
def join_task(task_id: int, current_user: CurrentUser, db: DbSession):
    svc = TaskService(db)
    return svc.join(svc.get_or_404(task_id), current_user)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, current_user: TeamLeadUser, db: DbSession):
    svc = TaskService(db)
    svc.delete(svc.get_or_404(task_id), current_user)


# ── Checklist ─────────────────────────────────────────────────────────────────

@router.get("/{task_id}/checklist", response_model=list[ChecklistItemOut])
def get_checklist(task_id: int, current_user: CurrentUser, db: DbSession):
    TaskService(db).get_or_404(task_id)
    return TaskService(db).get_checklist(task_id)


@router.post("/{task_id}/checklist", response_model=ChecklistItemOut, status_code=201)
def add_checklist_item(task_id: int, data: ChecklistItemCreate, current_user: TeamLeadUser, db: DbSession):
    TaskService(db).get_or_404(task_id)
    return TaskService(db).add_checklist_item(task_id, data.text)


@router.patch("/{task_id}/checklist/{item_id}", response_model=ChecklistItemOut)
def update_checklist_item(task_id: int, item_id: int, data: ChecklistItemUpdate, current_user: CurrentUser, db: DbSession):
    return TaskService(db).update_checklist_item(item_id, data.text, data.is_done)


@router.delete("/{task_id}/checklist/{item_id}", status_code=204)
def delete_checklist_item(task_id: int, item_id: int, current_user: TeamLeadUser, db: DbSession):
    TaskService(db).delete_checklist_item(item_id)
