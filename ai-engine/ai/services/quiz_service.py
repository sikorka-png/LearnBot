from ai.agents.quiz_agent import generate_quiz
from ai.schemas.quiz import QuizGenerateParams, QuizFromTreeParams


class QuizService:
    def __init__(self, api_key, default_model="gpt-4o-mini", default_temperature=0.7):
        self.api_key = api_key
        self.default_model = default_model
        self.default_temperature = float(default_temperature)

    def generate_quiz(self, quiz_params: QuizFromTreeParams, model=None, temperature=None):
        final_model = model or self.default_model
        final_temperature = temperature or self.default_temperature

        quiz = generate_quiz(
            params=quiz_params,
            model=final_model,
            temperature=final_temperature
        )
        return quiz
