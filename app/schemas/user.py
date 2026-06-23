from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.db.models import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    password: str | None = None


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}
