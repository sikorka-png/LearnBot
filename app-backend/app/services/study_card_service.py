import os
import logging
from datetime import datetime
import random
from typing import List
from dotenv import load_dotenv
import httpx
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from app.exceptions.study_card_exception import StudyCardNotFoundException
from app.models.study_card import StudyCard, TreeStatus, FocusStudyStatus
from app.models.file import File
from app.models.usage_stat import UsageStats
from app.schemas.study_card import StudyCardCreate, StudyCardResponse, UpdateMasteryByTopicNameRequest, \
    KnowledgeTreeStatusResponse, FocusStudyStatusResponse
from app.models.focus_study import KeyConceptFocus, PracticeProblemFocus
from sqlalchemy.orm.attributes import flag_modified

logger = logging.getLogger("stripe_webhook")
AI_ENGINE_URL = "http://ai-engine:8000"
load_dotenv()

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
INDEX_NAME = os.environ.get("INDEX_NAME")

vectorstore = PineconeVectorStore(
    index_name=INDEX_NAME,
    embedding=embeddings
)


def get_chunks_by_ids(user_id: int, chunk_ids: List[str]) -> List[str]:
    """
    Pobiera treść tekstową chunków z Pinecone na podstawie listy ich ID.
    Poprawiona wersja, zgodna z nowym API klienta Pinecone.
    """
    if not chunk_ids:
        return []

    try:
        fetch_response = vectorstore._index.fetch(ids=chunk_ids)

        vectors = fetch_response.vectors
        texts = []

        for vector_data in vectors.values():
            metadata = vector_data.metadata

            if metadata and metadata.get('user_id') == user_id:
                text = metadata.get('text', '')
                if text:
                    texts.append(text)
            else:
                chunk_id = vector_data.id
                print(
                    f"SECURITY WARNING/DATA MISMATCH: Attempt to fetch chunk {chunk_id} for user {user_id}, "
                    f"but it belongs to another user or metadata is missing."
                )

        return texts

    except Exception as e:
        print(f"An error occurred while fetching chunks by IDs from Pinecone: {e}")
        return []


def _flatten_knowledge_tree(nodes: list, parent_path: str = "") -> list:
    flat_list = []
    for node in nodes:
        current_topic_name = node.get("topic_name")
        if not current_topic_name:
            continue
        new_path = f"{parent_path} > {current_topic_name}" if parent_path else current_topic_name
        if node.get("chunk_ids"):
            flat_list.append({
                "full_topic_path": new_path,
                "topic_name": current_topic_name,
                "data": node
            })
        if "subtopics" in node and node["subtopics"]:
            flat_list.extend(_flatten_knowledge_tree(node["subtopics"], new_path))
    return flat_list

# def _generate_all_study_resources_for_card(db: Session, study_card_id: int):
#     """
#     Orkiestruje generowanie WSZYSTKICH zasobów dla "Focus Study" po utworzeniu drzewa.
#     """
#     print(f"Background task (step 2): Generating all study resources for StudyCard ID: {study_card_id}")
#     card = db.query(StudyCard).filter(StudyCard.id == study_card_id).first()
#     if not card or not card.knowledge_tree:
#         print(f"ERROR: Card or knowledge tree not found for resource generation.")
#         return
#
#     # Używamy nowej funkcji do spłaszczenia drzewa z formatu {"tree": [...]}
#     root_nodes = card.knowledge_tree.get("tree", [])
#     all_topics = _flatten_knowledge_tree(root_nodes)
#
#     if not all_topics:
#         print(f"WARNING: Knowledge tree for card {study_card_id} is empty or has no topics with chunks.")
#         # Opcjonalnie: ustaw status na gotowy, nawet jeśli nic nie zostało wygenerowane
#         card.focus_study_status = FocusStudyStatus.ready
#         db.commit()
#         return
#
#     # Twoja istniejąca logika do losowania problemów
#     num_problems = min(10, len(all_topics))
#     topics_for_problems = random.sample(all_topics, num_problems)
#     problem_topic_ids = {info['data']['id'] for info in topics_for_problems}
#
#     print(f"Generating KeyConcepts for {len(all_topics)} topics and PracticeProblems for {num_problems} topics.")
#
#     with httpx.Client() as client:
#         for topic_info in all_topics:
#             topic_node_id = topic_info['data'].get("id")
#             if not topic_node_id:
#                 continue
#
#             # Twoja logika pobierania tekstu źródłowego - pozostaje bez zmian
#             source_text = "\n\n".join(
#                 get_chunks_by_ids(user_id=card.user_id, chunk_ids=topic_info['data'].get("chunk_ids", [])))
#             if not source_text:
#                 continue
#
#             # Twoje funkcje generujące - pozostają bez zmian
#             # Zmieniamy tylko przekazywane argumenty, aby były bardziej spójne
#             _generate_and_save_key_concept(client, db, card, topic_info, source_text)
#
#             if topic_node_id in problem_topic_ids:
#                 _generate_and_save_practice_problem(client, db, card, topic_info, source_text)
#
#     try:
#         card.focus_study_status = FocusStudyStatus.ready
#         db.commit()
#         print(f"Background task (step 2): Successfully finished resource generation for StudyCard ID: {study_card_id}")
#     except Exception as e:
#         db.rollback()
#         print(f"ERROR: Failed to commit new resources to DB for card {study_card_id}: {e}")

