# from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
# from sqlalchemy.orm import relationship
# from sqlalchemy.sql import func
# from app.core.database import Base
#
# class KnowledgeTree(Base):
#     __tablename__ = "knowledge_trees"
#
#     id = Column(Integer, primary_key=True, index=True)
#
#     name = Column(String, index=True, nullable=False)
#
#     user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
#     user = relationship("User")
#
#     # Możesz też powiązać drzewo z konkretnym plikiem/plikami
#     # file_id = Column(Integer, ForeignKey("files.id"))
#
#     tree_data = Column(JSON, nullable=False)
#
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), onupdate=func.now())