import functools
import os
from typing import List

from langchain_openai import ChatOpenAI
from langchain_core.tools import Tool
from langchain.agents import (
    create_react_agent,
    AgentExecutor,
    create_openai_tools_agent
)
from langchain import hub
from ai.tools.tools import answer_from_documents, search_web, use_calculator
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories import RedisChatMessageHistory
import cohere

try:
    co_client = cohere.Client()
except cohere.errors.CohereError:
    print("Warning: COHERE_API_KEY not found. Reranking in RAG tool will be disabled.")
    co_client = None

def ask_chat(query: str, user_id: int, session_id: str, api_key: str, model: str, temperature: float, filenames: List) -> str:
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
            answer_from_documents.func,
            user_id=user_id,
            llm=llm,
            filenames=filenames,
            cohere_client=co_client
        )
        rag_tool = Tool(
            name="answer_from_documents",
            func=answer_from_docs_with_context,
            description=answer_from_documents.description
        )
        search_web_with_context = functools.partial(
            search_web.func, user_id=user_id, llm=llm
        )
        search_web_tool = Tool(
            name="search_web",
            func=search_web_with_context,
            description=search_web.description
        )
        calc_with_context = functools.partial(
            use_calculator.func, llm=llm
        )
        calculator_tool = Tool(
            name="Calculator",
            func=calc_with_context,
            description=use_calculator.description
        )

        tools = [rag_tool, search_web_tool, calculator_tool]

        #prompt = hub.pull("hwchase17/openai-tools-agent")

        prompt = ChatPromptTemplate.from_messages([
            ("system", """
    Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE. Jesteś bardzo inteligentnym i pomocnym asystentem. Twoim głównym celem jest udzielanie trafnych i rzeczowych odpowiedzi użytkownikowi.

    Masz dostęp do następujących narzędzi:
    - **answer_from_documents**: Używaj tego NARZĘDZIA JAKO PIERWSZEGO do pytań wymagających informacji. Przeszukuje prywatną bazę wiedzy użytkownika.
    - **search_web**: Używaj tego narzędzia TYLKO jeśli 'answer_from_documents' nie zwróci żadnych istotnych informacji. Przeszukuje publiczny internet.
    - **Calculator**: Używaj tego narzędzia do pytań matematycznych lub obliczeń.

    ## Zasady działania:
    1.  Analizuj zapytanie użytkownika, aby zrozumieć jego intencje.
    2.  Konsultuj historię rozmowy (`chat_history`), aby sprawdzić, czy pytanie dotyczy wcześniejszych wiadomości. Wykorzystaj ten kontekst w odpowiedzi.
    3.  Do pytań informacyjnych: NAJPIERW użyj narzędzia `answer_from_documents`. Jeśli nic nie znajdziesz, możesz użyć `search_web`.
    4.  Do pytań matematycznych: użyj narzędzia `Calculator`.
    5.  Do pytań konwersacyjnych (np. "jak się masz?") lub bezpośrednich pytań o rozmowę (np. "jak się nazywam?"): Odpowiedz bezpośrednio na podstawie `chat_history`, bez użycia narzędzi.
    6.  Odpowiadaj bezpośrednio i zwięźle. Jeśli znasz odpowiedź, podaj ją jasno.
    """),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        #redis_client = redis.from_url(redis_url)
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        if "localhost" in redis_url:
            print(
                "Warning: REDIS_URL is not set and is defaulting to localhost. This will not work in Docker. Please set REDIS_URL=redis://redis:6379/0 in your .env file.")

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
            tools=tools,
            memory=memory,
            verbose=True,
            handle_parsing_errors=True
        )

        response = agent_executor.invoke({"input": query})
        return response.get("output", "An error occurred while processing the response.")

    except Exception as e:
        print(f"An error occurred in the agent: {e}")
        return "Sorry, I encountered an internal error and could not answer your question."