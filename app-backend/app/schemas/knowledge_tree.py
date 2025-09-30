from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime


class KnowledgeTreeBase(BaseModel):
    id: int
    name: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class KnowledgeTreeResponse(KnowledgeTreeBase):
    tree_data: Dict[str, Any]
