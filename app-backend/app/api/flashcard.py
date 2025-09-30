from typing import List

from fastapi import APIRouter, Depends, HTTPException
from requests import Session
from starlette.status import HTTP_204_NO_CONTENT, HTTP_201_CREATED

from app.core.database import get_db
from app.decorators.check_usage_limit import check_usage_limit
from app.decorators.token import get_current_user_from_cookie
from app.models.user import User
from app.schemas.flashcard import FlashcardGenerateParams, FlashcardSetResponse, FlashcardDataIn, FlashcardAppendParams
from app.services.flashcard_service import create_flashcard_set_from_ai, get_user_flashcards, get_user_flashcards_by_id, \
    delete_flashcard_by_id, delete_single_flashcard, update_single_flashcard, create_single_flashcard, \
    append_flashcards_to_set_from_ai

router = APIRouter()


@router.post("/", response_model=FlashcardSetResponse)
@check_usage_limit("study_sessions", "max_study_sessions")
async def create_flashcard_set_endpoint(
        flashcard_params: FlashcardGenerateParams,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Creates a new set of flashcards from user files, saves them,
    and returns the complete saved set.
    """
    flashcard_set = await create_flashcard_set_from_ai(
        db=db,
        user_id=current_user.id,
        params=flashcard_params
    )

    if not flashcard_set:
        raise HTTPException(
            status_code=404,
            detail="Could not generate any flashcards from the provided content."
        )

    return flashcard_set


@router.get("/", response_model=List[FlashcardSetResponse])
def get_all_flashcard_sets(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Retrieves all flashcard sets for the currently authenticated user.
    """
    flashcard_sets = get_user_flashcards(
        db=db, user_id=current_user.id
    )
    return flashcard_sets


@router.get("/{flashcard_set_id}", response_model=FlashcardSetResponse)
def get_flashcard_set_by_id(
        flashcard_set_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    flashcard_set = get_user_flashcards_by_id(db=db, user_id=current_user.id, flashcard_id=flashcard_set_id)
    if not flashcard_set:
        raise HTTPException(404)
    return flashcard_set


@router.delete("/{flashcard_set_id}")
def delete_flashcard_set_by_id(
        flashcard_set_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    delete_flashcard_by_id(db=db, user_id=current_user.id, flashcard_id=flashcard_set_id)
    return HTTP_204_NO_CONTENT


@router.delete("/{flashcard_set_id}/cards/{card_id}", status_code=HTTP_204_NO_CONTENT)
def delete_flashcard_card_by_id(
        flashcard_set_id: int,
        card_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Usuwa pojedynczą fiszkę z zestawu użytkownika.
    """
    delete_single_flashcard(
        db=db,
        user_id=current_user.id,
        flashcard_set_id=flashcard_set_id,
        flashcard_id=card_id
    )
    return HTTP_204_NO_CONTENT


@router.put("/{flashcard_set_id}/cards/{card_id}")
def edit_flashcard_card_by_id(
        flashcard_set_id: int,
        card_id: int,
        payload: FlashcardDataIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Edytuje (definition/answer) pojedynczą fiszkę z zestawu użytkownika.
    Zwraca zaktualizowaną fiszkę w formacie kompatybilnym z frontendem.
    """
    updated = update_single_flashcard(
        db=db,
        user_id=current_user.id,
        flashcard_set_id=flashcard_set_id,
        flashcard_id=card_id,
        definition=payload.definition,
        answer=payload.answer,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    return {
        "id": updated.id,
        "definition": updated.definition,
        "answer": updated.answer,
        "flashcard_set_id": updated.flashcard_set_id,
    }


@router.post("/{flashcard_set_id}/cards", status_code=HTTP_201_CREATED)
def create_flashcard_card(
        flashcard_set_id: int,
        payload: FlashcardDataIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Dodaje pojedynczą fiszkę (definition/answer) do wskazanego zestawu użytkownika.
    Zwraca nowo utworzoną fiszkę w formacie kompatybilnym z frontendem.
    """
    created = create_single_flashcard(
        db=db,
        user_id=current_user.id,
        flashcard_set_id=flashcard_set_id,
        definition=payload.definition,
        answer=payload.answer,
    )
    if not created:
        raise HTTPException(status_code=404, detail="Flashcard set not found")

    return {
        "id": created.id,
        "definition": created.definition,
        "answer": created.answer,
        "flashcard_set_id": created.flashcard_set_id,
    }


@router.post("/{flashcard_set_id}/generate", status_code=HTTP_201_CREATED)
@check_usage_limit("study_sessions", "max_study_sessions")
async def generate_more_flashcards_for_set(
        flashcard_set_id: int,
        payload: FlashcardAppendParams,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Generates new AI flashcards and appends them to an existing user's flashcard set.
    Returns the list of newly created flashcards.
    """
    created_cards = await append_flashcards_to_set_from_ai(
        db=db,
        user_id=current_user.id,
        flashcard_set_id=flashcard_set_id,
        append_params=payload,
    )
    if created_cards is None:
        raise HTTPException(status_code=500, detail="Failed to generate flashcards")

    return created_cards
