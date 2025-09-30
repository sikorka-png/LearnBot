import os
import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.usage_stat import UsageStats
from app.schemas.focus_study_answer_checker import GradePracticeParams

AI_ENGINE_BASE_URL = os.getenv("AI_ENGINE_BASE_URL", "http://ai-engine:8001")
AI_ENGINE_TIMEOUT_S = float(os.getenv("AI_ENGINE_TIMEOUT_S", "300"))
AI_ENGINE_CONNECT_TIMEOUT_S = float(os.getenv("AI_ENGINE_CONNECT_TIMEOUT_S", "10"))

async def grade_practice_note_from_ai(
    db: Session,
    user_id: int,
    practice_params: GradePracticeParams
) -> str:
    """
    Sends the practice grading request to the AI service and returns a single feedback note string.
    Mirrors the structure and error handling of generate_quiz_from_ai.
    """

    cleaned_sources = None
    if practice_params.problem.sources:
        cleaned_sources = [s for s in practice_params.problem.sources if s] or None

    payload = {
        "user_id": user_id,
        "problem": {
            "id": practice_params.problem.id,
            "type": practice_params.problem.type,
            "topic_node_id": practice_params.problem.topic_node_id,
            "problem_title": practice_params.problem.problem_title,
            "problem_description": practice_params.problem.problem_description,
            "hint": practice_params.problem.hint,
            "sources": cleaned_sources,
        },
        "user_answer": practice_params.user_answer,
    }

    timeout = httpx.Timeout(
        AI_ENGINE_TIMEOUT_S,
        connect=AI_ENGINE_CONNECT_TIMEOUT_S,
    )

    ai_url = "http://ai-engine:8000/focus_study_answer/grade"

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.post(ai_url, json=payload)
            resp.raise_for_status()

            usage_stats = db.query(UsageStats).filter_by(user_id=user_id).first()
            if usage_stats:
                usage_stats.study_sessions += 1
                db.commit()

            data = resp.json()
            return data["note"]

        except httpx.ReadTimeout:
            raise HTTPException(status_code=504, detail="The AI service took too long to respond.")
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"The AI service returned an error: {exc.response.text}"
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"The AI service is currently unavailable (connect error to {ai_url}): {exc}"
            )
