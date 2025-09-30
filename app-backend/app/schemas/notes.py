from datetime import datetime
from typing import List

from pydantic import BaseModel


class NotesGenerate(BaseModel):
    topic: str
    focus: str
    filenames: List[str]


class NotesOut(BaseModel):
    id: int
    content: str


class NotesSave(BaseModel):
    title: str
    content: str
    is_generated: bool


class NotesEdit(BaseModel):
    id: int
    title: str
    content: str


class NoteGet(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    is_generated: bool


class NoteEnhance(BaseModel):
    content: str
    improvement: str
    filenames: List[str]
