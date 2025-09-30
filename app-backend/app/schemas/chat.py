from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ChatRequest(BaseModel):
    human_message: str
    system_message: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None


class ChatResponse(BaseModel):
    response: str


class ChatGroupOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    color: str
    materials: List[str]
    chatCount: int
    internetConnection: bool

    class Config:
        from_attributes = True


class ChatGroupCreate(BaseModel):
    name: str
    description: str | None = None
    color: str
    materials: List[str]
    internetConnection: bool


class ChatSessionOut(BaseModel):
    id: str
    title: str
    groupId: str
    groupName: str
    lastMessage: Optional[str]
    timestamp: datetime
    messageCount: int


class RoleEnum(str, Enum):
    user = "user"
    assistant = "assistant"


class MessageIn(BaseModel):
    content: str
    group_id: int
    chat_id: int | None = None


class MessageOut(BaseModel):
    id: int
    content: str
    role: RoleEnum
    date: str
    chat_id: int


class TmpMessageIn(BaseModel):
    message_in: str


class TmpMessageOut(BaseModel):
    id: int
    content: str
    role: RoleEnum
    date: str