def _generate_all_study_resources_for_card(db: Session, study_card_id: int):
    print(f"Background task (step 2): Generating all study resources for StudyCard ID: {study_card_id}")
    card = db.query(StudyCard).filter(StudyCard.id == study_card_id).first()
    if not card or not card.knowledge_tree:
        print(f"ERROR: Card or knowledge tree not found for resource generation.")
        return

    root_nodes = card.knowledge_tree.get("tree", [])
    all_topics = _flatten_knowledge_tree(root_nodes)

    if not all_topics:
        print(f"WARNING: Knowledge tree for card {study_card_id} is empty.")
        card.focus_study_status = FocusStudyStatus.ready
        db.commit()
        return

    num_problems = min(10, len(all_topics))
    topics_for_problems = random.sample(all_topics, num_problems)
    problem_topic_ids = {info['data']['id'] for info in topics_for_problems}

    print(f"Generating KeyConcepts for {len(all_topics)} topics and PracticeProblems for {num_problems} topics.")

    with httpx.Client() as client:
        for topic_info in all_topics:
            topic_node_id = topic_info['data'].get("id")
            if not topic_node_id:
                continue
            source_text = "\n\n".join(
                get_chunks_by_ids(user_id=card.user_id, chunk_ids=topic_info['data'].get("chunk_ids", [])))
            if not source_text:
                continue

            _generate_and_save_key_concept(client, db, card, topic_info, source_text)
            if topic_node_id in problem_topic_ids:
                _generate_and_save_practice_problem(client, db, card, topic_info, source_text)

    try:
        card.focus_study_status = FocusStudyStatus.ready
        db.commit()
        print(f"Background task (step 2): Successfully finished resource generation for StudyCard ID: {study_card_id}")
    except Exception as e:
        db.rollback()
        print(f"ERROR: Failed to commit new resources to DB for card {study_card_id}: {e}")

# def _generate_all_study_resources_for_card(db: Session, study_card_id: int):
#     """
#     Orkiestruje generowanie WSZYSTKICH zasobów dla "Focus Study" po utworzeniu drzewa.
#     """
#     print(f"Background task (step 2): Generating all study resources for StudyCard ID: {study_card_id}")
#     card = db.query(StudyCard).filter(StudyCard.id == study_card_id).first()
#     if not card or not card.knowledge_tree:
#         print(f"ERROR: Card or knowledge tree not found for resource generation.")
#         return
#
#     all_subtopics = [
#         {"topic_name": topic, "subtopic_name": sub, "data": sub_data}
#         for topic, subtopics in card.knowledge_tree.items()
#         for sub, sub_data in subtopics.items()
#     ]
#     if not all_subtopics:
#         return
#
#     num_problems = min(10, len(all_subtopics))
#     topics_for_problems = random.sample(all_subtopics, num_problems)
#     problem_topic_ids = {info['data']['id'] for info in topics_for_problems}
#
#     print(f"Generating KeyConcepts for {len(all_subtopics)} topics and PracticeProblems for {num_problems} topics.")
#
#     with httpx.Client() as client:
#         for topic_info in all_subtopics:
#             topic_node_id = topic_info['data'].get("id")
#             if not topic_node_id:
#                 continue
#
#             source_text = "\n\n".join(
#                 get_chunks_by_ids(user_id=card.user_id, chunk_ids=topic_info['data'].get("chunk_ids", [])))
#             if not source_text:
#                 continue
#
#             _generate_and_save_key_concept(client, db, card, topic_info, source_text)
#
#             if topic_node_id in problem_topic_ids:
#                 _generate_and_save_practice_problem(client, db, card, topic_info, source_text)
#
#     try:
#         card.focus_study_status = FocusStudyStatus.ready
#         db.commit()
#         print(f"Background task (step 2): Successfully finished resource generation for StudyCard ID: {study_card_id}")
#     except Exception as e:
#         db.rollback()
#         print(f"ERROR: Failed to commit new resources to DB for card {study_card_id}: {e}")


