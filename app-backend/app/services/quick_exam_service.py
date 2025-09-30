import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.schemas.quick_exam import QuickExamRequest
from app.models.study_card import StudyCard

AI_ENGINE_URL = "http://ai-engine:8000"


async def generate_quick_exam_from_ai(db: Session, user_id: int, request: QuickExamRequest):
    """
    Orkiestruje proces generowania Quick Exam:
    1. Pobiera knowledge_tree z bazy danych.
    2. Wywołuje ai-engine z kompletem danych.
    3. Zwraca wynik.
    """
    study_card = db.query(StudyCard).filter(
        StudyCard.id == request.study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not study_card:
        raise HTTPException(status_code=404, detail="Study Card not found.")

    if not study_card.knowledge_tree:
        raise HTTPException(status_code=400, detail="Knowledge tree for this Study Card has not been generated yet.")

    payload = {
        "user_id": user_id,
        "knowledge_tree": study_card.knowledge_tree,
        "topics": request.topics
    }
    print(payload)
    timeout = httpx.Timeout(300.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(f"{AI_ENGINE_URL}/quick_exam/generate", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.ReadTimeout:
            raise HTTPException(status_code=504, detail="AI service timed out.")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"AI service error: {e.response.text}")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="AI service is unavailable.")