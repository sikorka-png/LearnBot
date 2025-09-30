from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, index=True)
    exam_title = Column(String)
    completed_at = Column(DateTime, default=datetime.utcnow)
    score = Column(Integer)
    total_points = Column(Integer)
    percentage = Column(Integer)
    correct_answers = Column(Integer)
    total_questions = Column(Integer)
    time_spent = Column(Integer)
    questions = Column(JSON)
    sources = Column(JSON)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="exam_attempts")
