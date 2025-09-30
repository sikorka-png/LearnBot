from typing import List

import httpx
from fastapi import HTTPException
from sqlalchemy import not_, and_
from sqlalchemy.orm import Session, joinedload

from app.exceptions.chat_exception import GroupNotFoundException, ChatNotFoundException
from app.exceptions.token_exception import UnauthorizedException
from app.models.chat import Chat
from app.models.chat_group import ChatGroup
from app.models.file import File
from app.models.message import Message, RoleEnum
from app.models.usage_stat import UsageStats
from app.schemas.chat import ChatGroupCreate, ChatGroupOut, MessageIn, MessageOut, ChatSessionOut


async def send_message(db: Session, message_in: MessageIn, user_id: int):
    group = None
    if message_in.chat_id:
        chat = db.query(Chat).filter_by(id=message_in.chat_id).first()
        if not chat:
            raise ChatNotFoundException()

        if chat.group.user_id != user_id:
            raise UnauthorizedException()
    else:
        group = db.query(ChatGroup).filter_by(id=message_in.group_id, user_id=user_id).first()
        if not group:
            raise ChatNotFoundException()

        if group.user_id != user_id:
            raise UnauthorizedException()

        chat = Chat(title=message_in.content, group=group)
        db.add(chat)
        db.commit()
        db.refresh(chat)

    user_msg = Message(content=message_in.content, role=RoleEnum.user, chat=chat)
    db.add(user_msg)

    try:
        if not group:
            group = db.query(ChatGroup).filter_by(id=message_in.group_id, user_id=user_id).first()
        filenames = [g.filename for g in group.files]
        response_ai_msg = await get_chat_response(message_in.content, user_id, filenames, chat.id,
                                                  group.internetConnection)
    except Exception:
        raise Exception()
    ai_msg = Message(content=response_ai_msg, role=RoleEnum.assistant, chat=chat)
    db.add(ai_msg)

    db.commit()
    db.refresh(user_msg)
    db.refresh(ai_msg)

    usage_stats = db.query(UsageStats)\
        .filter_by(user_id=user_id)\
        .first()
    usage_stats.chat_messages += 1

    db.commit()

    return MessageOut(
        id=ai_msg.id,
        content=ai_msg.content,
        role=ai_msg.role,
        date=ai_msg.date.isoformat(),
        chat_id=chat.id
    )


async def get_chat_response(message: str, user_id: int, filenames: List[str], chat_id: str,
                            internet_connection: bool) -> str:
    timeout = httpx.Timeout(180.0, connect=5.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        payload = {
            "human_message": message,
            "user_id": user_id,
            "filenames": filenames,
            "session_id": str(chat_id),
            "internet_connection": internet_connection
        }

        ai_engine_internal_url = "http://ai-engine:8000"

        try:
            response = await client.post(
                f"{ai_engine_internal_url}/chat/send/message",
                json=payload
            )

            response.raise_for_status()

            return response.json()["response"]

        except httpx.ReadTimeout:
            print("ERROR: Timeout occurred while waiting for ai-engine.")
            raise HTTPException(status_code=504, detail="The AI service took too long to respond.")

        except httpx.HTTPStatusError as exc:
            print(f"ERROR: HTTP error from ai-engine: {exc.response.status_code}")
            print(f"ERROR: Response body: {exc.response.text}")
            raise HTTPException(status_code=503, detail="The AI service returned an error.")

        except httpx.RequestError as exc:
            print(f"ERROR: Could not connect to ai-engine. Details: {exc}")
            raise HTTPException(status_code=503, detail="The AI service is currently unavailable.")

        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            raise HTTPException(status_code=500,
                                detail="An unexpected error occurred while communicating with the AI service.")


def get_user_groups(db: Session, user_id: int):
    groups = db.query(ChatGroup).filter(
        ChatGroup.user_id == user_id,
        not_(
            and_(
                ChatGroup.name == "General",
                ChatGroup.description == "Default general chat",
                ChatGroup.color == "gray"
            )
        )
    ).all()

    return [
        ChatGroupOut(
            id=str(group.id),
            name=group.name,
            description=group.description,
            color=group.color,
            materials=[f.filename for f in group.files],
            chatCount=len(group.chats),
            internetConnection=group.internetConnection
        )
        for group in groups
    ]


def get_user_general(db: Session, user_id: int):
    group = db.query(ChatGroup).filter(
        ChatGroup.user_id == user_id,
        and_(
            ChatGroup.name == "General",
            ChatGroup.description == "Default general chat",
            ChatGroup.color == "gray"
        )
    ).first()

    return ChatGroupOut(
        id=str(group.id),
        name=group.name,
        description=group.description,
        color=group.color,
        materials=[f.filename for f in group.files],
        chatCount=len(group.chats),
        internetConnection=group.internetConnection
    )


def create_group(db: Session, user_id: int, group_data: ChatGroupCreate):
    files = db.query(File).filter(
        File.user_id == user_id,
        File.filename.in_(group_data.materials)
    ).all()

    new_group = ChatGroup(
        name=group_data.name,
        description=group_data.description,
        color=group_data.color,
        user_id=user_id,
        files=files,
        internetConnection=group_data.internetConnection
    )

    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=user_id) \
        .first()
    usage_stats.chat_groups += 1

    db.commit()

    return ChatGroupOut(
        id=str(new_group.id),
        name=new_group.name,
        description=new_group.description,
        color=new_group.color,
        chatCount=len(new_group.chats),
        materials=[f.filename for f in new_group.files],
        internetConnection=new_group.internetConnection
    )


