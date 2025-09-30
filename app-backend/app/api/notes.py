from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.decorators.check_usage_limit import check_usage_limit
from app.decorators.token import get_current_user_from_cookie
from app.models.usage_stat import UsageStats
from app.models.user import User
from app.schemas.notes import NotesGenerate, NotesOut, NotesSave, NoteGet, NotesEdit, NoteEnhance
from app.services.notes_service import generate_notes, save_user_note, get_user_notes, delete_note, edit_user_note, \
    enhance_note

router = APIRouter()


@router.post("/generate", response_model=NotesOut)
@check_usage_limit("number_of_notes", "max_number_of_notes")
@check_usage_limit("number_of_generating_notes", "max_number_of_generating_notes")
async def generate(
        notes_data: NotesGenerate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    content = await generate_notes(current_user.id, notes_data)

    note_data = NotesSave(
        title=f"{notes_data.topic or 'Untitled'} - Study Notes",
        content=content,
        is_generated=True
    )

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=current_user.id) \
        .first()
    usage_stats.number_of_generating_notes += 1

    db.commit()

    note_id = save_user_note(db, note_data, current_user.id)

    return NotesOut(
        id=note_id,
        content=content
    )


@router.get("/", response_model=List[NoteGet])
def get_note(
        offset: int = Query(0, ge=0),
        limit: int = Query(10, ge=1),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    notes = get_user_notes(db, current_user.id, offset, limit)
    return notes


@router.post("/create")
@check_usage_limit("number_of_notes", "max_number_of_notes")
def save_notes(
        note_data: NotesSave,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    note_id = save_user_note(db, note_data, current_user.id)
    return {"id": note_id}


@router.patch("/edit")
def update_notes(
        note_data: NotesEdit,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    edit_user_note(db, note_data, current_user.id)
    return {"message": "Note edited"}


@router.delete("/{note_id}")
def delete_notes(
        note_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    delete_note(db, current_user.id, note_id)
    return {"message": "Note deleted"}


@router.post("/enhance", response_model=NotesOut)
@check_usage_limit("number_of_enhance_notes", "max_number_of_enhance_notes")
async def enhance(
        notes_data: NoteEnhance,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    content = await enhance_note(current_user.id, notes_data)

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=current_user.id) \
        .first()
    usage_stats.number_of_enhance_notes += 1

    db.commit()

    return NotesOut(
        content=content
    )
