from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.decorators.check_usage_limit import check_usage_limit
from app.decorators.token import get_current_user_from_cookie
from app.models.user import User
from app.schemas.chat import ChatGroupOut, ChatGroupCreate, ChatSessionOut, MessageOut, MessageIn
from app.services import chat_service
from app.services.chat_service import get_user_groups, delete_user_group, get_user_history, get_chat_history, \
    delete_user_chat, get_user_general, edit_user_group

router = APIRouter()


@router.get("/history", response_model=List[ChatSessionOut])
def get_history(
        offset: int = Query(0, ge=0),
        limit: int = Query(10, ge=1),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    history = get_user_history(db, current_user.id, offset, limit)
    return history


@router.delete("/history/{chat_id}")
def get_history(
        chat_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    delete_user_chat(db, current_user.id, chat_id)
    return {"message": "Chat deleted"}


@router.get("/groups", response_model=List[ChatGroupOut])
def get_groups(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    groups = get_user_groups(db, current_user.id)
    return groups


@router.get("/group/general", response_model=ChatGroupOut)
def get_groups(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    group = get_user_general(db, current_user.id)
    return group


@router.post("/group/create", response_model=ChatGroupOut)
@check_usage_limit("chat_groups", "max_chat_groups")
def create_group(
        group_data: ChatGroupCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    new_group = chat_service.create_group(db, current_user.id, group_data)
    return new_group


@router.put("/group/{group_id}")
def edit_group(
        group_id: int,
        group_data: ChatGroupCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    edit_user_group(db, current_user.id, group_id, group_data)
    return {"message": "Group edited"}


@router.delete("/group/{group_id}")
def delete_group(
        group_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    delete_user_group(db, current_user.id, group_id)
    return {"message": "Group deleted"}


@router.get("/messages/{chat_id}", response_model=List[MessageOut])
def get_chat_messages(
        chat_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    messages = get_chat_history(db, current_user.id, chat_id)
    return messages


@router.post("/message/send", response_model=MessageOut)
@check_usage_limit("chat_messages", "max_chat_messages")
async def send_message(
        message_in: MessageIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    response = await chat_service.send_message(db, message_in, current_user.id)

    return response
