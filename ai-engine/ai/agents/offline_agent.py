import functools
from typing import List
import os

from langchain_openai import ChatOpenAI
from langchain_core.tools import Tool
from langchain.agents import (
    create_react_agent,
    AgentExecutor,
    create_openai_tools_agent
)
from ai.tools.tools import answer_from_documents, use_calculator
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
try:
    from langchain_community.chat_message_histories import RedisChatMessageHistory
except ImportError:
    from langchain_redis import RedisChatMessageHistory

def ask_chat_offline(query: str, user_id: int, session_id: str, api_key: str, model: str, temperature: float, filenames: List) -> str:
    """
    Initializes and runs a ReAct agent to answer a user's query.
    """
    try:
        llm = ChatOpenAI(
            api_key=api_key,
            model_name=model,
            temperature=temperature
        )

        answer_from_docs_with_context = functools.partial(
            answer_from_documents.func, user_id=user_id, llm=llm, filenames=filenames
        )
        rag_tool = Tool(
            name="answer_from_documents",
            func=answer_from_docs_with_context,
            description=answer_from_documents.description
        )

        calc_with_context = functools.partial(
            use_calculator.func, llm=llm
        )
        calculator_tool = Tool(
            name="Calculator",
            func=calc_with_context,
            description=use_calculator.description
        )

        tools = [rag_tool, calculator_tool]

        prompt = ChatPromptTemplate.from_messages([
            ("system", """
    Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE. Jesteś wyspecjalizowanym i pomocnym asystentem. Twoja wiedza jest ograniczona wyłącznie do informacji zawartych w dokumentach użytkownika. Nie masz dostępu do internetu. Twoim głównym celem jest udzielanie trafnych odpowiedzi wyłącznie na podstawie tych danych.

    Masz dostęp do następujących narzędzi:
    - **answer_from_documents**: Używaj tego narzędzia do pytań wymagających informacji. Przeszukuje WYŁĄCZNIE prywatną bazę wiedzy użytkownika.
    - **Calculator**: Używaj tego narzędzia do pytań matematycznych lub obliczeń.

    ## Zasady działania:
    1.  Najpierw zawsze konsultuj historię rozmowy (`chat_history`), aby zrozumieć pełny kontekst pytania użytkownika.
    2.  Analizuj bieżące zapytanie (`input`) i wybierz najlepsze działanie według priorytetów:
        a. Do pytań matematycznych użyj narzędzia `Calculator`.
        b. Do pytań informacyjnych użyj narzędzia `answer_from_documents`.
        c. Do pytań konwersacyjnych lub o rozmowę odpowiadaj bezpośrednio na podstawie `chat_history`, bez użycia narzędzi.
    3.  Jeśli nie możesz znaleźć odpowiedzi w dokumentach, jasno to zakomunikuj. Powiedz np.: "Nie znalazłem odpowiedzi na Twoje pytanie w dostarczonych dokumentach." NIE przepraszaj nadmiernie i NIE odpowiadaj z własnej wiedzy ogólnej. Bądź szczery co do ograniczeń.
    """),
            # This placeholder is where the memory object will inject the conversation history
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        message_history = RedisChatMessageHistory(
            session_id=f"chat:{session_id}",
            url=redis_url,
        )

        memory = ConversationBufferMemory(
            memory_key="chat_history",
            chat_memory=message_history,
            return_messages=True
        )

        agent = create_openai_tools_agent(llm=llm, tools=tools, prompt=prompt)
        agent_executor = AgentExecutor(
            agent=agent,
            memory=memory,
            tools=tools,
            verbose=True,
            handle_parsing_errors=True
        )

        response = agent_executor.invoke({"input": query})
        return response.get("output", "An error occurred while processing the response.")

    except Exception as e:
        print(f"An error occurred in the agent: {e}")
        return "Sorry, I encountered an internal error and could not answer your question."