from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.decorators.token import get_current_user_from_cookie

from app.schemas.quick_exam import QuickExamRequest, QuickExamResponse
from app.services.quick_exam_service import generate_quick_exam_from_ai
from app.models.user import User

router = APIRouter()

@router.post(
    "/",
    response_model=QuickExamResponse,
    summary="Generate a Quick Exam"
)
async def create_quick_exam_endpoint(
    request: QuickExamRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Generuje "Quick Exam" na podstawie wybranych podtematów z danej karty nauki.
    """
    exam_data = await generate_quick_exam_from_ai(
        db=db, user_id=current_user.id, request=request
    )
    return exam_data