import httpx
from sqlalchemy.orm import Session

from app.models.study_card import StudyCard
from app.models.user import User
from app.schemas.focus_study_chat_helper import FocusStudyChatRequest
from app.exceptions.study_card_exception import StudyCardNotFoundException

AI_ENGINE_URL = "http://ai-engine:8000"

def get_assistant_response(db: Session, user_id: int, request: FocusStudyChatRequest) -> str:
    """
    Pośredniczy w rozmowie między użytkownikiem a asystentem AI.
    """
    study_card = db.query(StudyCard).filter(
        StudyCard.id == request.study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not study_card:
        raise StudyCardNotFoundException(
            f"Study card with id {request.study_card_id} not found or you don't have permission to access it."
        )

    source_filenames = [file.filename for file in study_card.files]
    if not source_filenames:
        return "I can't answer questions because no source materials are attached to this study card."

    ai_payload = {
        "user_id": user_id,
        "user_message": request.user_message,
        "session_id": request.session_id,
        "sources": source_filenames
    }

    api_endpoint = f"{AI_ENGINE_URL}/focus_study_helper/chat"
    try:
        with httpx.Client() as client:
            response = client.post(api_endpoint, json=ai_payload, timeout=120.0)
            response.raise_for_status()

            return response.json().get("response", "Sorry, I received an empty response.")

    except httpx.HTTPStatusError as e:
        error_detail = e.response.json().get("detail", "Unknown AI engine error")
        print(f"AI Engine returned an error: {e.response.status_code} - {error_detail}")
        raise Exception(f"The AI assistant failed to respond: {error_detail}")
    except Exception as e:
        print(f"An unexpected error occurred while contacting AI engine: {e}")
        raise Exception("An unexpected error occurred while trying to reach the AI assistant.")


