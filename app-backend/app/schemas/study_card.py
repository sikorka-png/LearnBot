from pydantic import BaseModel, Field

from typing import List, Optional, Dict, Any
from .file import FileOut
from .focus_study import AnyStudyResourceResponse


class StudyCardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str
    materials: List[str]


class StudyCardBase(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: str

    class Config:
        from_attributes = True


class StudyCardResponse(BaseModel):
    id: int
    name: str
    description: str
    color: str
    materials: List[str]
    knowledge_tree_status: str
    focus_study_status: str


class StudyCardResponseTmp(StudyCardBase):
    files: List[FileOut] = []
    knowledge_tree: Optional[Dict[str, Any]]
    resources: List[AnyStudyResourceResponse] = []


class UpdateMasteryByTopicNameRequest(BaseModel):
    study_card_id: int
    topic: str = Field
    subtopic: str = Field
    mastery_level: int


class KnowledgeTreeResponse(BaseModel):
    knowledge_tree: Optional[Dict[str, Any]]


class KnowledgeTreeStatusResponse(BaseModel):
    knowledge_tree_status: str


class FocusStudyStatusResponse(BaseModel):
    focus_study_status: str
