from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class QuickExamParams(BaseModel):
    user_id: int
    knowledge_tree: Dict[str, Any]
    topics: List[str]

class TrueFalseQuestion(BaseModel):
    question: str
    topic: str
    correctAnswer: bool
    points: int = 1

class MultipleChoiceQuestion(BaseModel):
    question: str
    topic: str
    options: List[str]
    correctAnswer: str
    points: int = 2

class OpenEndedQuestion(BaseModel):
    question: str
    topic: str
    suggested_answer: str
    points: int = 3

class QuickExam(BaseModel):
    true_false_questions: Optional[List[TrueFalseQuestion]] = Field(default_factory=list)
    multiple_choice_questions: Optional[List[MultipleChoiceQuestion]] = Field(default_factory=list)
    open_ended_questions: Optional[List[OpenEndedQuestion]] = Field(default_factory=list)