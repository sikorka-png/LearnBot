from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi import UploadFile, File, HTTPException

from app.decorators.contact import as_form
from app.schemas.contact import ContactIn
from app.services.email_service import send_email, build_email

router = APIRouter()

MAX_FILES = 5
MAX_FILE_BYTES = 10 * 1024 * 1024


@router.post("/message/send")
async def send_message(
        background_tasks: BackgroundTasks,
        contact_data: ContactIn = Depends(as_form),
        attachments: Optional[List[UploadFile]] = File(None)
):
    files_payload = []
    if attachments:
        if len(attachments) > MAX_FILES:
            raise HTTPException(status_code=400, detail=f"Max {MAX_FILES} attachments")
        for up in attachments:
            content = await up.read()
            if len(content) > MAX_FILE_BYTES:
                raise HTTPException(status_code=400, detail=f"File {up.filename} exceeds 10MB")
            files_payload.append({
                "content": content,
                "filename": up.filename,
                "content_type": up.content_type
            })

    em = build_email(contact_data, files_payload)
    background_tasks.add_task(send_email, em)
    return {"ok": "Message queued"}
