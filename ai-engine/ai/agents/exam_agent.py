import cohere
import functools
from dotenv import load_dotenv
from langchain.agents import (
    create_react_agent,
    AgentExecutor,
    create_openai_tools_agent
)
from langchain.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import Tool
from langchain_openai import ChatOpenAI
from langsmith import traceable

from ai.agents.notes_agent import get_context_chunks, get_all_chunks_by_batch_streamed
from ai.schemas.exam import ExamGenerateParams, TextQuestion
from ai.schemas.exam import QuestionList
from ai.tools.tools import answer_from_documents, search_web

load_dotenv()

try:
    co_client = cohere.Client()
except cohere.errors.CohereError:
    print("Warning: COHERE_API_KEY not found. Reranking in RAG tool will be disabled.")
    co_client = None


@traceable(name="Generate Exam Questions")
def generate_questions_from_rag(exam_params: ExamGenerateParams, model, temperature):
    if exam_params.topic:
        batches = get_context_chunks(
            user_id=exam_params.user_id,
            filenames=exam_params.filenames,
            topic=exam_params.topic,
            focus="",
            batch_size=5
        )
    else:
        batches = get_all_chunks_by_batch_streamed(
            user_id=exam_params.user_id,
            filenames=exam_params.filenames,
            chunk_page_size=100,
            max_tokens_per_batch=6000
        )
    llm = ChatOpenAI(model=model, temperature=temperature)

    # TODO nie da sie jakos parsera podlaczyc bezposrednio do chatu?
    parser = PydanticOutputParser(pydantic_object=QuestionList)
    format_instructions = parser.get_format_instructions()

    questions = []
    id_counter = 1
    for batch in batches:
        prompt = f"""
    Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE.
    Generujesz {exam_params.num_of_questions} pytań egzaminacyjnych typu {exam_params.question_type.value} na temat "{exam_params.topic or 'temat ogólny'}", bazując na poniższym kontekście edukacyjnym:

    ---KONTEKST---
    {batch}
    ---KONIEC---

    Każde pytanie powinno mieć format:
    - type: jedno z "multiple-choice", "single-choice", "true-false", "text-answer"
    - question: tekst pytania
    - options: tylko dla pytań wyboru
    - correctAnswer: dokładna odpowiedź lub lista
    - points: 1 lub 2

    Zwróć listę JSON {exam_params.num_of_questions} pytań. Pytania mają być konkretne i istotne.

    Zwróć WYŁĄCZNIE listę JSON zgodną ze schematem: {format_instructions}
    Wszystkie teksty, opisy i odpowiedzi muszą być po polsku.
    """

        llm_response = llm.invoke(prompt)
        response = llm_response.content
        try:
            parsed = parser.parse(response)
            for q in parsed.questions:
                q_dict = q.dict()
                q_dict["id"] = f"gen-{id_counter}"
                id_counter += 1
                questions.append(q_dict)
            if len(questions) >= exam_params.num_of_questions:
                break
        except Exception as e:
            print("Failed to parse LLM output", e)
            continue
    return questions[:exam_params.num_of_questions]


def check_text_answers(question: TextQuestion, model, temperature):
    llm = ChatOpenAI(
        model_name=model,
        temperature=temperature
    )
    answer_from_docs_with_context = functools.partial(
        answer_from_documents.func,
        user_id=question.user_id,
        llm=llm,
        filenames=question.sources,
        cohere_client=co_client
    )
    rag_tool = Tool(
        name="answer_from_documents",
        func=answer_from_docs_with_context,
        description=answer_from_documents.description
    )
    search_web_with_context = functools.partial(
        search_web.func, user_id=question.user_id, llm=llm
    )
    search_web_tool = Tool(
        name="search_web",
        func=search_web_with_context,
        description=search_web.description
    )

    tools = [rag_tool, search_web_tool]

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         """You are an intelligent exam assistant. Your task is to evaluate whether the user's answer to a given question is correct or reasonably close to the correct answer.

Use the following tools if necessary, in this exact order:
1. First, try using the RAG tool to extract relevant information from the provided study materials.
2. If the RAG tool does not provide sufficient context, then use the web search tool.

Base your judgment on factual accuracy and conceptual understanding rather than exact wording.

If the user's answer is factually correct, well-reasoned, and meaningfully addresses the question—even if phrased differently from the suggested answer—respond with:
OK

If the user's answer is incorrect, incomplete, or misses key points, respond with a short explanation of why it is not correct and what is missing or wrong.

Do not explain your process or mention tool usage explicitly unless it is relevant to the explanation.
Respond in one clear paragraph only.
    """),
        ("user",
         """Evaluate the user's answer based on the following context:

    - Question: {question}

    - User's Answer: {user_answer}

    - Suggested Correct Answer (previously generated): {correct_answer}

    - Source Materials (if available): {sources}

    If needed, use the available tools to gather more context before answering."""),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_openai_tools_agent(llm=llm, tools=tools, prompt=prompt)
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        handle_parsing_errors=True
    )

    response = agent_executor.invoke({
        "question": question.question,
        "user_answer": question.user_answer,
        "correct_answer": question.correct_answer,
        "sources": question.sources
    })
    return response.get("output", "An error occurred while processing the response.")
