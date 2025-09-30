from ai.agents.focus_study_answer_checker import grade_practice_note
from ai.schemas.focus_study_answer_checker import GradePracticeParams

class PracticeService:
    def __init__(self, api_key, default_model="gpt-4o-mini", default_temperature=0.2):
        self.api_key = api_key
        self.default_model = default_model
        self.default_temperature = float(default_temperature)

    def grade_note(self, params: GradePracticeParams, model=None, temperature=None) -> str:
        final_model = model or self.default_model
        final_temp = temperature or self.default_temperature
        return grade_practice_note(params=params, model=final_model, temperature=final_temp)
