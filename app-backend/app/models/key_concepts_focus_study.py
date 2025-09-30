# from sqlalchemy import Column, Integer, String, Text, ForeignKey
# from sqlalchemy.orm import relationship
# from app.core.database import Base
#
# class KeyConcept(Base):
#     __tablename__ = "key_concepts"
#
#     id = Column(Integer, primary_key=True, index=True)
#
#     study_card_id = Column(Integer, ForeignKey("study_cards.id"), nullable=False, index=True)
#     study_card = relationship("StudyCard", back_populates="concepts")
#
#     topic_node_id = Column(String, nullable=False, index=True)
#
#     concept_title = Column(String, nullable=False)
#     concept_explanation = Column(Text, nullable=False)