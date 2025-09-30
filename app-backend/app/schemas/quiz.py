from typing import List, Optional
from pydantic import BaseModel


class QuizGenerateParams(BaseModel):
    study_card_id: int
    topics: Optional[List[str]] = None
    total_questions_needed: int


class Question(BaseModel):
    question: str
    topic: str
    options: List[str]
    correctAnswer: str
    points: int


class QuestionList(BaseModel):
    questions: List[Question]


class QuizResults(BaseModel):
    topic: str
    correct: bool


class QuizSubmission(BaseModel):
    study_card_id: int
    results: List[QuizResults]
