from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: Session) -> None:
        self.repo = UserRepository(db)

    def register(self, data: UserCreate) -> User:
        if self.repo.get_by_email(data.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email вже використовується")
        if self.repo.get_by_username(data.username):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username вже зайнятий")
        role = UserRole.ADMIN if self.repo.count() == 0 else UserRole.MEMBER
        user = User(
            email=data.email,
            username=data.username,
            hashed_password=hash_password(data.password),
            role=role,
        )
        return self.repo.create(user)

    def authenticate(self, username: str, password: str) -> Token:
        user = self.repo.get_by_username(username)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Невірний логін або пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Обліковий запис деактивовано")
        return Token(access_token=create_access_token(subject=user.id))

    def update(self, user: User, data: UserUpdate) -> User:
        if data.email is not None:
            existing = self.repo.get_by_email(data.email)
            if existing and existing.id != user.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email вже використовується")
            user.email = data.email
        if data.username is not None:
            existing = self.repo.get_by_username(data.username)
            if existing and existing.id != user.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username вже зайнятий")
            user.username = data.username
        if data.password is not None:
            user.hashed_password = hash_password(data.password)
        return self.repo.update(user)

    def list_all(self) -> list[User]:
        return self.repo.get_all()

    def update_role(self, user_id: int, role: UserRole) -> User:
        user = self.repo.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Користувача не знайдено")
        user.role = role
        return self.repo.update(user)
