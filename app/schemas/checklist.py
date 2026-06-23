from pydantic import BaseModel


class ChecklistItemCreate(BaseModel):
    text: str


class ChecklistItemUpdate(BaseModel):
    text: str | None = None
    is_done: bool | None = None


class ChecklistItemOut(BaseModel):
    id: int
    task_id: int
    text: str
    is_done: bool

    model_config = {"from_attributes": True}
