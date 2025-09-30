from enum import Enum as PyEnum

from sqlalchemy import Column, Integer, String, ForeignKey, Table, JSON, Enum
from sqlalchemy.orm import relationship

from app.core.database import Base

study_card_files_association = Table(
    'study_card_files', Base.metadata,
    Column('study_card_id', Integer, ForeignKey('study_cards.id'), primary_key=True),
    Column('file_id', Integer, ForeignKey('files.id'), primary_key=True)
)


class TreeStatus(str, PyEnum):
    pending = "pending"
    ready = "ready"


class FocusStudyStatus(str, PyEnum):
    pending = "pending"
    ready = "ready"


class StudyCard(Base):
    __tablename__ = "study_cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    color = Column(String, nullable=False, default="Blue")

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User")

    knowledge_tree_status = Column(Enum(TreeStatus), default=TreeStatus.pending, nullable=False)
    focus_study_status = Column(Enum(FocusStudyStatus), default=TreeStatus.pending, nullable=False)
    knowledge_tree = Column(JSON, nullable=True)

    files = relationship(
        "File",
        secondary=study_card_files_association,
        back_populates="study_cards"
    )
    resources = relationship(
        "FocusStudy",
        back_populates="study_card",
        cascade="all, delete-orphan"
    )
