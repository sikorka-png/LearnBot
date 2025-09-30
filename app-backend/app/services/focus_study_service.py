from typing import List, Set, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from app.models.study_card import StudyCard
from app.models.focus_study import FocusStudy, KeyConceptFocus
from app.exceptions.study_card_exception import StudyCardNotFoundException
from app.schemas.focus_study import ResourcesBySubtopicsRequest


def _flatten_tree_for_processing(nodes: list) -> List[Dict[str, Any]]:
    """
    Rekurencyjnie spłaszcza drzewo do listy słowników, gdzie każdy słownik
    reprezentuje węzeł z przypisanymi chunk_ids.
    """
    flat_list = []

    def traverse(sub_nodes: list):
        for node in sub_nodes:
            # Dodajemy do listy tylko węzły, które mają sens (mają chunk_ids)
            if node.get("chunk_ids"):
                flat_list.append(node)

            # Kontynuujemy rekurencyjnie
            if "subtopics" in node and node["subtopics"]:
                traverse(node["subtopics"])

    traverse(nodes)
    return flat_list

# def get_all_resources_for_study_card(db: Session, user_id: int, study_card_id: int) -> List[FocusStudy]:
#     """
#     Pobiera WSZYSTKIE zasoby (wszystkich typów) dla konkretnej karty nauki.
#     """
#     study_card = db.query(StudyCard).filter(
#         StudyCard.id == study_card_id,
#         StudyCard.user_id == user_id
#     ).options(
#         joinedload(StudyCard.resources)
#     ).first()
#
#     if not study_card:
#         raise StudyCardNotFoundException(
#             f"Study card with id {study_card_id} not found or you don't have permission to access it."
#         )
#
#     return study_card.resources

def get_all_resources_for_study_card(db: Session, user_id: int, study_card_id: int) -> List[FocusStudy]:
    """
    Pobiera WSZYSTKIE zasoby (wszystkich typów) dla konkretnej karty nauki. (BEZ ZMIAN)
    """
    study_card = db.query(StudyCard).filter(
        StudyCard.id == study_card_id,
        StudyCard.user_id == user_id
    ).options(
        joinedload(StudyCard.resources)
    ).first()

    if not study_card:
        raise StudyCardNotFoundException(
            f"Study card with id {study_card_id} not found or you don't have permission to access it."
        )

    return study_card.resources


# def get_key_concepts_only_for_study_card(db: Session, user_id: int, study_card_id: int) -> List[KeyConceptFocus]:
#     """
#     Pobiera TYLKO zasoby typu KeyConceptFocus dla konkretnej karty nauki.
#     """
#     card_exists = db.query(StudyCard.id).filter(
#         StudyCard.id == study_card_id,
#         StudyCard.user_id == user_id
#     ).first()
#
#     if not card_exists:
#         raise StudyCardNotFoundException(
#             f"Study card with id {study_card_id} not found or you don't have permission to access it."
#         )
#
#     key_concepts = db.query(KeyConceptFocus).filter(
#         KeyConceptFocus.study_card_id == study_card_id
#     ).all()
#
#     return key_concepts

