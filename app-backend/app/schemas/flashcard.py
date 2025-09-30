import datetime
from typing import List

from pydantic import BaseModel


class FlashcardBase(BaseModel):
    definition: str
    answer: str


class FlashcardGenerateParams(BaseModel):
    study_card_id: int
    name: str
    description: str
    flashcards_needed: int
    topics: List[str]


class FlashcardAppendParams(BaseModel):
    study_card_id: int
    flashcards_needed: int
    topics: List[str]


class Flashcard(FlashcardBase):
    id: int
    flashcard_set_id: int

    class Config:
        from_attributes = True


class FlashcardSetResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: str
    source_filenames: List[str]
    created_at: datetime.datetime
    flashcards: List[Flashcard]

    class Config:
        from_attributes = True


class FlashcardDataIn(BaseModel):
    definition: str
    answer: str
