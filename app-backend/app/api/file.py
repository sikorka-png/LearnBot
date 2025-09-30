from typing import List

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.decorators.check_storage_limit import check_storage_limit, check_storage_limit_for_url
from app.decorators.check_usage_limit import check_usage_limit
from app.decorators.token import get_current_user_from_cookie
from app.models.user import User
from app.schemas.file import FileCreate
from app.schemas.file import FileOut
from app.services import file_service
from app.services.file_service import get_user_files, delete_user_file, create_embeddings, upload_url, \
    create_url_embeddings, is_file_used

router = APIRouter()


@router.post("/upload")
@check_storage_limit(file_param="upload_file", inject_param="upload_size_bytes")
@check_usage_limit("number_of_files", "max_number_of_files")
def insert(
        upload_file: UploadFile = File(...),
        upload_size_bytes: int | None = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    new_file = FileCreate(
        filename=upload_file.filename,
        size=upload_size_bytes,
        user_id=current_user.id,
        type="file"
    )

    try:
        file_id = file_service.upload_file(db, new_file, size_bytes=upload_size_bytes)
    except Exception:
        raise HTTPException(status_code=401, detail="Failed to insert to SQL")

    try:
        create_embeddings(current_user.id, upload_file)
    except Exception:
        db.rollback()
        raise Exception("Failed to insert to Pinecone")

    return {"id": file_id}


@router.post("/upload/note")
@check_storage_limit(file_param="upload_file", inject_param="upload_size_bytes")
@check_usage_limit("number_of_files", "max_number_of_files")
def insert(
        upload_file: UploadFile = File(...),
        upload_size_bytes: int | None = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    new_file = FileCreate(
        filename=upload_file.filename,
        size=upload_size_bytes,
        user_id=current_user.id,
        type="note"
    )

    try:
        file_id = file_service.upload_file(db, new_file)
    except Exception:
        raise HTTPException(status_code=401, detail="Failed to insert to SQL")

    try:
        create_embeddings(current_user.id, upload_file)
    except Exception:
        db.rollback()
        raise Exception("Failed to insert to Pinecone")

    return {"id": file_id}


@router.post("/upload/url")
@check_storage_limit_for_url(url_param="url", inject_param="url_size_bytes")
@check_usage_limit("number_of_files", "max_number_of_files")
def insert_url(
        url: str,
        url_size_bytes: int | None = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    try:
        file_id = upload_url(db, url, current_user.id, size_bytes=url_size_bytes)
    except Exception:
        raise HTTPException(status_code=401, detail="Failed to insert to SQL")

    try:
        create_url_embeddings(current_user.id, url)
    except Exception:
        db.rollback()
        raise Exception("Failed to insert to Pinecone")

    return {"id": file_id}


@router.get("/list", response_model=List[FileOut])
def list_files(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    files = get_user_files(db, current_user.id)
    return files


@router.delete("/{file_id}")
def delete_file(
        file_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    try:
        delete_user_file(db, current_user.id, file_id)
    except FileNotFoundError:
        raise HTTPException(status_code=401, detail="Missing file")

    return {"message": "File deleted"}


@router.get("/used/{file_id}")
def is_used(
        file_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    used = is_file_used(db, current_user.id, file_id)
    return {"used": used}
