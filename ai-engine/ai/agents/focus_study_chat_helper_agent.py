import functools
import os
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import Tool
from langchain_openai import ChatOpenAI
import cohere

from ai.tools.tools import search_web, answer_from_documents
from ai.schemas.focus_study_chat_helper import FocusStudyHelperParams


try:
    co_client = cohere.Client()
except cohere.errors.CohereError:
    print("Warning: COHERE_API_KEY not found. Reranking in RAG tool will be disabled.")
    co_client = None

def focus_study_assistant_agent(params: FocusStudyHelperParams, api_key: str, model: str, temperature: float,
                                history_ttl_seconds: int = 3600) -> str:
    """
    Agent konwersacyjny, który pomaga użytkownikowi zrozumieć materiały
    w sesji "Focus Study".
    """
    try:
        llm = ChatOpenAI(api_key=api_key, model_name=model, temperature=temperature)

        answer_from_docs_with_context = functools.partial(
            answer_from_documents.func,
            user_id=params.user_id,
            llm=llm,
            filenames=params.sources,
            cohere_client=co_client
        )
        rag_tool = Tool(
            name="answer_from_documents",
            func=answer_from_docs_with_context,
            description="Use this to answer questions based on the user's uploaded study materials. This should be your primary tool."
        )
        tools = [rag_tool]

        prompt = ChatPromptTemplate.from_messages([
            ("system", """
            Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE. Jesteś konwersacyjnym asystentem, który pomaga użytkownikowi zrozumieć materiały w sesji "Focus Study".
            Twoim celem jest wyjaśnianie, podpowiadanie i wspieranie użytkownika w nauce na podstawie dostarczonych materiałów.
            Udzielaj odpowiedzi wyłącznie na podstawie kontekstu i narzędzi, nie korzystaj z wiedzy zewnętrznej.
            """),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        message_history = RedisChatMessageHistory(
            session_id=f"focus_study_chat:{params.session_id}",
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
        )

        response = agent_executor.invoke({"input": params.user_message})
        return response.get("output", "I'm sorry, I encountered an error.")

    except Exception as e:
        print(f"An error occurred in the focus study assistant agent: {e}")
        return "An internal error occurred. Please try again later."