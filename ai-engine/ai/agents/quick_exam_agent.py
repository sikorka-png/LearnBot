import asyncio
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate
from fastapi import Depends
from ai.agents.notes_agent import get_chunks_by_ids
from ai.schemas.quick_exam_sm import (
    QuickExamParams, QuickExam, TrueFalseQuestion,
    MultipleChoiceQuestion, OpenEndedQuestion
)


def _find_topics_recursively(
        nodes: List[Dict[str, Any]],
        selected_topics_set: set,
        topic_to_chunks: Dict[str, List[str]],
        parent_path: List[str] = []
):
    """
    Przeszukuje rekurencyjnie strukturę drzewa (listę węzłów) w poszukiwaniu
    tematów wybranych przez użytkownika.
    """
    for node in nodes:
        current_topic_name = node.get("topic_name", "")
        # Tworzymy pełną ścieżkę do bieżącego węzła
        current_path = parent_path + [current_topic_name]

        # Sprawdzamy, czy nazwa bieżącego tematu jest na liście wybranych
        if current_topic_name.lower() in selected_topics_set:
            topic_path_str = " / ".join(current_path)
            topic_to_chunks[topic_path_str] = node.get("chunk_ids", [])

        # Przechodzimy w głąb do podtematów, jeśli istnieją
        if "subtopics" in node and node["subtopics"]:
            _find_topics_recursively(node["subtopics"], selected_topics_set, topic_to_chunks, current_path)


def _get_context_for_topics(knowledge_tree: Dict[str, Any], topics: List[str]) -> Dict[str, List[str]]:
    """
    Główna funkcja, która inicjuje rekurencyjne przeszukiwanie drzewa.
    """
    topic_to_chunks = {}
    selected_topics_set = {t.strip().lower() for t in topics}

    if "tree" in knowledge_tree and isinstance(knowledge_tree["tree"], list):
        _find_topics_recursively(knowledge_tree["tree"], selected_topics_set, topic_to_chunks)

    return topic_to_chunks


async def _generate_tf_questions(llm, context: str, topics_str: str):
    parser = PydanticOutputParser(pydantic_object=QuickExam)
    # KLUCZOWA ZMIANA: Wywołujemy .get_format_instructions() bez argumentów
    format_instructions = parser.get_format_instructions()

    prompt = PromptTemplate(
        template="""Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE.
        Na podstawie kontekstu dotyczącego {topics} wygeneruj DOKŁADNIE 4 unikalne pytania typu Prawda/Fałsz.
        Wypełnij wyłącznie pole `true_false_questions` w podanym schemacie JSON.

        Kontekst: {context}

        Schemat JSON:
        {format_instructions}""",
        input_variables=["context", "topics"],
        partial_variables={"format_instructions": format_instructions}
    )
    chain = prompt | llm | parser
    result = await chain.ainvoke({"context": context, "topics": topics_str})
    return result.true_false_questions


async def _generate_mc_questions(llm, context: str, topics_str: str):
    parser = PydanticOutputParser(pydantic_object=QuickExam)
    format_instructions = parser.get_format_instructions()

    prompt = PromptTemplate(
        template="""Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE.
        Na podstawie kontekstu dotyczącego {topics} wygeneruj DOKŁADNIE 6 unikalnych pytań wielokrotnego wyboru (każde z 4 opcjami).
        Wypełnij wyłącznie pole `multiple_choice_questions` w podanym schemacie JSON.

        Kontekst: {context}

        Schemat JSON:
        {format_instructions}""",
        input_variables=["context", "topics"],
        partial_variables={"format_instructions": format_instructions}
    )
    chain = prompt | llm | parser
    result = await chain.ainvoke({"context": context, "topics": topics_str})
    return result.multiple_choice_questions


async def _generate_open_questions(llm, context: str, topics_str: str):
    parser = PydanticOutputParser(pydantic_object=QuickExam)
    format_instructions = parser.get_format_instructions()

    prompt = PromptTemplate(
        template="""Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE.
        Na podstawie kontekstu dotyczącego {topics} wygeneruj DOKŁADNIE 5 unikalnych pytań otwartych wymagających krótkiej odpowiedzi tekstowej. Do każdego podaj sugerowaną odpowiedź.
        Wypełnij wyłącznie pole `open_ended_questions` w podanym schemacie JSON.

        Kontekst: {context}

        Schemat JSON:
        {format_instructions}""",
        input_variables=["context", "topics"],
        partial_variables={"format_instructions": format_instructions}
    )
    chain = prompt | llm | parser
    result = await chain.ainvoke({"context": context, "topics": topics_str})
    return result.open_ended_questions


async def generate_quick_exam(params: QuickExamParams, model: str, temperature: float) -> QuickExam:
    """
    Generuje "Quick Exam" składający się z 3 typów pytań.
    Używa równoległych wywołań AI dla każdego typu pytania.
    """
    topic_to_chunks = _get_context_for_topics(params.knowledge_tree, params.topics)
    all_chunk_ids = [cid for cids in topic_to_chunks.values() for cid in cids]

    if not all_chunk_ids:
        raise ValueError("No content found for the selected topics.")

    chunk_texts = get_chunks_by_ids(user_id=params.user_id, chunk_ids=list(set(all_chunk_ids)))
    full_context = "\n\n".join(chunk_texts)
    topics_str = ", ".join(params.topics)

    llm = ChatOpenAI(model_name=model, temperature=temperature)

    tasks = [
        _generate_tf_questions(llm, full_context, topics_str),
        _generate_mc_questions(llm, full_context, topics_str),
        _generate_open_questions(llm, full_context, topics_str),
    ]

    results = await asyncio.gather(*tasks)

    return QuickExam(
        true_false_questions=results[0] or [],
        multiple_choice_questions=results[1] or [],
        open_ended_questions=results[2] or [],
    )