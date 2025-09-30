from typing import Literal, Union, List, Optional

from pydantic import BaseModel


class KeyConceptResponse(BaseModel):
    id: int
    type: Literal["key_concept"]
    topic_node_id: str
    concept_title: str
    concept_explanation: str

    class Config:
        from_attributes = True


class PracticeProblemResponse(BaseModel):
    id: int
    type: Literal["practice_problem"]
    topic_node_id: str
    problem_title: str
    problem_description: str
    hint: Optional[str]

    class Config:
        from_attributes = True


AnyStudyResourceResponse = Union[KeyConceptResponse, PracticeProblemResponse]


class StudyCardWithResourcesResponse(BaseModel):
    resources: List[AnyStudyResourceResponse]

    class Config:
        from_attributes = True


class ResourcesBySubtopicsRequest(BaseModel):
    study_card_id: int
    subtopic_names: List[str]
