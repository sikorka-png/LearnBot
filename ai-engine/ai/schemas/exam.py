from enum import Enum
from typing import Optional, List, Union
from pydantic import BaseModel


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
    user_id: int
    topic: Optional[str] = None
    difficulty: DifficultyEnum
    num_of_questions: int
    question_type: QuestionTypeEnum
    filenames: List[str]


class Question(BaseModel):
    type: str
    question: str
    options: Union[List[str], None]
    correctAnswer: Union[str, List[str]]
    points: int


class QuestionList(BaseModel):
    questions: List[Question]


class QuestionClarificationPayload(BaseModel):
    user_id: int
    original_question: str
    user_message: str
    session_id: str
    all_possible_questions: Optional[List[str]]
    correct_answers: Optional[List[str]]
    user_answers: Optional[List[str]]
    sources: Optional[List[str]]


class TextQuestion(BaseModel):
    user_id: int
    question: str
    user_answer: str
    correct_answer: str
    sources: List[str] = []
