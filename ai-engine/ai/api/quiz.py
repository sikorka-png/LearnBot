import os

from dotenv import load_dotenv
from fastapi import APIRouter

from ai.schemas.quiz import QuizGenerateParams, QuestionList, QuizFromTreeParams
from ai.services.quiz_service import QuizService

router = APIRouter()
load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
if not openai_key:
    raise ValueError(
        "OpenAI API key not found. Please add OPENAI_API_KEY_TEG to your config/.env file."
    )
default_model = os.getenv("DEFAULT_MODEL")
default_temperature = os.getenv("DEFAULT_TEMPERATURE")

quiz_service = QuizService(openai_key, default_model, default_temperature)


@router.post("/")
def generate_quiz(quiz_params: QuizFromTreeParams):
    quiz = quiz_service.generate_quiz(quiz_params)
    return {"quiz": quiz}
