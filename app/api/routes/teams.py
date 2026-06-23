from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession, TeamLeadUser
from app.schemas.task import TaskOut
from app.schemas.team import TeamCreate, TeamDetailOut, TeamMemberAdd, TeamOut, TeamUpdate
from app.services.task_service import TaskService
from app.services.team_service import TeamService

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.post("/", response_model=TeamOut, status_code=201)
def create_team(data: TeamCreate, current_user: TeamLeadUser, db: DbSession):
    return TeamService(db).create(data, current_user)


@router.get("/", response_model=list[TeamOut])
def list_teams(current_user: CurrentUser, db: DbSession):
    return TeamService(db).list_for_user(current_user.id)


@router.get("/{team_id}", response_model=TeamDetailOut)
def get_team(team_id: int, current_user: CurrentUser, db: DbSession):
    team = TeamService(db).get_or_404(team_id)
    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "leader_id": team.leader_id,
        "created_at": team.created_at,
        "member_ids": [m.user_id for m in team.members],
    }


@router.patch("/{team_id}", response_model=TeamOut)
def update_team(team_id: int, data: TeamUpdate, current_user: CurrentUser, db: DbSession):
    svc = TeamService(db)
    team = svc.get_or_404(team_id)
    return svc.update(team, data, current_user)


@router.delete("/{team_id}", status_code=204)
def delete_team(team_id: int, current_user: CurrentUser, db: DbSession):
    svc = TeamService(db)
    svc.delete(svc.get_or_404(team_id), current_user)


@router.post("/{team_id}/members", status_code=201)
def add_member(team_id: int, data: TeamMemberAdd, current_user: CurrentUser, db: DbSession):
    svc = TeamService(db)
    svc.add_member(svc.get_or_404(team_id), data.user_id, current_user)
    return {"ok": True}


@router.delete("/{team_id}/members/{user_id}", status_code=204)
def remove_member(team_id: int, user_id: int, current_user: CurrentUser, db: DbSession):
    svc = TeamService(db)
    svc.remove_member(svc.get_or_404(team_id), user_id, current_user)


@router.get("/{team_id}/tasks", response_model=list[TaskOut])
def team_tasks(team_id: int, current_user: CurrentUser, db: DbSession):
    return TaskService(db).list_for_team(team_id)
