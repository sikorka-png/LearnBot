from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    customer_id = Column(String, unique=True, nullable=True)

    files = relationship("File", back_populates="owner")
    notes = relationship("Note", back_populates="owner")
    exams = relationship("Exam", back_populates="owner")
    chat_groups = relationship("ChatGroup", back_populates="user", cascade="all, delete-orphan")
    exam_attempts = relationship("ExamAttempt", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user")
    flashcard_sets = relationship("FlashcardSet", back_populates="user")
