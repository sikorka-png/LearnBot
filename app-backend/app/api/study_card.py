from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.decorators.check_usage_limit import check_usage_limit
from app.decorators.token import get_current_user_from_cookie
from app.schemas.study_card import StudyCardCreate, StudyCardResponseTmp, StudyCardResponse, \
    UpdateMasteryByTopicNameRequest, KnowledgeTreeResponse, KnowledgeTreeStatusResponse, FocusStudyStatusResponse
from app.services.study_card_service import create_study_card, get_user_study_cards, get_user_study_cards_by_id, \
    delete_card, update_topic_mastery_by_name, get_user_study_cards_by_id_without_resources, get_tree_status_for_card, \
    get_focus_status_for_card
from app.models.user import User

router = APIRouter()


@router.post(
    "/",
    response_model=StudyCardResponse,
    status_code=201,
    summary="Create a new Study Card"
)
@check_usage_limit("generated_study_cards", "max_generated_study_cards")
def create_new_study_card(
        card_in: StudyCardCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie),
):
    study_card = create_study_card(db=db, user_id=current_user.id, card_in=card_in, background_tasks=background_tasks)
    return study_card


@router.get("/", response_model=List[StudyCardResponse])
def get_study_cards(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    study_cards = get_user_study_cards(db, current_user.id)
    return study_cards


@router.get("/{study_card_id}", response_model=StudyCardResponseTmp)
def get_study_card(
        study_card_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    study_card = get_user_study_cards_by_id(db, current_user.id, study_card_id)
    return study_card


@router.delete("/{study_card_id}", status_code=204, description="Delete a Study Card")
def delete_study_card(
        study_card_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    delete_card(db=db, user_id=current_user.id, study_card_id=study_card_id)


@router.patch(
    "/update-mastery-by-name",
    response_model=StudyCardResponseTmp,
    summary="Update mastery level for a topic by its name"
)
def update_mastery_level_for_topic_by_name(
        request_body: UpdateMasteryByTopicNameRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Updates the 'mastery_level' of a single topic node within a study card's
    knowledge tree, identifying the node by its parent topic and subtopic name.
    """
    updated_study_card = update_topic_mastery_by_name(
        db=db,
        user_id=current_user.id,
        request=request_body
    )
    return updated_study_card


@router.get(
    "/{study_card_id}/focused-study/status",
    response_model=FocusStudyStatusResponse
)
def get_focus_study_status_for_card(
        study_card_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    status = get_focus_status_for_card(
        db=db,
        user_id=current_user.id,
        study_card_id=study_card_id
    )
    return status


@router.get(
    "/{study_card_id}/knowledge-tree/status",
    response_model=KnowledgeTreeStatusResponse
)
def get_knowledge_tree_status_for_card(
        study_card_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    status = get_tree_status_for_card(
        db=db,
        user_id=current_user.id,
        study_card_id=study_card_id
    )
    return status


@router.get(
    "/{study_card_id}/knowledge-tree",
    response_model=KnowledgeTreeResponse,
    summary="Get the Knowledge Tree for a specific Study Card"
)
def get_knowledge_tree_for_card(
        study_card_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    """
    Retrieves the knowledge_tree JSON object for a given study_card_id.
    Ensures that the user requesting the tree is the owner of the study card.
    Returns the tree or null if it has not been generated yet.
    """
    study_card = get_user_study_cards_by_id_without_resources(
        db=db,
        user_id=current_user.id,
        study_card_id=study_card_id
    )
    return study_card