def get_key_concepts_only_for_study_card(db: Session, user_id: int, study_card_id: int) -> List[KeyConceptFocus]:
    """
    Pobiera TYLKO zasoby typu KeyConceptFocus dla konkretnej karty nauki. (BEZ ZMIAN)
    """
    card_exists = db.query(StudyCard.id).filter(
        StudyCard.id == study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not card_exists:
        raise StudyCardNotFoundException(
            f"Study card with id {study_card_id} not found or you don't have permission to access it."
        )

    key_concepts = db.query(KeyConceptFocus).filter(
        KeyConceptFocus.study_card_id == study_card_id
    ).all()

    return key_concepts


# def get_resources_by_subtopic_names(db: Session, user_id: int, request: ResourcesBySubtopicsRequest) -> List[
#     FocusStudy]:
#     """
#     Pobiera zasoby FocusStudy dla podanej listy nazw podtematów.
#     """
#     study_card_id = request.study_card_id
#     subtopic_names_to_find = set(request.subtopic_names)
#
#     if not subtopic_names_to_find:
#         return []
#
#     study_card = db.query(StudyCard).filter(
#         StudyCard.id == study_card_id,
#         StudyCard.user_id == user_id
#     ).first()
#
#     if not study_card:
#         raise StudyCardNotFoundException(
#             f"Study card with id {study_card_id} not found or you don't have permission to access it."
#         )
#
#     if not study_card.knowledge_tree:
#         return []
#
#     found_topic_node_ids: Set[str] = set()
#     for topic, subtopics in study_card.knowledge_tree.items():
#         for subtopic_name, subtopic_data in subtopics.items():
#             if subtopic_name in subtopic_names_to_find:
#                 node_id = subtopic_data.get("id")
#                 if node_id:
#                     found_topic_node_ids.add(node_id)
#
#     if not found_topic_node_ids:
#         return []
#
#     resources = db.query(FocusStudy).filter(
#         and_(
#             FocusStudy.study_card_id == study_card_id,
#             FocusStudy.topic_node_id.in_(list(found_topic_node_ids))
#         )
#     ).all()
#
#     return resources

def get_resources_by_subtopic_names(db: Session, user_id: int, request: ResourcesBySubtopicsRequest) -> List[FocusStudy]:
    """
    Pobiera zasoby FocusStudy dla podanej listy nazw podtematów. (ZAKTUALIZOWANA)
    """
    study_card_id = request.study_card_id
    subtopic_names_to_find = set(request.subtopic_names)

    if not subtopic_names_to_find:
        return []

    study_card = db.query(StudyCard).filter(
        StudyCard.id == study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not study_card:
        raise StudyCardNotFoundException(f"Study card with id {study_card_id} not found.")

    if not study_card.knowledge_tree or "tree" not in study_card.knowledge_tree:
        return []

    # Spłaszczamy drzewo, aby łatwo je przeszukać
    all_nodes = _flatten_tree_for_processing(study_card.knowledge_tree["tree"])

    found_topic_node_ids: Set[str] = set()
    for node in all_nodes:
        # Teraz szukamy po kluczu 'topic_name', który zastępuje stary 'subtopic_name'
        if node.get("topic_name") in subtopic_names_to_find:
            node_id = node.get("id")
            if node_id:
                found_topic_node_ids.add(node_id)

    if not found_topic_node_ids:
        return []

    resources = db.query(FocusStudy).filter(
        and_(
            FocusStudy.study_card_id == study_card_id,
            FocusStudy.topic_node_id.in_(list(found_topic_node_ids))
        )
    ).all()

    return resources


# def get_things_to_practice(db: Session, user_id: int, study_card_id: int) -> List[FocusStudy]:
#     """
#     Pobiera zasoby FocusStudy dla tematów, których poziom opanowania (mastery_level)
#     jest niższy niż 3. Póki co dałem 3 ale w przyszłości można zmienić
#     """
#     study_card = db.query(StudyCard).filter(
#         StudyCard.id == study_card_id,
#         StudyCard.user_id == user_id
#     ).first()
#
#     if not study_card:
#         raise StudyCardNotFoundException(
#             f"Study card with id {study_card_id} not found or you don't have permission to access it."
#         )
#
#     if not study_card.knowledge_tree:
#         return []
#
#     weak_topic_node_ids: Set[str] = set()
#     for topic, subtopics in study_card.knowledge_tree.items():
#         for subtopic_name, subtopic_data in subtopics.items():
#             mastery_level = subtopic_data.get("mastery_level", 0)
#
#             if mastery_level < 3:
#                 node_id = subtopic_data.get("id")
#                 if node_id:
#                     weak_topic_node_ids.add(node_id)
#
#     if not weak_topic_node_ids:
#         return []
#     resources = db.query(FocusStudy).filter(
#         and_(
#             FocusStudy.study_card_id == study_card_id,
#             FocusStudy.topic_node_id.in_(list(weak_topic_node_ids))
#         )
#     ).all()
#
#     return resources

def get_things_to_practice(db: Session, user_id: int, study_card_id: int) -> List[FocusStudy]:
    """
    Pobiera zasoby dla tematów, których poziom opanowania (mastery_level) jest niski. (ZAKTUALIZOWANA)
    """
    study_card = db.query(StudyCard).filter(
        StudyCard.id == study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not study_card:
        raise StudyCardNotFoundException(f"Study card with id {study_card_id} not found.")

    if not study_card.knowledge_tree or "tree" not in study_card.knowledge_tree:
        return []

    # Spłaszczamy drzewo, aby łatwo je przeszukać
    all_nodes = _flatten_tree_for_processing(study_card.knowledge_tree["tree"])

    weak_topic_node_ids: Set[str] = set()
    for node in all_nodes:
        mastery_level = node.get("mastery_level", 0)
        if mastery_level < 3:
            node_id = node.get("id")
            if node_id:
                weak_topic_node_ids.add(node_id)

    if not weak_topic_node_ids:
        return []

    resources = db.query(FocusStudy).filter(
        and_(
            FocusStudy.study_card_id == study_card_id,
            FocusStudy.topic_node_id.in_(list(weak_topic_node_ids))
        )
    ).all()

    return resources