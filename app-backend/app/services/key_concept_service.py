# from typing import List
# from sqlalchemy.orm import Session
# from sqlalchemy import and_
#
# from app.models.key_concepts_focus_study import KeyConcept
# from app.exceptions.study_card_exception import StudyCardNotFoundException
# from app.models.study_card import StudyCard
# from app.schemas.key_concept import ConceptsByTitlesRequest
#
#
# def get_concepts_for_study_card(db: Session, user_id: int, study_card_id: int) -> List[KeyConcept]:
#     """
#     Pobiera wszystkie kluczowe koncepty dla konkretnej karty nauki,
#     sprawdzając jednocześnie, czy użytkownik jest jej właścicielem.
#     """
#     study_card = db.query(StudyCard.id).filter(
#         StudyCard.id == study_card_id,
#         StudyCard.user_id == user_id
#     ).first()
#
#     if not study_card:
#         raise StudyCardNotFoundException(
#             f"Study card with id {study_card_id} not found or you don't have permission to access it."
#         )
#
#     concepts = db.query(KeyConcept).filter(KeyConcept.study_card_id == study_card_id).all()
#
#     return concepts
#
#
# def get_all_user_concepts(db: Session, user_id: int) -> List[KeyConcept]:
#     """
#     Pobiera wszystkie kluczowe koncepty ze wszystkich kart nauki należących do użytkownika.
#     """
#     concepts = db.query(KeyConcept).join(StudyCard).filter(StudyCard.user_id == user_id).all()
#
#     return concepts
#
#
# def get_concepts_by_titles(db: Session, user_id: int, request: ConceptsByTitlesRequest) -> List[KeyConcept]:
#     """
#     Pobiera kluczowe koncepty dla konkretnej karty, ale tylko te, które
#     pasują do podanej listy tytułów (concept_titles).
#     """
#     study_card_id = request.study_card_id
#     titles = request.concept_titles
#
#     study_card = db.query(StudyCard.id).filter(
#         StudyCard.id == study_card_id,
#         StudyCard.user_id == user_id
#     ).first()
#
#     if not study_card:
#         raise StudyCardNotFoundException(
#             f"Study card with id {study_card_id} not found or you don't have permission to access it."
#         )
#
#     if not titles:
#         return []
#
#     concepts = db.query(KeyConcept).filter(
#         and_(
#             KeyConcept.study_card_id == study_card_id,
#             KeyConcept.concept_title.in_(titles)
#         )
#     ).all()
#
#     return concepts