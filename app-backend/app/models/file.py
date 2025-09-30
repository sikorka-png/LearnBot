from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Enum as SqlEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.chatgroup_file_association import chatgroup_file_table
from app.models.study_card import study_card_files_association


class TypeEnum(str, Enum):
    file = "file"
    url = "url"
    note = "note"


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=False, index=True, nullable=False)
    type = Column(SqlEnum(TypeEnum), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    size = Column(Float, nullable=True)

    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="files")
    chat_groups = relationship("ChatGroup", secondary=chatgroup_file_table, back_populates="files")
    study_cards = relationship(
        "StudyCard",
        secondary=study_card_files_association,
        back_populates="files"
    )

    __table_args__ = (
        UniqueConstraint('filename', 'user_id', name='_filename_user_uc'),
    )