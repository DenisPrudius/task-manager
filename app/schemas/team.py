from datetime import datetime

from pydantic import BaseModel


class TeamCreate(BaseModel):
    name: str
    description: str | None = None
    leader_id: int | None = None


class TeamUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class TeamMemberAdd(BaseModel):
    user_id: int


class TeamOut(BaseModel):
    id: int
    name: str
    description: str | None
    leader_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamDetailOut(TeamOut):
    member_ids: list[int] = []
