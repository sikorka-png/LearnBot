import datetime

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class FlashcardSet(Base):
    """
    Represents a collection of flashcards generated from a specific set of files
    at a specific time.
    """
    __tablename__ = "flashcard_sets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    source_filenames = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="flashcard_sets")
    flashcards = relationship("Flashcard", back_populates="flashcard_set", cascade="all, delete-orphan",
                              order_by="Flashcard.id")


class Flashcard(Base):
    """
    Represents a single flashcard with a definition/question and an answer.
    """
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    definition = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    flashcard_set_id = Column(Integer, ForeignKey("flashcard_sets.id"), nullable=False)

    flashcard_set = relationship("FlashcardSet", back_populates="flashcards")
