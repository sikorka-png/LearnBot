import json
import logging  # <<< ADDED: For better logging, like in exam_service

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.exceptions.flashcard_exception import FlashcardNotFoundException
from app.models.flashcard import FlashcardSet, Flashcard
from app.models.usage_stat import UsageStats
from app.schemas.flashcard import FlashcardGenerateParams, FlashcardAppendParams
from app.services.study_card_service import get_user_study_cards_by_id

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)


async def generate_flashcards_from_ai(user_id: int, params: FlashcardGenerateParams,
                                      db: Session):
    """
    Calls the AI engine to generate flashcards based on the provided parameters.
    """
    card = get_user_study_cards_by_id(db=db, user_id=user_id, study_card_id=params.study_card_id)
    filenames = [file.filename for file in card.files]
    ai_request_payload = {
        "user_id": user_id,
        "filenames": filenames,
        "flashcards_needed": params.flashcards_needed,
        "topics": ",".join(params.topics)
    }

    timeout = httpx.Timeout(300.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                "http://ai-engine:8000/flashcard/",
                json=ai_request_payload
            )
            response.raise_for_status()

            usage_stats = db.query(UsageStats) \
                .filter_by(user_id=user_id) \
                .first()
            usage_stats.study_sessions += 1

            db.commit()
            # The AI engine returns a dict: {"flashcards": [{"definition": "...", "answer": "..."}, ...]}
            # We return the list of flashcard dictionaries directly.
            return response.json().get("flashcards", [])

        except httpx.ReadTimeout:
            logger.error("ERROR: Timeout occurred while waiting for ai-engine for flashcards.")
            raise HTTPException(status_code=504, detail="The AI service took too long to respond.")
        except httpx.HTTPStatusError as exc:
            logger.error(f"ERROR: HTTP error from ai-engine for flashcards: {exc.response.status_code}")
            logger.error(f"ERROR: Response body: {exc.response.text}")
            raise HTTPException(status_code=502, detail=f"AI service error: {exc.response.text}")
        except httpx.RequestError as exc:
            logger.error(f"ERROR: Could not connect to ai-engine for flashcards. Details: {exc}")
            raise HTTPException(status_code=503, detail="The AI service is currently unavailable.")
        except json.JSONDecodeError:
            # This can happen if the AI service returns a non-JSON response (e.g., plain text error)
            logger.error("ERROR: Failed to decode JSON from AI flashcard service response.")
            raise HTTPException(status_code=502, detail="Received an invalid response from the AI service.")


def save_flashcard_set(
        db: Session,
        user_id: int,
        name: str,
        description: str,
        source_filenames: list[str],
        flashcard_data_list: list[dict]
):
    """
    Saves a flashcard set and its associated flashcards to the database.
    """
    if not flashcard_data_list:
        logger.warning("save_flashcard_set called with an empty flashcard list. Nothing to save.")
        return None

    try:
        # Create the parent FlashcardSet
        db_flashcard_set = FlashcardSet(
            user_id=user_id,
            name=name,
            description=description,
            source_filenames=source_filenames
        )
        db.add(db_flashcard_set)
        db.flush()  # Flush to get the ID for the child flashcards

        # <<< THE MAIN FIX IS HERE >>>
        # We now iterate over a list of dictionaries, not strings.
        # No more json.loads() is needed.
        for card_data in flashcard_data_list:
            db_flashcard = Flashcard(
                # Access the dictionary keys directly
                definition=card_data.get('definition'),  # Using .get() is safer
                answer=card_data.get('answer'),
                flashcard_set_id=db_flashcard_set.id
            )
            db.add(db_flashcard)

        db.commit()
        db.refresh(db_flashcard_set)
        return db_flashcard_set

    except Exception as e:
        db.rollback()
        logger.error(f"ERROR: Database transaction failed while saving flashcards: {e}", exc_info=True)
        # Re-raise a generic server error
        raise HTTPException(status_code=500, detail="Failed to save flashcards to the database.")


async def create_flashcard_set_from_ai(
        db: Session,
        user_id: int,
        params: FlashcardGenerateParams
):
    """
    Generates flashcards via the AI engine and saves them to the database.
    """
    card = get_user_study_cards_by_id(db=db, user_id=user_id, study_card_id=params.study_card_id)
    ai_flashcards_data = await generate_flashcards_from_ai(user_id, params, db=db)

    if not ai_flashcards_data:
        return None

    source_filenames_list = [file.filename for file in card.files]

    db_flashcard_set = save_flashcard_set(
        db=db,
        user_id=user_id,
        name=params.name,
        description=params.description,
        source_filenames=source_filenames_list,
        flashcard_data_list=ai_flashcards_data
    )

    return db_flashcard_set


