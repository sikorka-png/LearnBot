from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)
    question = Column(String, nullable=False)
    options = Column(JSON, nullable=True)
    correct_answer = Column(JSON, nullable=False)
    points = Column(Integer, default=1)

    exam_id = Column(Integer, ForeignKey("exams.id"))
    exam = relationship("Exam", back_populates="questions")
