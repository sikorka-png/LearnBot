from fastapi import APIRouter, Depends, HTTPException
from requests import Session

from app.core.database import get_db
from app.decorators.check_usage_limit import check_usage_limit
from app.decorators.token import get_current_user_from_cookie
from app.models.user import User
from app.schemas.quiz import QuizGenerateParams, QuestionList, QuizResults, QuizSubmission
from app.services.knowledge_tree_service import update_knowledge_tree_from_quiz
from app.services.quiz_service import generate_quiz_from_ai

router = APIRouter()


@router.post("/", response_model=QuestionList)
@check_usage_limit("chat_messages", "max_chat_messages")
async def create_quiz_endpoint(
        quiz_params: QuizGenerateParams,
        current_user: User = Depends(get_current_user_from_cookie),
        db: Session = Depends(get_db)
):
    quiz_data = await generate_quiz_from_ai(db, current_user.id, quiz_params)
    return quiz_data


@router.post("/results")
async def results_quiz_endpoint(
        submission: QuizSubmission,
        current_user: User = Depends(get_current_user_from_cookie),
        db: Session = Depends(get_db)
):
    """
       Przyjmuje wyniki quizu i aktualizuje postępy użytkownika w drzewie wiedzy.
    """
    try:
        update_knowledge_tree_from_quiz(
            db=db,
            user_id=current_user.id,
            submission=submission
        )
        return {'message': 'Progress updated successfully'}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR updating knowledge tree: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")
