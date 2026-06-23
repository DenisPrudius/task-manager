from fastapi import APIRouter

from app.core.deps import AdminUser, DbSession, TeamLeadUser
from app.schemas.team import TeamDetailOut, TeamOut
from app.schemas.user import UserOut, UserRoleUpdate
from app.services.team_service import TeamService
from app.services.user_service import UserService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=list[UserOut])
def list_users(current_user: TeamLeadUser, db: DbSession):
    return UserService(db).list_all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
def set_user_role(user_id: int, data: UserRoleUpdate, current_user: AdminUser, db: DbSession):
    return UserService(db).update_role(user_id, data.role)


@router.get("/teams", response_model=list[TeamDetailOut])
def list_all_teams(current_user: TeamLeadUser, db: DbSession):
    teams = TeamService(db).list_all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "leader_id": t.leader_id,
            "created_at": t.created_at,
            "member_ids": [m.user_id for m in t.members],
        }
        for t in teams
    ]
