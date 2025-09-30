from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field


class QuizGenerateParams(BaseModel):
    user_id: int
    filenames: List[str]
    topic: Optional[str] = None
    total_questions_needed: int


class Question(BaseModel):
    question: str
    topic: str
    options: List[str]
    correctAnswer: str
    points: int


class QuestionList(BaseModel):
    questions: List[Question]

class QuizFromTreeParams(BaseModel):
    user_id: int
    knowledge_tree: Dict[str, Any]
    total_questions_needed: int
    topics: Optional[List[str]] = Field(default=None)