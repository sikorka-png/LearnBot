# from typing import List
#
# from pydantic import BaseModel
#
# class KeyConceptResponse(BaseModel):
#     """Schemat Pydantic reprezentujący jeden kluczowy koncept w odpowiedzi API."""
#     id: int
#     topic_node_id: str
#     concept_title: str
#     concept_explanation: str
#
#     class Config:
#         orm_mode = True
#
# class ConceptsByTitlesRequest(BaseModel):
#     study_card_id: int
#     concept_titles: List[str]