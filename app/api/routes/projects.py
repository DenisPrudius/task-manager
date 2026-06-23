from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession, TeamLeadUser
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", response_model=ProjectOut, status_code=201)
def create_project(data: ProjectCreate, current_user: TeamLeadUser, db: DbSession):
    return ProjectService(db).create(data, current_user)


@router.get("/", response_model=list[ProjectOut])
def list_projects(current_user: CurrentUser, db: DbSession):
    return ProjectService(db).list_for_user(current_user)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, current_user: CurrentUser, db: DbSession):
    return ProjectService(db).get_or_404(project_id)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    current_user: TeamLeadUser,
    db: DbSession,
):
    svc = ProjectService(db)
    project = svc.get_or_404(project_id)
    return svc.update(project, data, current_user)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, current_user: TeamLeadUser, db: DbSession):
    svc = ProjectService(db)
    svc.delete(svc.get_or_404(project_id), current_user)
