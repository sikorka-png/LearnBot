from typing import List, Optional
from pydantic import BaseModel, Field

class PracticeProblem(BaseModel):
    id: str
    type: str
    topic_node_id: str
    problem_title: str
    problem_description: str
    hint: Optional[str] = None
    sources: Optional[List[str]] = None

class GradePracticeParams(BaseModel):
    user_id: int
    problem: PracticeProblem
    user_answer: str = Field(..., min_length=1)

class GradePracticeNoteResponse(BaseModel):
    problem_id: str
    note: str
