# from typing import List
#
# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
#
# from app.core.database import get_db
# from app.decorators.token import get_current_user_from_cookie
# from app.models.user import User
# from app.schemas.key_concept import KeyConceptResponse, ConceptsByTitlesRequest
# from app.services import key_concept_service
#
# router = APIRouter()
#
# @router.get(
#     "/{study_card_id}",
#     response_model=List[KeyConceptResponse],
#     summary="Get all Key Concepts for a specific Study Card"
# )
# def get_concepts_by_study_card_id(
#     study_card_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user_from_cookie)
# ):
#     """
#     Retrieves a list of all key concepts associated with a given study_card_id.
#     Ensures that the user requesting the concepts is the owner of the study card.
#     """
#     concepts = key_concept_service.get_concepts_for_study_card(
#         db=db,
#         user_id=current_user.id,
#         study_card_id=study_card_id
#     )
#     return concepts
#
#
# @router.get(
#     "/",
#     response_model=List[KeyConceptResponse],
#     summary="Get all Key Concepts for the current user"
# )
# def get_all_concepts_for_user(
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user_from_cookie)
# ):
#     """
#     Retrieves a list of all key concepts from all study cards
#     belonging to the currently authenticated user.
#     """
#     concepts = key_concept_service.get_all_user_concepts(
#         db=db,
#         user_id=current_user.id
#     )
#     return concepts
#
#
# @router.post(
#     "/by-titles",
#     response_model=List[KeyConceptResponse],
#     summary="Get specific Key Concepts by a list of titles"
# )
# def get_specific_concepts_by_titles(
#     request_body: ConceptsByTitlesRequest,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user_from_cookie)
# ):
#     """
#     Retrieves a filtered list of key concepts for a specific study card,
#     based on a provided list of concept titles.
#     """
#     concepts = key_concept_service.get_concepts_by_titles(
#         db=db,
#         user_id=current_user.id,
#         request=request_body
#     )
#     return concepts