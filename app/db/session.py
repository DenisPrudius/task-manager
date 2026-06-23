import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./db.sqlite3")

# check_same_thread потрібен лише для SQLite (дозволяє роботу з кількох потоків).
connect_args = (
    {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI-залежність: віддає сесію БД і гарантовано її закриває."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Створює всі таблиці (для розробки; у проді — міграції)."""
    from app.db import models  # noqa: F401  щоб моделі зареєструвались у метадаті

    from app.db.base import Base

    Base.metadata.create_all(bind=engine)
