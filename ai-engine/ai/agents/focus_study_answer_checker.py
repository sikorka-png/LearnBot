import functools
from dotenv import load_dotenv
from langchain.agents import create_openai_tools_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import Tool
from langchain_openai import ChatOpenAI
from langsmith import traceable

from ai.schemas.focus_study_answer_checker import GradePracticeParams
from ai.tools.tools import answer_from_documents, search_web

load_dotenv()

TEMPLATE_SYSTEM = """Jesteś precyzyjnym korepetytorem. Odpowiadaj WYŁĄCZNIE w języku polskim. To jest BARDZO WAŻNE.
Napisz JEDNĄ zwięzłą notatkę o odpowiedzi użytkownika.
Nie ujawniaj chain-of-thought ani nie wspominaj o narzędziach.

Struktura (dokładnie te trzy oznaczone linie, nic więcej):
Good: <bardzo krótka lista lub fraza tego, co było poprawne>
Needs work: <bardzo krótka lista lub fraza tego, co było brakujące/błędne>
Comment: <jedno zdanie z przyjazną wskazówką lub następnym krokiem>

Zasady:
- Maksymalnie ~110 słów.
- Preferuj krótkie frazy; używaj przecinków lub średników zamiast długich zdań w pierwszych dwóch liniach.
- Jeśli odpowiedź jest w pełni poprawna, linia "Needs work" powinna być "brak".
- Jeśli odpowiedź jest prawie pusta/nieistotna, napisz to i podaj 1 kluczową wskazówkę w komentarzu.
"""

TEMPLATE_USER = """Problem Title: {title}

Problem Description:
{description}

Hint (optional):
{hint}

User Answer:
{user_answer}
"""


@traceable(name="Grade Practice Problem (note)")
def grade_practice_note(params: GradePracticeParams, model: str, temperature: float) -> str:
    llm = ChatOpenAI(model_name=model, temperature=temperature)

    tools = []
    if params.problem.sources:
        rag = functools.partial(
            answer_from_documents.func,
            user_id=params.user_id,
            llm=llm,
            filenames=params.problem.sources,
            cohere_client=None,
        )
        tools.append(Tool(
            name="answer_from_documents",
            func=rag,
            description=answer_from_documents.description,
        ))

    web = functools.partial(search_web.func, user_id=params.user_id, llm=llm)
    tools.append(Tool(
        name="search_web",
        func=web,
        description=search_web.description,
    ))

    prompt = ChatPromptTemplate.from_messages([
        ("system", TEMPLATE_SYSTEM),
        ("user", TEMPLATE_USER),
        MessagesPlaceholder("agent_scratchpad"),
    ])

    agent = create_openai_tools_agent(llm=llm, tools=tools, prompt=prompt)
    executor = AgentExecutor(agent=agent, tools=tools, verbose=False, handle_parsing_errors=True)

    res = executor.invoke({
        "title": params.problem.problem_title,
        "description": params.problem.problem_description,
        "hint": params.problem.hint or "N/A",
        "user_answer": params.user_answer,
    })

    return res.get("output", "Good: —  \nNeeds work: —  \nComment: Unable to create feedback. Please try again.")
