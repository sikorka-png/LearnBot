import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.exceptions.note_exception import NoteNotFoundException
from app.models.notes import Note
from app.models.usage_stat import UsageStats
from app.schemas.notes import NotesSave, NotesEdit


def get_user_notes(db: Session, user_id: int, offset, limit):
    return db.query(Note.id, Note.title, Note.content, Note.created_at, Note.is_generated) \
        .filter(Note.user_id == user_id) \
        .offset(offset) \
        .limit(limit) \
        .all()


def save_user_note(db: Session, note_data: NotesSave, user_id: int):
    note = Note(title=note_data.title, content=note_data.content, is_generated=note_data.is_generated, user_id=user_id)

    db.add(note)
    db.commit()
    db.refresh(note)

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=user_id) \
        .first()
    usage_stats.number_of_notes += 1

    db.commit()

    return note.id


async def generate_notes(user_id: int, notes_data):
    timeout = httpx.Timeout(6000.0, connect=100.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                f"http://ai-engine:8000/notes/generate",
                json={
                    "user_id": user_id,
                    "topic": notes_data.topic,
                    "focus": notes_data.focus,
                    "filenames": notes_data.filenames
                }
            )

            response.raise_for_status()
            return response.json()["content"]

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


async def enhance_note(user_id: int, notes_data):
    timeout = httpx.Timeout(6000.0, connect=100.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                f"http://ai-engine:8000/notes/enhance",
                json={
                    "user_id": user_id,
                    "content": notes_data.content,
                    "improvement": notes_data.improvement,
                    "filenames": notes_data.filenames
                }
            )

            response.raise_for_status()
            return response.json()["content"]

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


def delete_note(db: Session, user_id: int, note_id: int):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user_id).first()
    if not note:
        raise NoteNotFoundException()

    db.delete(note)

    usage_stats = db.query(UsageStats) \
        .filter_by(user_id=user_id) \
        .first()
    usage_stats.number_of_notes -= 1

    db.commit()


def edit_user_note(db: Session, note_data: NotesEdit, user_id: int):
    note = db.query(Note).filter(Note.id == note_data.id, Note.user_id == user_id).first()
    if not note:
        raise NoteNotFoundException()

    note.title = note_data.title
    note.content = note_data.content

    db.commit()
    db.refresh(note)
