from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base



class FocusStudy(Base):
    __tablename__ = "focus_study"

    id = Column(Integer, primary_key=True, index=True)

    type = Column(String(50))
    __mapper_args__ = {
        "polymorphic_on": type,
        "polymorphic_identity": "study_resource",
    }

    study_card_id = Column(Integer, ForeignKey("study_cards.id"), nullable=False, index=True)
    topic_node_id = Column(String, nullable=False, index=True)

    study_card = relationship("StudyCard", back_populates="resources")



class KeyConceptFocus(FocusStudy):
    __tablename__ = None

    concept_title = Column(String, nullable=True)
    concept_explanation = Column(Text, nullable=True)

    __mapper_args__ = {
        "polymorphic_identity": "key_concept",
    }

class PracticeProblemFocus(FocusStudy):
    __tablename__ = None

    problem_title = Column(String, nullable=True)
    problem_description = Column(Text, nullable=True)
    hint = Column(Text, nullable=True)

    __mapper_args__ = {
        "polymorphic_identity": "practice_problem",
    }