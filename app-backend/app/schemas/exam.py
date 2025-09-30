from datetime import datetime
from enum import Enum
from typing import Optional, List, Union

from pydantic import BaseModel, Field


class DifficultyEnum(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class QuestionTypeEnum(str, Enum):
    all_question_types = "all-question-types"
    true_false = "true-false"
    single_choice = "single-choice"
    multiple_choice = "multiple-choice"
    text_answer = "text-answer"


class ExamGenerateParams(BaseModel):
    topic: Optional[str] = None
    difficulty: DifficultyEnum
    num_of_questions: int = Field(..., le=30)
    question_type: QuestionTypeEnum
    filenames: List[str]


class GeneratedQuestion(BaseModel):
    id: str
    type: QuestionTypeEnum
    question: str
    options: Optional[List[str]] = None
    correctAnswer: Union[str, List[str]]
    points: int


class QuestionSchema(BaseModel):
    id: Optional[int] = None
    type: str
    question: str
    options: Optional[List[str]] = None
    correct_answer: Union[str, List[str]]
    points: int


class ExamCreateSchema(BaseModel):
    title: str
    description: Optional[str]
    time_limit: int
    questions: List[QuestionSchema]
    sources: List[str] = []


class ExamQuestionOut(BaseModel):
    id: int
    type: str
    question: str
    options: Optional[List[str]] = None
    correct_answer: Union[str, List[str]]
    points: int

    class Config:
        from_attributes = True


class ExamOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    time_limit: int
    created_at: datetime
    num_of_questions: int = 0
    points: int = 0
    questions: List[ExamQuestionOut] = []

    class Config:
        from_attributes = True


class ExamAttemptSchema(BaseModel):
    exam_id: int
    exam_title: str
    completed_at: datetime
    score: int
    total_points: int
    percentage: int
    correct_answers: int
    total_questions: int
    time_spent: int
    questions: List[dict]


class ExamAttemptOut(BaseModel):
    id: int
    exam_title: str
    completed_at: datetime
    score: int
    total_points: int
    percentage: int
    correct_answers: int
    total_questions: int
    time_spent: int
    questions: List[dict] = []

    class Config:
        from_attributes = True


class TextQuestion(BaseModel):
    question_id: int
    question: str
    user_answer: str
    correct_answer: str


class ExamTextAnswerCheck(BaseModel):
    exam_id: int
    questions: List[TextQuestion]


class AiResponse(BaseModel):
    question_id: int
    response: str


class UserMessage(BaseModel):
    message: str
