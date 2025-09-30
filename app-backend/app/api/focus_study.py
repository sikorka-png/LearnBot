from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.decorators.token import get_current_user_from_cookie
from app.schemas.focus_study_chat_helper import FocusStudyChatResponse, FocusStudyChatRequest
from app.services.focus_study_chat_helper_service import get_assistant_response
from app.services.focus_study_service import get_all_resources_for_study_card, get_key_concepts_only_for_study_card, \
    get_resources_by_subtopic_names, get_things_to_practice
from app.schemas.focus_study import KeyConceptResponse, AnyStudyResourceResponse, ResourcesBySubtopicsRequest

router = APIRouter()


@router.get(
    "/{study_card_id}/all-resources",
    response_model=List[AnyStudyResourceResponse],
    summary="Get ALL study resources for a Study Card"
)
def get_all_resources(
        study_card_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Retrieves a list of all study resources (Key Concepts, Examples, etc.)
    associated with a given study_card_id.
    """
    resources = get_all_resources_for_study_card(
        db=db,
        user_id=current_user.id,
        study_card_id=study_card_id
    )
    return resources


@router.get(
    "/{study_card_id}/key-concepts",
    response_model=List[KeyConceptResponse],
    summary="Get ONLY Key Concepts for a Study Card"
)
def get_key_concepts_only(
        study_card_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Retrieves a list of only the Key Concepts associated with a given
    study_card_id.
    """
    key_concepts = get_key_concepts_only_for_study_card(
        db=db,
        user_id=current_user.id,
        study_card_id=study_card_id
    )
    return key_concepts


@router.post(
    "/by-subtopics",
    response_model=List[AnyStudyResourceResponse],
    summary="Get study resources for a list of subtopic names"
)
def get_resources_for_specific_subtopics(
        request_body: ResourcesBySubtopicsRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Retrieves a list of all study resources (Key Concepts, Examples, etc.)
    that are associated with the provided list of subtopic names for a
    specific study card.
    """
    resources = get_resources_by_subtopic_names(
        db=db,
        user_id=current_user.id,
        request=request_body
    )
    return resources


@router.post(
    "/{study_card_id}/things-to-practice",
    summary="Return all the things to practice for study mode (after user clicks the button for it)"
)
def get_things_to_practice_by_id(
        study_card_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    things_to_practice = get_things_to_practice(
        study_card_id=study_card_id,
        db=db,
        user_id=current_user.id,
    )
    return things_to_practice


@router.post(
    "/chat",
    response_model=FocusStudyChatResponse,
    summary="Send a message to the Focus Study assistant"
)
def handle_chat_message(
        request: FocusStudyChatRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Forwards a user's message from a Focus Study session to the AI assistant
    and returns its response. Manages session context via session_id.
    """
    try:
        response_text = get_assistant_response(
            db=db,
            user_id=current_user.id,
            request=request
        )
        return FocusStudyChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