def edit_user_group(db: Session, user_id: int, group_id: int, group_data: ChatGroupCreate):
    group = db.query(ChatGroup).filter(ChatGroup.user_id == user_id, ChatGroup.id == group_id).first()
    if not group:
        raise GroupNotFoundException()

    if group.name == "General" and group.description == "Default general chat" and group.color == "gray":
        raise UnauthorizedException()

    files = db.query(File).filter(
        File.user_id == user_id,
        File.filename.in_(group_data.materials)
    ).all()

    group.name = group_data.name
    group.description = group_data.description
    group.color = group_data.color
    group.files = files
    group.internetConnection = group_data.internetConnection

    db.commit()


def delete_user_group(db: Session, user_id: int, group_id: int):
    group = db.query(ChatGroup).filter(ChatGroup.user_id == user_id, ChatGroup.id == group_id).first()
    if not group:
        raise GroupNotFoundException()

    if group.name == "General" and group.description == "Default general chat" and group.color == "gray":
        raise UnauthorizedException()

    db.delete(group)
    db.commit()

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=user_id) \
        .first()
    usage_stats.chat_groups -= 1

    db.commit()


def get_user_history(db: Session, user_id: int, offset: int = 0, limit: int = 10) -> List[ChatSessionOut]:
    chats = (
        db.query(Chat)
        .join(ChatGroup)
        .filter(ChatGroup.user_id == user_id)
        .options(joinedload(Chat.messages), joinedload(Chat.group))
        .order_by(Chat.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        ChatSessionOut(
            id=str(chat.id),
            title=chat.title,
            groupId=str(chat.group.id),
            groupName=chat.group.name,
            lastMessage=chat.messages[-1].content if chat.messages else "",
            timestamp=chat.created_at,
            messageCount=len(chat.messages)
        )
        for chat in chats
    ]


def get_chat_history(db: Session, user_id: int, chat_id: int):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()

    if chat is None:
        raise ChatNotFoundException()

    if chat.group.user_id != user_id:
        raise UnauthorizedException()

    return [
        MessageOut(
            id=message.id,
            content=message.content,
            role=message.role,
            date=message.date.isoformat(),
            chat_id=message.chat_id
        )
        for message in sorted(chat.messages, key=lambda m: m.date)
    ]


def delete_user_chat(db: Session, user_id: int, chat_id: int):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()

    if chat is None:
        raise ChatNotFoundException()

    if chat.group.user_id != user_id:
        raise UnauthorizedException()

    db.delete(chat)
    db.commit()
