from sqlalchemy.orm import Session

from app.db.models import Team, TeamMember
from app.repositories.base import BaseRepository


class TeamRepository(BaseRepository[Team]):
    def __init__(self, db: Session) -> None:
        super().__init__(Team, db)

    def get_by_member(self, user_id: int) -> list[Team]:
        return (
            self.db.query(Team)
            .join(TeamMember, Team.id == TeamMember.team_id)
            .filter(TeamMember.user_id == user_id)
            .all()
        )

    def is_member(self, team_id: int, user_id: int) -> bool:
        return (
            self.db.query(TeamMember)
            .filter(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
            .first()
            is not None
        )

    def get_member(self, team_id: int, user_id: int) -> TeamMember | None:
        return (
            self.db.query(TeamMember)
            .filter(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
            .first()
        )
