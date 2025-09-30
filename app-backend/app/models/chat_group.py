from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.chatgroup_file_association import chatgroup_file_table


class ChatGroup(Base):
    __tablename__ = "chat_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    color = Column(String, nullable=False)
    internetConnection = Column(Boolean, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="chat_groups")
    chats = relationship("Chat", back_populates="group", cascade="all, delete-orphan")
    files = relationship("File", secondary=chatgroup_file_table, back_populates="chat_groups")