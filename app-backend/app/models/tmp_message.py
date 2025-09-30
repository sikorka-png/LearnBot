from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Enum as SqlEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class RoleEnum(str, Enum):
    user = "user"
    assistant = "assistant"


class TmpMessage(Base):
    __tablename__ = "tmp_messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    role = Column(SqlEnum(RoleEnum), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
