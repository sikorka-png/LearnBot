from typing import List, Dict, Any
from pydantic import BaseModel, Field

class KnowledgeTreeParams(BaseModel):
    user_id: int
    filenames: List[str]

from pydantic import BaseModel, Field
from typing import List, Optional

class KnowledgeTreeNode(BaseModel):
    """Rekurencyjny model reprezentujący pojedynczy węzeł w drzewie wiedzy."""
    topic_name: str = Field(..., description="Nazwa tego tematu lub podtematu, np. 'Indeksowanie w bazach danych'.")
    chunk_ids: List[str] = Field(
        default_factory=list
    )
    subtopics: Optional[List['KnowledgeTreeNode']] = Field(
        default_factory=list
    )

# Ta linia jest kluczowa dla Pydantic, aby poprawnie obsłużyć rekurencyjny typ List['KnowledgeTreeNode']
KnowledgeTreeNode.model_rebuild()

class KnowledgeTree(BaseModel):
    """Kompletny schemat drzewa wiedzy, zaczynający się od listy węzłów głównych."""
    tree: List[KnowledgeTreeNode] = Field(..., description="Lista głównych (korzeniowych) tematów drzewa wiedzy.")

class KnowledgeTreeCreateRequest(BaseModel):
    user_id: int
    filenames: List[str]

class KnowledgeTreeResponse(BaseModel):
    message: str
    tree: Dict[str, Any]