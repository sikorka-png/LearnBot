from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    human_message: str
    session_id: str
    user_id: int
    system_message: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    filenames: List[str]
    internet_connection: bool


class ChatResponse(BaseModel):
    response: str  # Changed 'reply' to 'response' to match the actual return from the chat endpoint
