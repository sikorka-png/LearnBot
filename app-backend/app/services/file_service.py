import json

import httpx
from fastapi import UploadFile
from sqlalchemy import select, exists
from sqlalchemy.orm import Session

from app.models.chat_group import ChatGroup
from app.models.chatgroup_file_association import chatgroup_file_table
from app.models.file import File
from app.models.usage_stat import UsageStats


def does_file_exists(db: Session, user_id: int, filename: str):
    return db.query(File).filter(File.user_id == user_id, File.filename == filename).first()


def upload_file(db: Session, file_data, *, size_bytes: int | None = None):
    if does_file_exists(db, file_data.user_id, file_data.filename):
        raise FileExistsError()

    size_mb = int((size_bytes + (1024 * 1024 - 1)) // (1024 * 1024))

    file = File(filename=file_data.filename, size=size_mb, user_id=file_data.user_id, type=file_data.type)
    db.add(file)
    db.commit()
    db.refresh(file)

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=file_data.user_id) \
        .first()
    usage_stats.number_of_files += 1
    usage_stats.total_file_mb = (usage_stats.total_file_mb or 0) + size_mb

    db.commit()

    return file.id


def upload_url(db: Session, url: str, user_id: int, *, size_bytes: int | None = None):
    if does_file_exists(db, user_id, url):
        raise FileExistsError()

    size_mb = int((size_bytes + (1024 * 1024 - 1)) // (1024 * 1024))

    file = File(filename=url, user_id=user_id, type="url", size=size_mb)
    db.add(file)
    db.commit()
    db.refresh(file)

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=user_id) \
        .first()
    usage_stats.number_of_files += 1
    usage_stats.total_file_mb = (usage_stats.total_file_mb or 0) + size_mb

    db.commit()

    return file.id


def get_user_files(db: Session, user_id: int):
    return db.query(File.id, File.filename, File.type, File.created_at, File.size) \
        .filter(File.user_id == user_id) \
        .all()


def delete_user_file(db: Session, user_id: int, file_id: int):
    file = db.query(File).filter(File.id == file_id, File.user_id == user_id).first()
    if not file:
        raise FileNotFoundError()

    db.delete(file)

    try:
        response = httpx.delete(
            "http://ai-engine:8000/knowledge/user_id",
            params={"user_id": user_id, "file_name": file.filename},
            timeout=10.0
        )
        response.raise_for_status()
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to delete from Pinecone: {str(e)}")

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=user_id) \
        .first()
    usage_stats.number_of_files -= 1

    db.commit()


def create_embeddings(user_id: int, upload_file: UploadFile):
    try:
        with httpx.Client(timeout=30.0) as client:
            files = {
                "upload_file": (upload_file.filename, upload_file.file, upload_file.content_type)
            }
            response = client.post(
                "http://ai-engine:8000/knowledge/upload",
                params={"user_id": user_id},
                files=files
            )
            response.raise_for_status()
    except Exception as e:
        raise Exception(f"Failed to create embeddings: {str(e)}")


def create_url_embeddings(user_id: int, url: str):
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                "http://ai-engine:8000/knowledge/upload/url",
                params={"user_id": user_id},
                content=json.dumps(url),
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
    except Exception as e:
        raise Exception(f"Failed to create URL embeddings: {str(e)}")


def is_file_used(db: Session, user_id: int, file_id: int):
    stmt = (
        select(exists().where(
            chatgroup_file_table.c.file_id == file_id,
        ).where(
            chatgroup_file_table.c.chat_group_id == ChatGroup.id
        ).where(
            ChatGroup.user_id == user_id
        ))
    )
    result = db.execute(stmt).scalar()
    return result
