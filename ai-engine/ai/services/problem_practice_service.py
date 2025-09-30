from ai.agents.practice_problem_agent import generate_practice_problem
from ai.schemas.problem_practice import ProblemGenerationParams, PracticeProblemOutput


class PracticeProblemService:
    def __init__(self, api_key: str, default_model: str = "gpt-4o-mini", default_temperature = 0.7):
        self.api_key = api_key
        self.default_model = default_model
        self.default_temperature = float(default_temperature)

    def create_single_problem(self, request: ProblemGenerationParams, model: str = None,
                              temperature: float = None) -> PracticeProblemOutput:
        final_model = model or self.default_model
        final_temperature = temperature or self.default_temperature

        problem = generate_practice_problem(
            params=request,
            model=final_model,
            temperature=final_temperature
        )
        if not problem:
            raise ValueError("Failed to generate a Practice Problem due to an internal AI error.")

        return problem