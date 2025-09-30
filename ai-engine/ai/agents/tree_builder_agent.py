import uuid
from typing import List, Dict, Any, Optional
from langchain.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI
from langsmith import traceable

from ai.schemas.knowledge_tree import KnowledgeTreeParams, KnowledgeTreeNode, KnowledgeTree
from ai.agents.notes_agent import get_all_chunks_for_material


# def _build_tree_from_flat_list(flat_list: List[TopicNode]) -> Dict[str, Any]:
#     """
#     Pomocnicza funkcja do konwersji płaskiej listy tematów na zagnieżdżone drzewo.
#     Dodaje również domyślne pola do śledzenia postępów użytkownika.
#     """
#     tree = {}
#     for node in flat_list:
#         if node.topic not in tree:
#             tree[node.topic] = {}
#         if node.subtopic not in tree[node.topic]:
#             tree[node.topic][node.subtopic] = {
#                 "id": str(uuid.uuid4()),
#                 "chunk_ids": [],
#                 "mastery_level": 0,
#                 "correct": 0,
#                 "attempts": 0,
#                 "last_seen": None,
#                 "next_review": None,
#                 "confidence": 0.0,
#                 "flashcards": [],
#                 "quiz_questions": []
#             }
#         tree[node.topic][node.subtopic]["chunk_ids"].append(node.chunk_id)
#
#     return tree


def _add_user_metadata_to_tree(nodes: Optional[List[KnowledgeTreeNode]]) -> List[Dict[str, Any]]:
    """
    Rekurencyjnie konwertuje drzewo z modeli Pydantic na zagnieżdżone słowniki,
    dodając domyślne pola do śledzenia postępów użytkownika.
    """
    if not nodes:
        return []

    processed_list = []
    for node in nodes:
        new_node_dict = {
            "id": str(uuid.uuid4()),
            "topic_name": node.topic_name,
            "chunk_ids": node.chunk_ids,
            "mastery_level": 0,
            "correct": 0,
            "attempts": 0,
            "last_seen": None,
            "next_review": None,
            "confidence": 0.0,
            "flashcards": [],
            "quiz_questions": [],
            # Rekurencyjne wywołanie dla podtematów
            "subtopics": _add_user_metadata_to_tree(node.subtopics)
        }
        processed_list.append(new_node_dict)
    return processed_list


# @traceable(name="Generate Knowledge Tree")
# def generate_knowledge_tree(params: KnowledgeTreeParams, model: str, temperature: float) -> Dict[str, Any]:
#     """
#     Główna funkcja agenta, która generuje kompletne drzewo wiedzy.
#     """
#     all_chunks = get_all_chunks_for_material(user_id=params.user_id, filenames=params.filenames)
#
#     if not all_chunks:
#         return {}
#
#     llm = ChatOpenAI(model=model, temperature=temperature)
#     parser = PydanticOutputParser(pydantic_object=TopicList)
#     format_instructions = parser.get_format_instructions()
#
#     flat_topic_list: List[TopicNode] = []
#
#     batch_size = 10
#     for i in range(0, len(all_chunks), batch_size):
#         batch = all_chunks[i:i + batch_size]
#
#         context_with_ids = "\n\n".join(
#             [f'---CHUNK START---\nchunk_id: {chunk["id"]}\ntext: {chunk["text"]}\n---CHUNK END---' for chunk in batch])
#
#         prompt = f"""
#             Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE.
#             Twoim głównym zadaniem jest analiza poniższych fragmentów tekstu. Dla KAŻDEGO fragmentu musisz wskazać główny temat, konkretny podtemat oraz oryginalny `chunk_id`.
#
#             **Fragmenty do analizy:**
#             {context_with_ids}
#
#             **Instrukcje:**
#             1.  'topic' powinien być szeroką kategorią (np. 'Optymalizacja baz danych', 'Koncepcje hurtowni danych').
#             2.  'subtopic' powinien być bardziej szczegółowym pojęciem w ramach tematu (np. 'Optymalizacja indeksów', 'Projektowanie schematu gwiazdy').
#             3.  **WAŻNE:** Każdy konkretny `subtopic` musi należeć tylko do jednego `topic`. Nie przypisuj tego samego podtematu do różnych tematów.
#             4.  **WAŻNE:** `topic` i `subtopic` MUSZĄ być różnymi ciągami znaków.
#             Wszystkie opisy i nazwy muszą być po polsku.
#             Wynik MUSI być poprawnym obiektem JSON zgodnym ze schematem.
#         """
#         try:
#             llm_response = llm.invoke(prompt)
#             parsed_batch = parser.parse(llm_response.content)
#             flat_topic_list.extend(parsed_batch.topics)
#         except Exception as e:
#             print(f"Failed to parse LLM output for a batch: {e}")
#             continue
#
#     knowledge_tree = _build_tree_from_flat_list(flat_topic_list)
#
#     return knowledge_tree

@traceable(name="Generate Knowledge Tree")
def generate_knowledge_tree(params: KnowledgeTreeParams, model: str, temperature: float) -> Dict[str, Any]:
    """
    Główna funkcja agenta, która generuje kompletne, zagnieżdżone drzewo wiedzy.
    """
    all_chunks = get_all_chunks_for_material(user_id=int(params.user_id), filenames=params.filenames)

    if not all_chunks:
        return {"tree": []}

    # Dodajemy model_kwargs, aby wymusić odpowiedź JSON (działa z nowszymi modelami OpenAI)
    llm = ChatOpenAI(model=model, temperature=temperature, model_kwargs={"response_format": {"type": "json_object"}})
    # Używamy nowego schematu KnowledgeTree
    parser = PydanticOutputParser(pydantic_object=KnowledgeTree)
    format_instructions = parser.get_format_instructions()

    context_with_ids = "\n\n".join(
        [f'---CHUNK START---\nchunk_id: {chunk["id"]}\ntext: {chunk["text"]}\n---CHUNK END---' for chunk in all_chunks])

    prompt = f"""
        You are an expert curriculum designer. Your task is to analyze a collection of text chunks and organize them into a deeply nested, hierarchical knowledge tree (3-4 levels deep).

        **Input Chunks to Analyze:**
        {context_with_ids}

        **Instructions:**
        1.  **Synthesize General Topics:** Identify broad, overarching themes for the top-level topics.
        2.  **Create Deep Hierarchy:** Structure the content with progressively more specific subtopics.
        3.  **Assign Chunks to Leaves:** Associate each `chunk_id` with the MOST SPECIFIC topic it belongs to. Parent nodes can have empty `chunk_ids` lists.

        **Output Format Requirements:**
        You MUST return your response as a single, valid JSON object that strictly adheres to the schema provided below.
        - Your entire output must be ONLY the JSON object.
        - DO NOT output the schema definition itself. Create a JSON object that IS an INSTANCE of this schema.

        **JSON Schema to follow:**
        {format_instructions}
    """

    try:
        llm_response = llm.invoke(prompt)
        parsed_tree = parser.parse(llm_response.content)
        final_tree_dict = _add_user_metadata_to_tree(parsed_tree.tree)
        return {"tree": final_tree_dict}
    except Exception as e:
        print(f"Failed to generate or parse the knowledge tree. Error: {e}")
        # Logowanie treści odpowiedzi LLM, która spowodowała błąd
        print(f"LLM Response that failed parsing: {llm_response.content if 'llm_response' in locals() else 'N/A'}")
        return {"tree": []} # Zwróć pustą strukturę w razie błędu