from pydantic import BaseModel
from typing import List, Dict, Any

class QuickExamRequest(BaseModel):
    study_card_id: int
    topics: List[str]

class TrueFalseQuestion(BaseModel):
    question: str
    topic: str
    correctAnswer: bool
    points: int

class MultipleChoiceQuestion(BaseModel):
    question: str
    topic: str
    options: List[str]
    correctAnswer: str
    points: int

class OpenEndedQuestion(BaseModel):
    question: str
    topic: str
    suggested_answer: str
    points: int

class QuickExamResponse(BaseModel):
    true_false_questions: List[TrueFalseQuestion]
    multiple_choice_questions: List[MultipleChoiceQuestion]
    open_ended_questions: List[OpenEndedQuestion]