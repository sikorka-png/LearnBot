from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey

from app.core.database import Base


class UsageStats(Base):
    __tablename__ = "usage_stats"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    period_start = Column(DateTime, default=datetime.utcnow)
    period_end = Column(DateTime, nullable=False)

    chat_messages = Column(Integer, default=0)
    chat_groups = Column(Integer, default=0) #stale
    number_of_files = Column(Integer, default=0) #stale
    total_file_mb = Column(Integer, default=0)
    number_of_exams = Column(Integer, default=0) #stale
    number_of_generated_questions = Column(Integer, default=0)
    generated_study_cards = Column(Integer, default=0)
    study_sessions = Column(Integer, default=0)
    number_of_notes = Column(Integer, default=0) #stale
    number_of_generating_notes = Column(Integer, default=0)
    number_of_enhance_notes = Column(Integer, default=0)
