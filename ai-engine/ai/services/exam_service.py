from ai.agents.exam_agent import generate_questions_from_rag, check_text_answers
from ai.agents.question_clarifier_agent import clarify_question_agent
from ai.schemas.exam import ExamGenerateParams, QuestionClarificationPayload, TextQuestion


class ExamService:
    def __init__(self, api_key, default_model="gpt-4o-mini", default_temperature=0.7):
        self.api_key = api_key
        self.default_model = default_model
        self.default_temperature = default_temperature

    def generate_questions(self, exam_params: ExamGenerateParams, model=None, temperature=None):
        model = model or self.default_model
        temperature = temperature or self.default_temperature

        questions = generate_questions_from_rag(exam_params, model, temperature)

        return questions

    def clarify_question(self, payload: QuestionClarificationPayload, model=None, temperature=None) -> str:
        model = model or self.default_model
        temperature = temperature or self.default_temperature

        print(payload)

        agent_response = clarify_question_agent(
            user_id=payload.user_id,
            original_question=payload.original_question,
            user_message=payload.user_message,
            session_id=payload.session_id,
            all_possible_questions=payload.all_possible_questions,
            correct_answers=payload.correct_answers,
            user_answers=payload.user_answers,
            sources=payload.sources,
            api_key=self.api_key,
            model=model,
            temperature=temperature
        )
        return agent_response

    def check_answer(self, question: TextQuestion, model=None, temperature=None):
        model = model or self.default_model
        temperature = temperature or self.default_temperature

        answer = check_text_answers(question, model, temperature)

        return answer
