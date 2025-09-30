import os
from fastapi import APIRouter, HTTPException

from ai.schemas.problem_practice import ProblemGenerationParams, PracticeProblemOutput
from ai.services.problem_practice_service import PracticeProblemService

router = APIRouter()

openai_key = os.getenv("OPENAI_API_KEY")
default_model = os.getenv("DEFAULT_MODEL")
default_temperature = os.getenv("DEFAULT_TEMPERATURE")
problem_service = PracticeProblemService(openai_key, default_model, default_temperature)

@router.post(
    "/generate-single",
    response_model=PracticeProblemOutput,
    summary="Generate a single Practice Problem for a topic"
)
def generate_single_problem_endpoint(params: ProblemGenerationParams):
    """
    This endpoint is called by the main backend to generate one practice problem
    based on the provided context.
    """
    try:
        return problem_service.create_single_problem(params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))