# def _generate_and_save_key_concept(
#         client: httpx.Client,
#         db: Session,
#         card: StudyCard,
#         topic_info: dict,
#         source_text: str
# ):
#     """Generuje i dodaje do sesji DB jeden zasób typu KeyConceptFocus."""
#
#     topic_node_id = topic_info['data']['id']
#     topic_name = topic_info['topic_name']
#     subtopic_name = topic_info['subtopic_name']
#
#     is_existing = db.query(KeyConceptFocus.id).filter_by(topic_node_id=topic_node_id).first()
#     if is_existing:
#         return
#
#     payload = {
#         "topic_name": topic_name,
#         "subtopic_name": subtopic_name,
#         "source_text": source_text
#     }
#     api_endpoint = f"{AI_ENGINE_URL}/key_concepts/generate-single"
#
#     try:
#         response = client.post(api_endpoint, json=payload, timeout=60.0)
#         response.raise_for_status()
#         data = response.json()
#         new_resource = KeyConceptFocus(
#             study_card_id=card.id,
#             topic_node_id=topic_node_id,
#             concept_title=data['concept_title'],
#             concept_explanation=data['concept_explanation']
#         )
#         db.add(new_resource)
#         print(f"  + Generated KeyConcept for '{subtopic_name}'")
#     except Exception as e:
#         print(f"  - FAILED to generate KeyConcept for '{subtopic_name}': {e}")

def _generate_and_save_key_concept(client: httpx.Client, db: Session, card: StudyCard, topic_info: dict, source_text: str):
    topic_node_id = topic_info['data']['id']
    # ZMIANA: Używamy teraz 'full_topic_path' jako kontekstu, a 'topic_name' jako konkretnego tematu.
    full_topic_path = topic_info['full_topic_path']
    leaf_topic_name = topic_info['topic_name']

    is_existing = db.query(KeyConceptFocus.id).filter_by(topic_node_id=topic_node_id).first()
    if is_existing:
        return

    # ZMIANA: Wysyłamy teraz pełną ścieżkę jako 'topic_name' a nazwę liścia jako 'subtopic_name'
    payload = {"topic_name": full_topic_path, "subtopic_name": leaf_topic_name, "source_text": source_text}
    api_endpoint = f"{AI_ENGINE_URL}/key_concepts/generate-single"

    try:
        response = client.post(api_endpoint, json=payload, timeout=60.0)
        response.raise_for_status()
        data = response.json()
        new_resource = KeyConceptFocus(study_card_id=card.id, topic_node_id=topic_node_id, concept_title=data['concept_title'], concept_explanation=data['concept_explanation'])
        db.add(new_resource)
        print(f"  + Generated KeyConcept for '{leaf_topic_name}'")
    except Exception as e:
        print(f"  - FAILED to generate KeyConcept for '{leaf_topic_name}': {e}")

