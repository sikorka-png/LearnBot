from typing import List, Optional

from pydantic import BaseModel


class FlashcardGenerateParams(BaseModel):
    user_id: int
    filenames: List[str]
    flashcards_needed: int
    topics: Optional[str] = None


class Flashcard(BaseModel):
    definition: str
    answer: str


class FlashcardResponse(BaseModel):
    flashcards: List[Flashcard]
