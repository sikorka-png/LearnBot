import os
import re

from dotenv import load_dotenv
from fastapi import APIRouter

from ai.schemas.notes import NotesGenerate, NoteEnhance
from ai.services.notes_service import NotesService

router = APIRouter()
load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
if not openai_key:
    raise ValueError(
        "OpenAI API key not found. Please add OPENAI_API_KEY_TEG to your config/.env file."
    )
default_model = os.getenv("DEFAULT_MODEL")
default_temperature = os.getenv("DEFAULT_TEMPERATURE")

notes_service = NotesService(
    api_key=openai_key,
    default_model=default_model,
    default_temperature=default_temperature
)


def clean_output(content: str):
    cleaned = content.strip()
    cleaned = re.sub(r"^```html\s*\n?", "", cleaned)
    cleaned = re.sub(r"```$", "", cleaned)
    cleaned = re.sub(r"^\n+", "", cleaned)
    cleaned = re.sub(r"\s*\n\s*", "\n", cleaned)
    cleaned = re.sub(r"\n{2,}", "\n", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"(</ul>|</ol>)\s*\n+", r"\1", cleaned)
    cleaned = re.sub(r"\n+(?=\s*<(ul|ol)[ >])", "", cleaned)
    cleaned = re.sub(r"(</h3>|</h4>)\s*\n+", r"\1", cleaned)
    return cleaned


@router.post("/generate")
def generate(notes_data: NotesGenerate):
    content = notes_service.generate_notes(notes_data)
    cleaned = clean_output(content)
    return {"content": cleaned}


@router.post("/enhance")
def enhance(notes_data: NoteEnhance):
    content = notes_service.enhance_notes(notes_data)
    cleaned = clean_output(content)
    return {"content": cleaned}
