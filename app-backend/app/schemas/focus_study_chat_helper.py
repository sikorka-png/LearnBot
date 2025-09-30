from pydantic import BaseModel


class FocusStudyChatRequest(BaseModel):
    study_card_id: int
    user_message: str
    session_id: str


class FocusStudyChatResponse(BaseModel):
    response: str
