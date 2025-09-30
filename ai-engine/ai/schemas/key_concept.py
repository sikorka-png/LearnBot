from pydantic import BaseModel, Field

class KeyConceptOutput(BaseModel):
    """Schemat odpowiedzi z LLM dla jednego konceptu."""
    concept_title: str
    concept_explanation: str

class SingleConceptParams(BaseModel):
    """Parametry wejściowe do wygenerowania JEDNEGO konceptu."""
    topic_name: str
    subtopic_name: str
    source_text: str = Field(description="Pełny kontekst tekstowy dla danego podtematu.")