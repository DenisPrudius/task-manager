import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.tasks.check_deadlines")
def check_deadlines() -> dict:
    from app.db.session import SessionLocal
    from app.repositories.task_repository import TaskRepository

    db = SessionLocal()
    try:
        overdue = TaskRepository(db).get_overdue()
        for task in overdue:
            # TODO: replace with real email sending (e.g. via SendGrid/SMTP)
            logger.warning(
                "Task #%d '%s' is overdue (deadline: %s)",
                task.id,
                task.title,
                task.due_date,
            )
        return {"overdue_count": len(overdue)}
    finally:
        db.close()
