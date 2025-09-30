from typing import Dict, Any
from ai.schemas.knowledge_tree import KnowledgeTreeCreateRequest

from ai.agents.tree_builder_agent import generate_knowledge_tree
from ai.schemas.knowledge_tree import KnowledgeTreeParams
from ai.agents.notes_agent import get_all_chunks_for_material

class KnowledgeTreeService:
    def __init__(self, api_key, default_model="gpt-4o-mini", default_temperature=0.7):
        self.api_key = api_key
        self.default_model = default_model
        self.default_temperature = float(default_temperature)

    def create_user_knowledge_tree(self, request: KnowledgeTreeCreateRequest, model=None, temperature=None) -> Dict[str, Any]:
        """
        Orkiestruje proces generowania drzewa wiedzy dla użytkownika.
        """
        print(f"Starting knowledge tree generation for user_id: {request.user_id}...")
        final_model = model or self.default_model
        final_temperature = temperature or self.default_temperature

        agent_params = KnowledgeTreeParams(
            user_id=request.user_id,
            filenames=request.filenames
        )

        try:
            knowledge_tree = generate_knowledge_tree(
                params=agent_params,
                model=final_model,
                temperature=final_temperature
            )
        except Exception as e:
            print(f"Error during knowledge tree generation: {e}")
            raise ValueError(f"Failed to generate knowledge tree due to an internal error: {e}")

        if not knowledge_tree:
            raise ValueError("Knowledge tree could not be generated. The material might be empty or invalid.")


        print("Knowledge tree generated successfully.")
        return knowledge_tree