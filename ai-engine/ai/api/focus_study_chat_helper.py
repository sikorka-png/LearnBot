import os

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

from ai.schemas.chat import ChatResponse
from ai.schemas.focus_study_chat_helper import FocusStudyHelperParams
from ai.services.focus_study_chat_helper_service import FocusStudyChatHelperService

router = APIRouter()
load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
if not openai_key:
    raise ValueError(
        "OpenAI API key not found. Please add OPENAI_API_KEY_TEG to your config/.env file."
    )
default_model = os.getenv("DEFAULT_MODEL")
default_temperature = os.getenv("DEFAULT_TEMPERATURE")

focus_study_helper = FocusStudyChatHelperService(
    api_key=openai_key,
    default_model=default_model,
    default_temperature=default_temperature
)


@router.post(
    "/chat",
    response_model=ChatResponse
)
def focus_study_chat(
        params: FocusStudyHelperParams
):
    try:
        response_text = focus_study_helper.clarify_question(params)

        return ChatResponse(response=response_text)

    except Exception as e:
        print(f"Error in /focus-study/chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"An internal AI engine error occurred: {str(e)}")