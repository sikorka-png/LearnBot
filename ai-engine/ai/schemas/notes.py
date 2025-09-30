from typing import List, TypedDict, Optional

from pydantic import BaseModel


class NotesGenerate(BaseModel):
    user_id: int
    topic: str
    focus: str
    filenames: List[str]


class NoteEnhance(BaseModel):
    user_id: int
    content: str
    improvement: str
    filenames: List[str]


class GraphState(TypedDict):
    notes: str
    feedback: str
    topic: str
    focus: str
    user_id: int
    filenames: List[str]
    attempt: int
    partial_notes: Optional[List[str]]
