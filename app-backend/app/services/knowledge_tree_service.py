import math

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime, timezone
from fastapi import HTTPException
from typing import Dict, Any, List, Optional

from app.models.study_card import StudyCard
from app.schemas.quiz import QuizSubmission


def _find_node_path_in_tree(tree: Dict[str, Any], topic_name: str) -> Optional[List[str]]:
    """
    Pomocnicza funkcja do wyszukiwania ścieżki do węzła w drzewie.
    Szuka dopasowania zarówno w głównych tematach, jak i podtematach.
    """
    if topic_name in tree:
        return None

    for main_topic, subtopics in tree.items():
        if topic_name in subtopics:
            return [main_topic, topic_name]

    return None


def update_knowledge_tree_from_quiz(db: Session, *, user_id: int, submission: QuizSubmission):
    """
    Aktualizuje drzewo wiedzy i zapewnia, że zmiany są poprawnie zapisywane do bazy,
    używając zaawansowanej formuły do obliczania pewności (confidence).
    """
    card = db.query(StudyCard).filter(
        StudyCard.id == submission.study_card_id,
        StudyCard.user_id == user_id
    ).first()

    if not card:
        raise HTTPException(status_code=404, detail="Study Card not found.")

    if not card.knowledge_tree:
        raise HTTPException(status_code=400, detail="Knowledge tree for this card has not been generated yet.")

    tree = card.knowledge_tree

    for result in submission.results:
        path = _find_node_path_in_tree(tree, result.topic)

        if not path:
            print(f"Warning: Topic '{result.topic}' not found as a subtopic in the knowledge tree. Skipping.")
            continue

        main_topic, subtopic = path

        try:
            node = tree[main_topic][subtopic]


            total_attempts = node.get("attempts", 0) + 1
            correct_attempts = node.get("correct", 0) + (1 if result.correct else 0)

            node["attempts"] = total_attempts
            node["correct"] = correct_attempts

            if total_attempts > 0:
                accuracy = correct_attempts / total_attempts

                last_seen_str = node.get("last_seen")
                days_since_last_seen = 0.0

                if last_seen_str:
                    try:
                        last_seen_dt = datetime.fromisoformat(last_seen_str.replace("Z", "+00:00"))
                        delta = datetime.now(timezone.utc) - last_seen_dt
                        days_since_last_seen = delta.total_seconds() / (60 * 60 * 24)
                    except ValueError:
                        print(f"Warning: Could not parse date '{last_seen_str}'. Assuming 0 days passed.")

                decay_factor = math.exp(-days_since_last_seen / 7.0)

                confidence = accuracy * decay_factor
                node["confidence"] = round(confidence, 4)

            if result.correct and node.get("confidence", 0) > 0.75 and node.get("mastery_level", 0) < 5:
                node["mastery_level"] = node.get("mastery_level", 0) + 1
            elif not result.correct and node.get("mastery_level", 0) > 0:
                node["mastery_level"] -= 1

            node["last_seen"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


        except KeyError:
            print(f"Warning: Path '{main_topic} -> {subtopic}' resolved incorrectly. Skipping.")
            continue

    flag_modified(card, "knowledge_tree")
    db.commit()
    db.refresh(card)

    print(f"Knowledge tree for Study Card ID {card.id} updated and saved successfully.")
    return card