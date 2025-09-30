from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.decorators.token import get_current_user_from_cookie

from app.schemas.focus_study_answer_checker import (
    GradePracticeParams,
    GradePracticeNoteResponse,
)
from app.services.focus_study_answer_checker_service import grade_practice_note_from_ai

router = APIRouter()


@router.post(
    "/practice/grade",
    response_model=GradePracticeNoteResponse,
    summary="Grade a practice problem answer and return a compact note"
)
async def grade_practice_note(
    request: GradePracticeParams,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie),
):
    """
    Forwards the user's practice answer to the AI engine and returns a compact three-line note:
    Good / Needs work / Comment.
    The authenticated user's id is enforced server-side.
    """
    try:
        note = await grade_practice_note_from_ai(
            db=db,
            user_id=current_user.id,
            practice_params=request,
        )
        return GradePracticeNoteResponse(
            problem_id=request.problem.id,
            note=note,
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
