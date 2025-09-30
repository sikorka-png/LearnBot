from ai.agents.key_concept_agent import generate_single_key_concept
from ai.schemas.key_concept import SingleConceptParams, KeyConceptOutput

class KeyConceptService:
    def __init__(self, api_key, default_model="gpt-4o-mini", default_temperature=0.7):
        self.api_key = api_key
        self.default_model = default_model
        self.default_temperature = float(default_temperature)

    def create_single_concept(self, request: SingleConceptParams, model=None, temperature=None) -> KeyConceptOutput:
        final_model = model or self.default_model
        final_temperature = temperature or self.default_temperature

        concept = generate_single_key_concept(
            params=request,
            model=final_model,
            temperature=final_temperature
        )
        if not concept:
            raise ValueError("Failed to generate Key Concept due to an internal AI error.")
        return concept