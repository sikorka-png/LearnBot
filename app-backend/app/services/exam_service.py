import asyncio
import httpx
import logging
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.exceptions.exam_exception import ExamNotFoundException, QuestionNotFoundException, AttemptNotFoundException
from app.models.exam import Exam
from app.models.exam_attempt import ExamAttempt
from app.models.exam_question import ExamQuestion
from app.models.tmp_message import TmpMessage, RoleEnum
from app.models.usage_stat import UsageStats
from app.schemas.chat import TmpMessageOut
from app.schemas.exam import ExamGenerateParams, ExamCreateSchema, QuestionSchema, ExamAttemptSchema, \
    ExamTextAnswerCheck, AiResponse

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)


async def generate_questions(user_id: int, exam_params: ExamGenerateParams):
    timeout = httpx.Timeout(6000.0, connect=100.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                f"http://ai-engine:8000/exam/",
                json={
                    **exam_params.dict(),
                    "user_id": user_id
                }
            )

            response.raise_for_status()
            return response.json()["questions"]

        except httpx.ReadTimeout:
            print("ERROR: Timeout occurred while waiting for ai-engine.")
            raise HTTPException(status_code=504, detail="The AI service took too long to respond.")

        except httpx.HTTPStatusError as exc:
            print(f"ERROR: HTTP error from ai-engine: {exc.response.status_code}")
            print(f"ERROR: Response body: {exc.response.text}")
            raise HTTPException(status_code=503, detail="The AI service returned an error.")

        except httpx.RequestError as exc:
            print(f"ERROR: Could not connect to ai-engine. Details: {exc}")
            raise HTTPException(status_code=503, detail="The AI service is currently unavailable.")

        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            raise HTTPException(status_code=500,
                                detail="An unexpected error occurred while communicating with the AI service.")


def save_user_exam(db: Session, exam_data: ExamCreateSchema, user_id: int):
    exam = Exam(
        user_id=user_id,
        title=exam_data.title,
        description=exam_data.description,
        time_limit=exam_data.time_limit,
        sources=exam_data.sources
    )
    db.add(exam)
    db.flush()

    for q in exam_data.questions:
        question = ExamQuestion(
            exam_id=exam.id,
            type=q.type,
            question=q.question,
            options=q.options,
            correct_answer=q.correct_answer,
            points=q.points
        )
        db.add(question)

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=user_id) \
        .first()
    usage_stats.number_of_exams += 1

    db.commit()

    return exam


def get_user_exams(db: Session, user_id: int):
    exams = (
        db.query(
            Exam.id,
            Exam.title,
            Exam.description,
            Exam.time_limit,
            Exam.created_at,
            func.count(ExamQuestion.id).label("num_of_questions"),
            func.coalesce(func.sum(ExamQuestion.points), 0).label("points")
        )
        .outerjoin(Exam.questions)
        .filter(Exam.user_id == user_id)
        .group_by(Exam.id)
        .all()
    )
    return exams


async def handle_attempt_question_feedback(db: Session, attempt_id: int, question_index: int, message: str,
                                           user_id: int):
    """
    Handles feedback for a question from a historical exam attempt,
    using the data stored within the attempt itself.
    """
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == user_id
    ).first()

    if not attempt:
        raise AttemptNotFoundException()

    questions_list = attempt.questions
    if not isinstance(questions_list, list) or not (0 <= question_index < len(questions_list)):
        raise HTTPException(status_code=404,
                            detail=f"Question index {question_index} is out of bounds for this attempt.")

    question_data = questions_list[question_index]
    original_question_text = question_data.get("question")

    if not original_question_text:
        raise HTTPException(status_code=404, detail="Question data is corrupt or missing in the attempt record.")

    session_id = f"clarify_attempt_{user_id}_{attempt_id}_{question_index}"

    sources = attempt.sources
    # sources = sources_row[0] if sources_row else None

    ai_payload = {
        "user_id": user_id,
        "original_question": original_question_text,
        "user_message": message,
        "session_id": session_id,
        "all_possible_questions": question_data.get("options"),
        "correct_answers": question_data.get("correctAnswer") if isinstance(question_data.get("correctAnswer"),
                                                                            list) else [
            question_data.get("correctAnswer")],
        "user_answers": question_data.get("userAnswer") if isinstance(question_data.get("userAnswer"), list) else [
            question_data.get("userAnswer")],
        "sources": sources
    }

    logger.log(1, ai_payload)

    timeout = httpx.Timeout(120.0, connect=20.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                "http://ai-engine:8000/exam/question/clarify",
                json=ai_payload
            )

            response.raise_for_status()

            response_ai_msg = response.json()["response"]

            user_msg = TmpMessage(
                content=message,
                role=RoleEnum.user,
                attempt_id=attempt_id,
                user_id=user_id
            )
            db.add(user_msg)

            ai_msg = TmpMessage(
                content=response_ai_msg,
                role=RoleEnum.assistant,
                attempt_id=attempt_id,
                user_id=user_id
            )
            db.add(ai_msg)

            db.commit()
            db.refresh(user_msg)
            db.refresh(ai_msg)

            return TmpMessageOut(
                id=ai_msg.id,
                content=ai_msg.content,
                role=ai_msg.role,
                date=ai_msg.date.isoformat()
            )
        except httpx.ReadTimeout:
            raise HTTPException(status_code=504, detail="The AI clarification service took too long to respond.")
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=503, detail=f"The AI service returned an error: {exc.response.text}")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="The AI clarification service is currently unavailable.")


def get_user_exam_with_id(db: Session, user_id: int, exam_id: int):
    exam = db.query(Exam) \
        .filter(Exam.user_id == user_id, Exam.id == exam_id) \
        .first()
    return exam


