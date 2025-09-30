from sqlalchemy import Column, Integer, String, Boolean

from app.core.database import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    #chat
    max_chat_messages = Column(Integer, nullable=True)
    max_chat_groups = Column(Integer, nullable=True)

    #materials
    max_number_of_files = Column(Integer, nullable=True)
    max_total_file_mb = Column(Integer, nullable=True)

    #exam_mode
    max_number_of_exams = Column(Integer, nullable=True)
    max_number_of_generated_questions = Column(Integer, nullable=True)

    #study_mode
    max_generated_study_cards = Column(Integer, nullable=True)
    max_study_sessions = Column(Integer, nullable=True)

    #notes
    max_number_of_notes = Column(Integer, nullable=True)
    max_number_of_generating_notes = Column(Integer, nullable=True)
    max_number_of_enhance_notes = Column(Integer, nullable=True)
