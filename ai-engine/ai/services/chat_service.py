from typing import List

from ai.agents.chat_agent import ask_chat
from ai.agents.offline_agent import ask_chat_offline


class ChatService:
    def __init__(self, api_key, default_model="gpt-4o-mini", default_temperature=0.7):
        self.api_key = api_key
        self.default_model = default_model
        self.default_temperature = default_temperature

    def get_response(self, human_message: str, user_id: int, session_id: str, filenames:List, system_message=None, model=None, temperature=None,
                     web_search:bool=True) -> str:
        """
        Gets a response from the chat agent for a given user.

        Args:
            human_message: The user's input message/query.
            user_id: The unique identifier for the user, required for RAG.
            system_message: (Currently unused by the agent) An optional system prompt.
            model: The LLM model to use.
            temperature: The temperature for the LLM.
            web_search: Whether or not to use the web search engine.
            filenames: The filenames to use.
            session_id: The session ID to use.

        Returns:
            The agent's final answer.
        """
        model = model or self.default_model
        temperature = temperature or self.default_temperature

        if web_search:
            response = ask_chat(
                query=human_message,
                user_id=user_id,
                session_id=session_id,
                api_key=self.api_key,
                model=model,
                temperature=temperature,
                filenames=filenames,
            )
        else:
            response = ask_chat_offline(
                query=human_message,
                user_id=user_id,
                session_id=session_id,
                api_key=self.api_key,
                model=model,
                temperature=temperature,
                filenames=filenames,
            )
        return response