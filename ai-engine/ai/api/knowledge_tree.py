import os

from fastapi import APIRouter, HTTPException
from ai.agents.tree_builder_agent import generate_knowledge_tree
from ai.schemas.knowledge_tree import KnowledgeTreeParams, \
    KnowledgeTreeCreateRequest
from typing import Dict, Any
from dotenv import load_dotenv

from ai.services import knowledge_tree_service
from ai.services.knowledge_tree_service import KnowledgeTreeService

router = APIRouter()
load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
if not openai_key:
    raise ValueError(
        "OpenAI API key not found. Please add OPENAI_API_KEY_TEG to your config/.env file."
    )
default_model = os.getenv("DEFAULT_MODEL")
default_temperature = os.getenv("DEFAULT_TEMPERATURE")

knowledge_tree_service = KnowledgeTreeService(openai_key, default_model, default_temperature)

@router.post(
    "/knowledge-tree/generate",
    summary="Generate a Knowledge Tree from user materials"
)
def generate_tree_endpoint(params: KnowledgeTreeCreateRequest) -> Dict[str, Any]:
    try:
        knowledge_tree = knowledge_tree_service.create_user_knowledge_tree(params)
        return knowledge_tree
    except Exception as e:
        print(f"Error in AI engine while generating tree: {e}")
        raise HTTPException(status_code=500, detail=f"Internal AI Engine Error: {str(e)}")