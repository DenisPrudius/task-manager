from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import Team, TeamMember, User, UserRole
from app.repositories.team_repository import TeamRepository
from app.repositories.user_repository import UserRepository
from app.schemas.team import TeamCreate, TeamUpdate


class TeamService:
    def __init__(self, db: Session) -> None:
        self.repo = TeamRepository(db)
        self.user_repo = UserRepository(db)
        self.db = db

    def create(self, data: TeamCreate, creator: User) -> Team:
        # Admin can pick any user as leader; otherwise creator is the leader
        if creator.role == UserRole.ADMIN and data.leader_id:
            leader = self.user_repo.get(data.leader_id)
            if not leader:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Користувача не знайдено")
            # Auto-promote member → team_lead
            if leader.role == UserRole.MEMBER:
                leader.role = UserRole.TEAM_LEAD
                self.db.commit()
            leader_id = leader.id
        else:
            leader_id = creator.id

        team = Team(name=data.name, description=data.description, leader_id=leader_id)
        created = self.repo.create(team)
        self.db.add(TeamMember(team_id=created.id, user_id=leader_id))
        self.db.commit()
        return created

    def get_or_404(self, team_id: int) -> Team:
        team = self.repo.get(team_id)
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Команду не знайдено")
        return team

    def list_for_user(self, user_id: int) -> list[Team]:
        return self.repo.get_by_member(user_id)

    def list_all(self) -> list[Team]:
        return self.repo.get_all()

    def update(self, team: Team, data: TeamUpdate, actor: User) -> Team:
        self._require_leader_or_admin(team, actor)
        if data.name is not None:
            team.name = data.name
        if data.description is not None:
            team.description = data.description
        return self.repo.update(team)

    def delete(self, team: Team, actor: User) -> None:
        self._require_leader_or_admin(team, actor)
        self.repo.delete(team)

    def add_member(self, team: Team, user_id: int, actor: User) -> None:
        self._require_leader_or_admin(team, actor)
        if not self.user_repo.get(user_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Користувача не знайдено")
        if self.repo.is_member(team.id, user_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Вже є членом команди")
        self.db.add(TeamMember(team_id=team.id, user_id=user_id))
        self.db.commit()

    def remove_member(self, team: Team, user_id: int, actor: User) -> None:
        self._require_leader_or_admin(team, actor)
        member = self.repo.get_member(team.id, user_id)
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Користувач не є членом команди")
        self.db.delete(member)
        self.db.commit()

    @staticmethod
    def _require_leader_or_admin(team: Team, user: User) -> None:
        if team.leader_id != user.id and user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостатньо прав")
