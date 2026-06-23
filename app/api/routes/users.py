from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.core.deps import CurrentUser, DbSession
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, db: DbSession):
    return UserService(db).register(data)


@router.post("/login", response_model=Token)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DbSession,
):
    return UserService(db).authenticate(form_data.username, form_data.password)


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(data: UserUpdate, current_user: CurrentUser, db: DbSession):
    return UserService(db).update(current_user, data)