def get_user_flashcards(db: Session, user_id: int):
    return db.query(FlashcardSet) \
        .filter(FlashcardSet.user_id == user_id) \
        .all()


def get_user_flashcards_by_id(db: Session, user_id: int, flashcard_id: int):
    return db.query(FlashcardSet) \
        .filter(FlashcardSet.id == flashcard_id, FlashcardSet.user_id == user_id) \
        .first()


def delete_flashcard_by_id(db: Session, user_id: int, flashcard_id: int):
    flashcard = db.query(FlashcardSet) \
        .filter(
        FlashcardSet.id == flashcard_id,
        FlashcardSet.user_id == user_id
    ).first()

    if not flashcard:
        raise FlashcardNotFoundException()

    db.delete(flashcard)
    db.commit()


def delete_single_flashcard(
        db: Session,
        user_id: int,
        flashcard_set_id: int,
        flashcard_id: int
):
    """
    Usuwa jedną fiszkę użytkownika z konkretnego zestawu.
    Waliduje własność (user_id) i przynależność do zestawu (flashcard_set_id).
    """
    card = (
        db.query(Flashcard)
        .join(FlashcardSet, Flashcard.flashcard_set_id == FlashcardSet.id)
        .filter(
            Flashcard.id == flashcard_id,
            Flashcard.flashcard_set_id == flashcard_set_id,
            FlashcardSet.user_id == user_id,
        )
        .first()
    )

    if not card:
        raise FlashcardNotFoundException()

    db.delete(card)
    db.commit()


def update_single_flashcard(
        db: Session,
        user_id: int,
        flashcard_set_id: int,
        flashcard_id: int,
        definition: str,
        answer: str,
):
    """
    Aktualizuje treść fiszki użytkownika w danym zestawie.
    Waliduje własność usera i przynależność karty do zestawu.
    """
    card = (
        db.query(Flashcard)
        .join(FlashcardSet, Flashcard.flashcard_set_id == FlashcardSet.id)
        .filter(
            Flashcard.id == flashcard_id,
            Flashcard.flashcard_set_id == flashcard_set_id,
            FlashcardSet.user_id == user_id,
        )
        .first()
    )
    if not card:
        return None

    card.definition = definition
    card.answer = answer
    db.commit()
    db.refresh(card)
    return card


def create_single_flashcard(
        db: Session,
        user_id: int,
        flashcard_set_id: int,
        definition: str,
        answer: str,
) -> Flashcard | None:
    fc_set = db.query(FlashcardSet).filter(
        FlashcardSet.id == flashcard_set_id,
        FlashcardSet.user_id == user_id
    ).first()
    if not fc_set:
        return None

    card = Flashcard(
        definition=definition,
        answer=answer,
        flashcard_set_id=flashcard_set_id
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


async def append_flashcards_to_set_from_ai(
        db: Session,
        user_id: int,
        flashcard_set_id: int,
        append_params: FlashcardAppendParams,
):
    fc_set = (
        db.query(FlashcardSet)
        .filter(FlashcardSet.id == flashcard_set_id, FlashcardSet.user_id == user_id)
        .first()
    )
    if not fc_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")

    temp_params = FlashcardGenerateParams(
        study_card_id=append_params.study_card_id,
        name=fc_set.name,
        description=fc_set.description or "",
        flashcards_needed=append_params.flashcards_needed,
        topics=append_params.topics,
    )
    ai_flashcards_data = await generate_flashcards_from_ai(user_id, temp_params, db=db)
    if not ai_flashcards_data:
        return []

    created_cards: list[Flashcard] = []
    try:
        for card_data in ai_flashcards_data:
            card = Flashcard(
                definition=card_data.get("definition"),
                answer=card_data.get("answer"),
                flashcard_set_id=fc_set.id,
            )
            db.add(card)
            created_cards.append(card)
        db.commit()
        for c in created_cards:
            db.refresh(c)
    except Exception as e:
        db.rollback()
        logger.error(f"ERROR appending flashcards: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to append flashcards")

    return [
        {
            "id": c.id,
            "definition": c.definition,
            "answer": c.answer,
            "flashcard_set_id": c.flashcard_set_id,
        }
        for c in created_cards
    ]
