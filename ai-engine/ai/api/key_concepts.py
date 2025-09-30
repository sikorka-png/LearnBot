import os
from fastapi import APIRouter, HTTPException
from ai.schemas.key_concept import SingleConceptParams, KeyConceptOutput
from ai.services.key_concepts_service import KeyConceptService
from dotenv import load_dotenv

router = APIRouter()
load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
default_model = os.getenv("DEFAULT_MODEL")
default_temperature = os.getenv("DEFAULT_TEMPERATURE")
key_concept_service = KeyConceptService(openai_key, default_model, default_temperature)

@router.post(
    "/generate-single",
    response_model=KeyConceptOutput,
    summary="Generate a single Key Concept"
)
def generate_single_concept_endpoint(params: SingleConceptParams):
    try:
        return key_concept_service.create_single_concept(params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))