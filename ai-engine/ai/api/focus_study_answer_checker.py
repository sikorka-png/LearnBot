import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

from ai.schemas.focus_study_answer_checker import GradePracticeParams, GradePracticeNoteResponse
from ai.services.focus_study_answer_check_service import PracticeService

router = APIRouter()
load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
if not openai_key:
    raise ValueError("OPENAI_API_KEY missing in .env")

default_model = os.getenv("DEFAULT_MODEL", "gpt-4o-mini")
default_temperature = os.getenv("DEFAULT_TEMPERATURE", "0.2")

practice_service = PracticeService(
    openai_key, default_model=default_model, default_temperature=default_temperature
)

@router.post("/grade", response_model=GradePracticeNoteResponse)
def grade_practice_endpoint(params: GradePracticeParams):
    try:
        note = practice_service.grade_note(params)
        return GradePracticeNoteResponse(problem_id=params.problem.id, note=note)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
