from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Query

from ai.services.pinecone_service import ingest_uploaded_file_to_knowledge_base, delete_file_embeddings, \
    ingest_url_to_knowledge_base

router = APIRouter()


@router.post("/upload")
def insert(user_id: int, upload_file: UploadFile = File(...)):
    try:
        ingest_uploaded_file_to_knowledge_base(upload_file, user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Unknown error")

    return {"message": "File uploaded"}


@router.post("/upload/url")
def insert(url: str = Body(...), user_id: int = Query(...)):
    try:
        ingest_url_to_knowledge_base(url, user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Unknown error")

    return {"message": "URL uploaded"}


@router.delete("/user_id")
def delete_file(user_id: int, file_name: str):
    try:
        delete_file_embeddings(user_id, file_name)
    except Exception:
        raise HTTPException(status_code=400, detail="Unknown error")

    return {"message": "File deleted"}
