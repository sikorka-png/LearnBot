import os

from dotenv import load_dotenv
from fastapi import APIRouter

from ai.schemas.flashcard import FlashcardGenerateParams
from ai.services.flashcard_service import FlashcardService

router = APIRouter()
load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
if not openai_key:
    raise ValueError(
        "OpenAI API key not found. Please add OPENAI_API_KEY_TEG to your config/.env file."
    )
default_model = os.getenv("DEFAULT_MODEL")
default_temperature = os.getenv("DEFAULT_TEMPERATURE")

flashcard_service = FlashcardService(openai_key, default_model, default_temperature)


@router.post("/")
def generate_quiz(flashcard_params: FlashcardGenerateParams):
    flashcard_response = flashcard_service.generate_flashcard(flashcard_params)
    return flashcard_response