def _generate_and_save_tree_in_background(db: Session, study_card_id: int, user_id: int, filenames: List[str]):
    print(f"Background task (step 1): Generating knowledge tree for StudyCard ID: {study_card_id}")
    logger.info(f"(step 1): {user_id}")
    api_endpoint = f"{AI_ENGINE_URL}/knowledge_tree/knowledge-tree/generate"
    # Poprawka: user_id musi być stringiem
    payload = {"user_id": str(user_id), "filenames": filenames}

    try:
        with httpx.Client() as client:
            response = client.post(api_endpoint, json=payload, timeout=600.0)
            response.raise_for_status()
            knowledge_tree_data = response.json()
    except Exception as e:
        print(f"ERROR: AI engine failed to generate tree for StudyCard {study_card_id}: {e}")
        logger.info(f"error: {e}")
        return

    # Zabezpieczenie przed złym formatem
    if not isinstance(knowledge_tree_data, dict) or "tree" not in knowledge_tree_data:
        print(f"ERROR: AI engine returned an unexpected format. Expected a dict with a 'tree' key.")
        return

    try:
        db_card = db.query(StudyCard).filter(StudyCard.id == study_card_id, StudyCard.user_id == user_id).first()
        if db_card:
            db_card.knowledge_tree = knowledge_tree_data
            db_card.knowledge_tree_status = TreeStatus.ready
            logger.info(f"(completed): {user_id}")
            db.commit()
            print(f"Background task (step 1): Successfully saved knowledge tree for StudyCard ID: {study_card_id}")
            _generate_all_study_resources_for_card(db=db, study_card_id=study_card_id)
        else:
            print(f"ERROR: StudyCard {study_card_id} not found after tree generation.")
    except Exception as e:
        db.rollback()
        # Zmieniamy komunikat błędu, aby pasował do tego, co widzisz w logach
        print(f"ERROR: Failed to save or process resources for card {study_card_id}: {e}")


# def _generate_and_save_tree_in_background(db: Session, study_card_id: int, user_id: int, filenames: List[str]):
#     """
#     Generuje drzewo wiedzy, zapisuje je, a NASTĘPNIE uruchamia generowanie konceptów.
#     """
#     print(f"Background task (step 1): Generating knowledge tree for StudyCard ID: {study_card_id}")
#     logger.info(f"(step 1): {user_id}")
#     api_endpoint = f"{AI_ENGINE_URL}/knowledge_tree/knowledge-tree/generate"
#     payload = {"user_id": user_id, "filenames": filenames}
#
#     try:
#         with httpx.Client() as client:
#             response = client.post(api_endpoint, json=payload, timeout=600.0)
#             response.raise_for_status()
#             knowledge_tree_data = response.json()
#     except Exception as e:
#         print(f"ERROR: AI engine failed to generate tree for StudyCard {study_card_id}: {e}")
#         logger.info(f"error: {e}")
#         return
#
#     try:
#         db_card = db.query(StudyCard).filter(StudyCard.id == study_card_id, StudyCard.user_id == user_id).first()
#         if db_card:
#             db_card.knowledge_tree = knowledge_tree_data
#             db_card.knowledge_tree_status = TreeStatus.ready
#             logger.info(f"(completed): {user_id}")
#             db.commit()
#             print(f"Background task (step 1): Successfully saved knowledge tree for StudyCard ID: {study_card_id}")
#
#             _generate_all_study_resources_for_card(db=db, study_card_id=study_card_id)
#         else:
#             print(f"ERROR: StudyCard {study_card_id} not found after tree generation.")
#     except Exception as e:
#         db.rollback()
#         print(f"ERROR: Failed to save knowledge tree to DB for card {study_card_id}: {e}")


def create_study_card(db: Session, user_id: int, card_in: StudyCardCreate, background_tasks) -> StudyCardResponse:
    """
    Tworzy nową kartę nauki i przypisuje do niej pliki.
    """
    files = db.query(File).filter(
        File.filename.in_(card_in.materials),
        File.user_id == user_id
    ).all()

    if len(files) != len(card_in.materials):
        raise HTTPException(
            status_code=404,
            detail="One or more files not found or do not belong to the current user."
        )

    db_card = StudyCard(
        name=card_in.name,
        description=card_in.description,
        color=card_in.color,
        user_id=user_id,
        files=files
    )

    db.add(db_card)
    db.commit()
    db.refresh(db_card)

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=user_id) \
        .first()
    usage_stats.generated_study_cards += 1

    db.commit()

    filenames = [file.filename for file in files]
    background_tasks.add_task(
        _generate_and_save_tree_in_background,
        db,
        db_card.id,
        user_id,
        filenames
    )

    return StudyCardResponse(
        id=db_card.id,
        name=db_card.name,
        description=db_card.description,
        color=db_card.color,
        materials=filenames,
        knowledge_tree_status=db_card.knowledge_tree_status,
        focus_study_status=db_card.focus_study_status
    )


