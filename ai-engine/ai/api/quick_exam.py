from fastapi import APIRouter
from ai.schemas.quick_exam_sm import QuickExamParams, QuickExam
from ai.agents.quick_exam_agent import generate_quick_exam

router = APIRouter()

@router.post("/generate", response_model=QuickExam)
async def generate_quick_exam_endpoint(params: QuickExamParams):
    return await generate_quick_exam(params, model="gpt-4o-mini", temperature=0.5)