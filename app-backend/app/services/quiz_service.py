import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session


from app.models.study_card import StudyCard
from app.models.usage_stat import UsageStats
from app.schemas.quiz import QuizGenerateParams


async def generate_quiz_from_ai(db: Session, user_id, quiz_params: QuizGenerateParams):
    timeout = httpx.Timeout(300.0, connect=10.0)
    study_card = db.query(StudyCard).filter(
        StudyCard.id == quiz_params.study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not study_card:
        raise HTTPException(status_code=404, detail="Study Card not found.")

    if not study_card.knowledge_tree:
        raise HTTPException(status_code=400, detail="Knowledge tree for this Study Card has not been generated yet.")

    payload = {
        "user_id": user_id,
        "knowledge_tree": study_card.knowledge_tree,
        "total_questions_needed": quiz_params.total_questions_needed,
        "topics": quiz_params.topics
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                f"http://ai-engine:8000/quiz/",
                json=payload
            )

            response.raise_for_status()

            usage_stats = db.query(UsageStats) \
                .filter_by(user_id=user_id) \
                .first()
            usage_stats.study_sessions += 1

            db.commit()

            return response.json()["quiz"]

        except httpx.ReadTimeout:
            raise HTTPException(status_code=504, detail="The AI service took too long to respond.")

        except httpx.HTTPStatusError as exc:
            error_details = exc.response.text
            raise HTTPException(status_code=502, detail=f"The AI service returned an error: {error_details}")

        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail="The AI service is currently unavailable.")