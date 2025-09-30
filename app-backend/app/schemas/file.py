from typing import Optional

from pydantic import BaseModel
from datetime import datetime


class FileCreate(BaseModel):
    filename: str
    size: float
    user_id: int
    type: str


class FileOut(BaseModel):
    id: int
    filename: str
    type: str
    created_at: datetime
    size: Optional[float] = None

    class Config:
        from_attributes = True