def edit_user_exam(db: Session, user_id: int, exam_id: int, exam_data: ExamCreateSchema):
    exam = db.query(Exam) \
        .filter(Exam.user_id == user_id, Exam.id == exam_id) \
        .first()
    if not exam:
        raise ExamNotFoundException()

    exam.title = exam_data.title
    exam.description = exam_data.description
    exam.time_limit = exam_data.time_limit
    if exam_data.sources:
        existing_sources = set(exam.sources or [])
        new_sources = set(exam_data.sources)
        exam.sources = list(existing_sources.union(new_sources))

    db.flush()

    existing_question_ids = {q.id for q in exam.questions}
    logger.info(f"Existing question IDs in exam {exam.id}: {existing_question_ids}")
    for q in exam_data.questions:
        logger.info(f"Incoming question ID: {getattr(q, 'id', None)} | Text: {q.question}")

        if not hasattr(q, 'id') or q.id is None or q.id not in existing_question_ids:
            question = ExamQuestion(
                exam=exam,
                type=q.type,
                question=q.question,
                options=q.options,
                correct_answer=q.correct_answer,
                points=q.points
            )
            db.add(question)
            logger.info(f"Added new question: '{q.question}' with ID (assigned by DB): [pending]")
        else:
            logger.info(f"Question skipped (already exists): '{q.question}' with ID: {q.id}")

    db.commit()

    return exam


def edit_exam_question(db: Session, user_id: int, question_id: int, question_data: QuestionSchema):
    question = db.query(ExamQuestion) \
        .join(Exam) \
        .filter(
        ExamQuestion.id == question_id,
        Exam.user_id == user_id
    ).first()

    if not question:
        raise QuestionNotFoundException()

    question.question = question_data.question
    question.options = question_data.options
    question.correct_answer = question_data.correct_answer
    question.points = question_data.points
    question.type = question_data.type

    db.commit()


def delete_exam_question(db: Session, user_id: int, question_id: int):
    question = db.query(ExamQuestion) \
        .join(Exam) \
        .filter(
        ExamQuestion.id == question_id,
        Exam.user_id == user_id
    ).first()

    if not question:
        raise QuestionNotFoundException()

    db.delete(question)
    db.commit()


def delete_exam_wit_id(db: Session, user_id: int, exam_id: int):
    exam = db.query(Exam) \
        .filter(Exam.user_id == user_id, Exam.id == exam_id) \
        .first()
    if not exam:
        raise ExamNotFoundException()

    db.delete(exam)

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=user_id) \
        .first()
    usage_stats.number_of_exams -= 1

    db.commit()


def save_attempt(db: Session, user_id: int, attempt: ExamAttemptSchema):
    sources_row = db.query(Exam.sources) \
        .filter(Exam.user_id == user_id, Exam.id == attempt.exam_id) \
        .first()
    sources = sources_row[0] if sources_row else None

    new_attempt = ExamAttempt(
        user_id=user_id,
        exam_title=attempt.exam_title,
        completed_at=attempt.completed_at,
        score=attempt.score,
        total_points=attempt.total_points,
        percentage=attempt.percentage,
        correct_answers=attempt.correct_answers,
        total_questions=attempt.total_questions,
        time_spent=attempt.time_spent,
        questions=attempt.questions,
        sources=sources
    )
    db.add(new_attempt)
    db.commit()

    return new_attempt.id


def get_user_attempts(db: Session, user_id: int):
    return db.query(
        ExamAttempt.id,
        ExamAttempt.exam_title,
        ExamAttempt.completed_at,
        ExamAttempt.score,
        ExamAttempt.total_points,
        ExamAttempt.percentage,
        ExamAttempt.correct_answers,
        ExamAttempt.total_questions,
        ExamAttempt.time_spent
    ) \
        .filter(ExamAttempt.user_id == user_id) \
        .order_by(ExamAttempt.completed_at.desc()) \
        .limit(50) \
        .all()


def get_user_attempt_by_id(db: Session, user_id: int, attempt_id: int):
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == user_id
    ).first()

    if not attempt:
        raise AttemptNotFoundException()

    return attempt


async def check_user_text_answer(db: Session, user_id: int, attempt: ExamTextAnswerCheck):
    sources_row = db.query(Exam.sources) \
        .filter(Exam.user_id == user_id, Exam.id == attempt.exam_id) \
        .first()
    sources = sources_row[0] if sources_row else None

    timeout = httpx.Timeout(6000.0, connect=100.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async def send_question(question):
            try:
                response = await client.post(
                    "http://ai-engine:8000/exam/check",
                    json={
                        "user_id": user_id,
                        "question": question.question,
                        "user_answer": question.user_answer,
                        "correct_answer": question.correct_answer,
                        "sources": sources
                    }
                )
                response.raise_for_status()
                ai_response = response.json()["answer"]

                return AiResponse(
                    question_id=question.question_id,
                    response=ai_response
                )

            except httpx.ReadTimeout:
                raise HTTPException(status_code=504, detail="AI service timed out.")

            except httpx.HTTPStatusError as exc:
                print(f"AI error {exc.response.status_code}: {exc.response.text}")
                raise HTTPException(status_code=503, detail="AI service returned an error.")

            except httpx.RequestError as exc:
                raise HTTPException(status_code=503, detail=f"AI service unavailable: {exc}")

            except Exception as e:
                raise HTTPException(status_code=500, detail="Unexpected error with AI service.")

        tasks = [send_question(q) for q in attempt.questions]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    final_results = []
    for result in results:
        if isinstance(result, AiResponse):
            final_results.append(result)
        else:
            raise Exception(result)

    return final_results
