from typing import List

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.decorators.check_usage_limit import check_usage_limit
from app.decorators.token import get_current_user_from_cookie
from app.exceptions.exam_exception import AttemptNotFoundException
from app.models.usage_stat import UsageStats
from app.models.user import User
from app.schemas.chat import TmpMessageOut
from app.schemas.exam import ExamGenerateParams, GeneratedQuestion, ExamCreateSchema, ExamOut, UserMessage
from app.schemas.exam import QuestionSchema, \
    ExamAttemptSchema, ExamAttemptOut, ExamTextAnswerCheck, AiResponse
from app.services.exam_service import generate_questions, save_user_exam, get_user_exams
from app.services.exam_service import get_user_exam_with_id, \
    delete_exam_wit_id, edit_user_exam, edit_exam_question, delete_exam_question, save_attempt, get_user_attempts, \
    get_user_attempt_by_id, handle_attempt_question_feedback, check_user_text_answer

router = APIRouter()


@router.post("/", response_model=List[GeneratedQuestion])
@check_usage_limit("number_of_generated_questions", "max_number_of_generated_questions")
async def generate_exam_questions(
        exam_params: ExamGenerateParams,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    questions = await generate_questions(current_user.id, exam_params)

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=current_user.id) \
        .first()
    usage_stats.number_of_generated_questions += exam_params.num_of_questions

    db.commit()

    return questions


@router.post("/create", response_model=ExamOut)
@check_usage_limit("number_of_exams", "max_number_of_exams")
def save_exam(
        exam_data: ExamCreateSchema,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    exam = save_user_exam(db, exam_data, current_user.id)
    return exam


@router.get("/my", response_model=List[ExamOut])
def get_exams(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    exams = get_user_exams(db, current_user.id)
    return exams


@router.patch("/edit/{exam_id}", response_model=ExamOut)
def update_notes(
        exam_id: int,
        exam_data: ExamCreateSchema,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    exam = edit_user_exam(db, current_user.id, exam_id, exam_data)
    return exam


@router.patch("/question/{question_id}")
def edit_question(
        question_id: int,
        question_data: QuestionSchema,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    edit_exam_question(db, current_user.id, question_id, question_data)
    return {"message": "Question edited"}


@router.delete("/question/{question_id}")
def delete_question(
        question_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    delete_exam_question(db, current_user.id, question_id)
    return {"message": "Question deleted"}


@router.delete("/delete/{exam_id}")
def delete_notes(
        exam_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    delete_exam_wit_id(db, current_user.id, exam_id)
    return {"message": "Exam deleted"}


@router.post("/attempt")
def save_exam_attempt(
        attempt: ExamAttemptSchema,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    attempt_id = save_attempt(db, current_user.id, attempt)
    return {"attempt_id": attempt_id}


@router.get("/attempts", response_model=List[ExamAttemptOut])
def get_attempts(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    attempts = get_user_attempts(db, current_user.id)
    return attempts


@router.get("/attempt/{attempt_id}", response_model=ExamAttemptOut)
def get_attempt_by_id(
        attempt_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    attempt = get_user_attempt_by_id(db, current_user.id, attempt_id)
    return attempt


@router.get("/{exam_id}", response_model=ExamOut)
def get_exams(
        exam_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    exam = get_user_exam_with_id(db, current_user.id, exam_id)
    return exam


@router.post("/check", response_model=List[AiResponse])
async def save_exam_attempt(
        attempt: ExamTextAnswerCheck,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    response = await check_user_text_answer(db, current_user.id, attempt)
    return response


@router.post("/attempt/{attempt_id}/question/{question_index}/feedback", response_model=TmpMessageOut)
async def post_attempt_question_feedback(
        attempt_id: int,
        question_index: int,
        user_message: UserMessage,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    try:
        ai_response = await handle_attempt_question_feedback(
            db=db,
            attempt_id=attempt_id,
            question_index=question_index,
            message=user_message.message,
            user_id=current_user.id
        )
        return ai_response
    except AttemptNotFoundException:
        raise HTTPException(status_code=404, detail="Attempt not found or you do not have permission to view it.")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail="An internal error occurred.")
