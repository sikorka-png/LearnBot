from ai.agents.focus_study_chat_helper_agent import focus_study_assistant_agent
from ai.schemas.focus_study_chat_helper import FocusStudyHelperParams


class FocusStudyChatHelperService:
    def __init__(self, api_key, default_model="gpt-4o-mini", default_temperature=0.7):
        self.api_key = api_key
        self.default_model = default_model
        self.default_temperature = default_temperature


    def clarify_question(self, payload: FocusStudyHelperParams, model=None, temperature=None) -> str:
        model = model or self.default_model
        temperature = temperature or self.default_temperature

        agent_response = focus_study_assistant_agent(
            params=payload,
            api_key=self.api_key,
            model=model,
            temperature=temperature
        )
        return agent_response