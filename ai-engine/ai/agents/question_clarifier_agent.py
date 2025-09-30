import functools
import os
from typing import List

import cohere
from langchain.agents import (
    AgentExecutor,
    create_openai_tools_agent
)
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import Tool
from langchain_openai import ChatOpenAI

from ai.tools.tools import search_web, answer_from_documents

try:
    co_client = cohere.Client()
except cohere.errors.CohereError:
    print("Warning: COHERE_API_KEY not found. Reranking in RAG tool will be disabled.")
    co_client = None


def clarify_question_agent(
        user_id: int,
        original_question: str,
        user_message: str,
        session_id: str,
        all_possible_questions: List[str],
        correct_answers: List[str],
        user_answers: List[str],
        sources: List[str],
        api_key: str,
        model: str,
        temperature: float,
        history_ttl_seconds: int = 3600
) -> str:
    """
    Initializes and runs a specialized conversational agent to clarify a specific question.
    The conversation history for this agent is temporary and will expire after a period of inactivity.
    """
    try:
        llm = ChatOpenAI(
            api_key=api_key,
            model_name=model,
            temperature=temperature
        )
        search_web_with_context = functools.partial(
            search_web.func, user_id=user_id, llm=llm
        )
        search_web_tool = Tool(
            name="search_web",
            func=search_web_with_context,
            description=search_web.description
        )

        answer_from_docs_with_context = functools.partial(
            answer_from_documents.func,
            user_id=user_id,
            llm=llm,
            filenames=sources,
            cohere_client=co_client
        )
        rag_tool = Tool(
            name="answer_from_documents",
            func=answer_from_docs_with_context,
            description=answer_from_documents.description
        )

        tools = [search_web_tool, rag_tool]

        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE. Jesteś wyspecjalizowanym 'Asystentem Klarującym'.
            Twoim JEDYNYM celem jest pomóc użytkownikowi doprecyzować i wyjaśnić konkretne pytanie, które chce zadać innemu AI. Nie możesz, pod żadnym pozorem, samodzielnie odpowiadać na to pytanie.
            
            Oryginalne, potencjalnie niejasne pytanie użytkownika:
            ---
            Pytanie: "{original_question}"
            Wszystkie możliwe pytania: "{all_possible_questions}"
            Poprawne odpowiedzi: "{correct_answers}"
            Odpowiedzi użytkownika: "{user_answers}"
            ---
            
            Twoje zadania:
            1.  Rozmawiaj z użytkownikiem, aby zrozumieć, czego naprawdę chce się dowiedzieć.
            2.  Konsultuj historię rozmowy (`chat_history`), aby sprawdzić, czy pytanie dotyczy wcześniejszych wiadomości. Wykorzystaj ten kontekst w odpowiedzi.
            3.  Zadawaj pytania doprecyzowujące.
            4.  Skup się wyłącznie na doprecyzowaniu oryginalnego pytania.
            5.  Możesz używać narzędzi search_web i answer_from_documents, gdzie answer_from_documents ma priorytet.
            """),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        if "localhost" in redis_url:
            print(
                "Warning: REDIS_URL is not set and is defaulting to localhost. This will not work in Docker. Please set REDIS_URL=redis://redis:6379/0 in your .env file.")

        message_history = RedisChatMessageHistory(
            session_id=f"clarification_chat:{session_id}",
            url=redis_url,
            ttl=history_ttl_seconds
        )

        memory = ConversationBufferMemory(
            memory_key="chat_history",
            chat_memory=message_history,
            return_messages=True
        )

        agent = create_openai_tools_agent(llm=llm, tools=tools, prompt=prompt)

        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            memory=memory,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=4
        )

        response = agent_executor.invoke({"input": user_message})
        return response.get("output", "An error occurred while processing the response.")

    except Exception as e:
        print(f"An error occurred in the clarification agent: {e}")
        return "Sorry, I encountered an internal error and could not continue the clarification."
