from sqlalchemy.orm import Session

from ai.agents.flashcard_agent import generate_flashcard
from ai.schemas.flashcard import FlashcardGenerateParams


class FlashcardService:
    def __init__(self, api_key, default_model="gpt-4o-mini", default_temperature=0.7):
        self.api_key = api_key
        self.default_model = default_model
        self.default_temperature = float(default_temperature)

    def generate_flashcard(self, flashcard_params: FlashcardGenerateParams, model=None, temperature=None):
        final_model = model or self.default_model
        final_temperature = temperature or self.default_temperature

        flashcards = generate_flashcard(flashcard_params, final_model, final_temperature)
        return flashcards
