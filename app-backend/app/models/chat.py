from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from app.core.database import Base


class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    group_id = Column(Integer, ForeignKey("chat_groups.id"))
    group = relationship("ChatGroup", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
