import os

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

from ai.schemas.chat import ChatResponse, ChatRequest
from ai.services.chat_service import ChatService

router = APIRouter()
load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
if not openai_key:
    raise ValueError(
        "OpenAI API key not found. Please add OPENAI_API_KEY_TEG to your config/.env file."
    )
default_model = os.getenv("DEFAULT_MODEL")
default_temperature = os.getenv("DEFAULT_TEMPERATURE")

openai_service = ChatService(
    api_key=openai_key,
    default_model=default_model,
    default_temperature=default_temperature
)


@router.post("/chat/answer")
def answer_chat(prompt: str):
    return {"response": f"AI odpowiedź na: {prompt}"}


@router.post("/send/message", response_model=ChatResponse)
async def chat(chat_request: ChatRequest):
    if not chat_request.human_message:
        raise HTTPException(status_code=400, detail="Human message is required")

    if not chat_request.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    human_message = chat_request.human_message
    system_message = chat_request.system_message
    model = chat_request.model if chat_request.model else default_model
    temperature = chat_request.temperature if chat_request.temperature is not None else default_temperature

    response_content = openai_service.get_response(
        human_message=human_message,
        model=model,
        temperature=temperature,
        user_id=chat_request.user_id,
        session_id=chat_request.session_id,
        filenames=chat_request.filenames,
        web_search=chat_request.internet_connection
    )
    print(f"Model: {model}")
    print(f"Human message: {human_message}")
    print(f"System message: {system_message}")
    print(f"Temperature: {temperature}")

    if response_content:
        return ChatResponse(response=response_content)
    else:
        raise HTTPException(status_code=500, detail="Failed to get response from OpenAI")
