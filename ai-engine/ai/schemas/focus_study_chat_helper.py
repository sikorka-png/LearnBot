from pydantic import BaseModel
from typing import List

class FocusStudyHelperParams(BaseModel):
    user_id: int
    user_message: str
    session_id: str
    sources: List[str]

class ChatResponse(BaseModel):
    response: str