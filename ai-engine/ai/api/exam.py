import os

from dotenv import load_dotenv
from fastapi import APIRouter

from ai.schemas.exam import ExamGenerateParams, QuestionClarificationPayload, TextQuestion
from ai.services.exam_service import ExamService

router = APIRouter()
load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
if not openai_key:
    raise ValueError(
        "OpenAI API key not found. Please add OPENAI_API_KEY_TEG to your config/.env file."
    )
default_model = os.getenv("DEFAULT_MODEL")
default_temperature = os.getenv("DEFAULT_TEMPERATURE")

exam_service = ExamService(
    api_key=openai_key,
    default_model=default_model,
    default_temperature=default_temperature
)


@router.post("/")
def generate_questions(exam_params: ExamGenerateParams):
    questions = exam_service.generate_questions(exam_params)
    return {"questions": questions}


@router.post("/question/clarify")
def handle_clarification(payload: QuestionClarificationPayload):
    """
    Receives a clarification request from the main backend,
    processes it with the clarification agent, and returns the AI's response.
    """
    response_text = exam_service.clarify_question(payload)
    return {"response": response_text}


@router.post("/check")
def check_answer(question: TextQuestion):
    answer = exam_service.check_answer(question)
    return {"answer": answer}