def get_user_study_cards(db: Session, user_id: int):
    study_cards = db.query(StudyCard).filter(StudyCard.user_id == user_id).all()
    return [
        StudyCardResponse(
            id=card.id,
            name=card.name,
            description=card.description,
            color=card.color,
            materials=[file.filename for file in card.files],
            knowledge_tree_status=card.knowledge_tree_status,
            focus_study_status=card.focus_study_status
        )
        for card in study_cards
    ]


def get_user_study_cards_by_id(db: Session, user_id: int, study_card_id: int):
    study_card = db.query(StudyCard).options(
        joinedload(StudyCard.resources)
    ).filter(
        StudyCard.id == study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not study_card:
        raise StudyCardNotFoundException()

    return study_card


def get_focus_status_for_card(db: Session, user_id: int, study_card_id: int):
    study_card = db.query(StudyCard.focus_study_status).filter(
        StudyCard.id == study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not study_card[0]:
        raise StudyCardNotFoundException()

    return FocusStudyStatusResponse(
        focus_study_status=study_card[0]
    )


def get_tree_status_for_card(db: Session, user_id: int, study_card_id: int):
    study_card = db.query(StudyCard.knowledge_tree_status).filter(
        StudyCard.id == study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not study_card[0]:
        raise StudyCardNotFoundException()

    return KnowledgeTreeStatusResponse(
        knowledge_tree_status=study_card[0]
    )


def get_user_study_cards_by_id_without_resources(db: Session, user_id: int, study_card_id: int):
    study_card = db.query(StudyCard).filter(
        StudyCard.id == study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not study_card:
        raise StudyCardNotFoundException()

    return study_card


def delete_card(db: Session, user_id: int, study_card_id: int):
    study_card = db.query(StudyCard).filter(StudyCard.id == study_card_id, StudyCard.user_id == user_id).first()
    if not study_card:
        raise StudyCardNotFoundException()

    db.delete(study_card)
    db.commit()


def update_topic_mastery_by_name(db: Session, user_id: int, request: UpdateMasteryByTopicNameRequest) -> StudyCard:
    study_card_id = request.study_card_id
    # Teraz request powinien wysyłać 'topic_name' zamiast 'topic' i 'subtopic'
    target_topic_name = request.topic_name  # Załóżmy, że schema też zostanie zaktualizowana

    study_card = db.query(StudyCard).filter(StudyCard.id == study_card_id, StudyCard.user_id == user_id).first()
    if not study_card:
        raise StudyCardNotFoundException(f"Study card with id {study_card_id} not found.")
    if not study_card.knowledge_tree or "tree" not in study_card.knowledge_tree:
        raise HTTPException(status_code=404, detail="Knowledge tree not generated yet.")

    knowledge_tree_data = study_card.knowledge_tree

    node_found = False

    # Funkcja rekurencyjna do przeszukiwania i aktualizacji drzewa
    def find_and_update_node(nodes: list):
        nonlocal node_found
        for node in nodes:
            if node_found: return
            if node.get("topic_name") == target_topic_name:
                node["mastery_level"] = node.get("mastery_level", 0) + request.mastery_level
                node["last_seen"] = datetime.utcnow().isoformat()
                node["attempts"] = node.get("attempts", 0) + 1
                node_found = True
                return
            if "subtopics" in node and node["subtopics"]:
                find_and_update_node(node["subtopics"])

    find_and_update_node(knowledge_tree_data["tree"])

    if not node_found:
        raise HTTPException(status_code=404, detail=f"Topic '{target_topic_name}' not found.")

    flag_modified(study_card, "knowledge_tree")
    try:
        db.commit()
        db.refresh(study_card)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update mastery level: {e}")

    return study_card

# def update_topic_mastery_by_name(db: Session, user_id: int, request: UpdateMasteryByTopicNameRequest) -> StudyCard:
#     """
#     Aktualizuje pole 'mastery_level' dla konkretnego tematu w knowledge_tree,
#     identyfikując go po nazwie tematu i podtematu.
#     """
#     study_card_id = request.study_card_id
#     topic_name = request.topic
#     subtopic_name = request.subtopic
#     user_knowledge_level = request.mastery_level
#
#     study_card = db.query(StudyCard).filter(
#         StudyCard.id == study_card_id,
#         StudyCard.user_id == user_id
#     ).first()
#
#     if not study_card:
#         raise StudyCardNotFoundException(f"Study card with id {study_card_id} not found.")
#
#     if not study_card.knowledge_tree:
#         raise HTTPException(status_code=404, detail="Knowledge tree not generated yet.")
#
#     knowledge_tree_data = study_card.knowledge_tree
#
#     if topic_name in knowledge_tree_data and subtopic_name in knowledge_tree_data[topic_name]:
#         node_to_update = knowledge_tree_data[topic_name][subtopic_name]
#         node_to_update["mastery_level"] += user_knowledge_level
#         node_to_update["last_seen"] = datetime.utcnow().isoformat()
#         node_to_update["attempts"] = node_to_update.get("attempts", 0) + 1
#     else:
#         raise HTTPException(
#             status_code=404,
#             detail=f"Topic '{topic_name}' -> Subtopic '{subtopic_name}' not found in the knowledge tree."
#         )
#
#     flag_modified(study_card, "knowledge_tree")
#
#     try:
#         db.commit()
#         db.refresh(study_card)
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=500, detail=f"Failed to update mastery level: {e}")
#
#     return study_card

def _generate_and_save_practice_problem(client: httpx.Client, db: Session, card: StudyCard, topic_info: dict, source_text: str):
    topic_node_id = topic_info['data']['id']
    # ZMIANA: Podobnie jak w KeyConcept
    full_topic_path = topic_info['full_topic_path']
    leaf_topic_name = topic_info['topic_name']

    is_existing = db.query(PracticeProblemFocus.id).filter_by(topic_node_id=topic_node_id).first()
    if is_existing:
        return

    payload = {"topic_name": full_topic_path, "subtopic_name": leaf_topic_name, "source_text": source_text}
    api_endpoint = f"{AI_ENGINE_URL}/problem_practice/generate-single"

    try:
        response = client.post(api_endpoint, json=payload, timeout=90.0)
        response.raise_for_status()
        data = response.json()
        new_resource = PracticeProblemFocus(study_card_id=card.id, topic_node_id=topic_node_id, problem_title=data['problem_title'], problem_description=data['problem_description'], hint=data.get('hint'))
        db.add(new_resource)
        print(f"  + Generated PracticeProblem for '{leaf_topic_name}'")
    except Exception as e:
        print(f"  - FAILED to generate PracticeProblem for '{leaf_topic_name}': {e}")

# def _generate_and_save_practice_problem(
#         client: httpx.Client,
#         db: Session,
#         card: StudyCard,
#         topic_info: dict,
#         source_text: str
# ):
#     """Generuje i dodaje do sesji DB jeden zasób typu PracticeProblemFocus."""
#
#     topic_node_id = topic_info['data']['id']
#     topic_name = topic_info['topic_name']
#     subtopic_name = topic_info['subtopic_name']
#
#     is_existing = db.query(PracticeProblemFocus.id).filter_by(topic_node_id=topic_node_id).first()
#     if is_existing:
#         return
#
#     payload = {
#         "topic_name": topic_name,
#         "subtopic_name": subtopic_name,
#         "source_text": source_text
#     }
#     api_endpoint = f"{AI_ENGINE_URL}/problem_practice/generate-single"
#
#     try:
#         response = client.post(api_endpoint, json=payload, timeout=90.0)
#         response.raise_for_status()
#         data = response.json()
#         new_resource = PracticeProblemFocus(
#             study_card_id=card.id,
#             topic_node_id=topic_node_id,
#             problem_title=data['problem_title'],
#             problem_description=data['problem_description'],
#             hint=data.get('hint')
#         )
#         db.add(new_resource)
#         print(f"  + Generated PracticeProblem for '{subtopic_name}'")
#     except Exception as e:
#         print(f"  - FAILED to generate PracticeProblem for '{subtopic_name}': {e}")
