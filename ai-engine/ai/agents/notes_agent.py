import os
import time
from time import sleep
from typing import List, Dict, Any

import tiktoken
from dotenv import load_dotenv
from langchain.agents import initialize_agent, AgentType
from langchain.agents.agent import AgentExecutor
from langchain.tools.retriever import create_retriever_tool
from langchain.vectorstores.base import VectorStoreRetriever
from langchain_core.exceptions import OutputParserException
from langchain_core.runnables import Runnable
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langgraph.graph import StateGraph, END
from langsmith import traceable
from openai import RateLimitError

from ai.schemas.notes import GraphState

load_dotenv()

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
INDEX_NAME = os.environ.get("INDEX_NAME")

vectorstore = PineconeVectorStore(
    index_name=INDEX_NAME,
    embedding=embeddings
)


@traceable(name="Validate Notes")
def validate_notes(notes: str) -> str:
    prompt = (
        "Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE. "
        "Oceniasz wygenerowane przez AI notatki do nauki. Oceń, czy notatki są:\n"
        "- kompletne (czy obejmują cały istotny materiał?)\n"
        "- jasne i uporządkowane\n"
        "- zgodne ze stylem edukacyjnym\n\n"
        "Jeśli czegoś brakuje, jest niejasne lub chaotyczne, podaj konkretne sugestie. "
        "W przeciwnym razie zwróć 'ok'.\n\n"
        f"NOTATKI:\n{notes}"
    )
    return ChatOpenAI(model="gpt-4o", temperature=0, tags=["notes", "validate"]).invoke(prompt).content


@traceable(name="Improve Notes")
def improve_notes(notes: str, feedback: str, user_id: int, filenames: List[str], topic: str) -> str:
    filters = {"user_id": user_id}
    if filenames:
        filters["filename"] = {"$in": filenames}

    query = topic if topic else "general summary"
    retriever = vectorstore.as_retriever(search_kwargs={"k": 30, "filter": filters})
    context_docs = retriever.invoke(query)
    context = ""
    total_tokens = 0
    for doc in context_docs:
        tokens = count_tokens(doc.page_content)
        if total_tokens + tokens > 6000:
            break
        context += doc.page_content + "\n\n"
        total_tokens += tokens

    prompt = f"""
        Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE.
        Ulepszasz notatki na podstawie opinii i dodatkowego kontekstu.
        
        Kontekst:
        {context}
        
        Notatki:
        {notes}
        
        Opinia:
        {feedback}
        
        Popraw notatki, uwzględniając brakujące informacje i poprawiając jasność lub strukturę. Jeśli opinia wskazuje na braki, uzupełnij je na podstawie powyższego kontekstu.
        Zwróć wynik jako kompletny kod HTML (bez head/style/meta) (np. używaj <h2>, <ul>, <p>, <strong> zamiast Markdown).
        Usuń zbędne białe znaki. Używaj pojedynczego nowego wiersza TYLKO przed nowym akapitem (drugim, trzecim itd. - nie pierwszym).
        
        Zwróć WYŁĄCZNIE notatki.
        """
    return ChatOpenAI(model="gpt-4o", temperature=0.3, tags=["notes", "improve"]).invoke(prompt).content


def count_tokens(text: str, model_name: str = "gpt-4o") -> int:
    enc = tiktoken.encoding_for_model(model_name)
    return len(enc.encode(text))


@traceable(name="Retrieve from Pinecone - context")
def get_context_chunks(user_id: int, filenames: List[str], topic: str, focus: str, batch_size: int = 20) -> List[str]:
    filters = {"user_id": user_id}
    if filenames:
        filters["filename"] = {"$in": filenames}

    query = topic + (f". Focus: {focus}" if focus else "") if topic else (focus or "general summary")
    retriever = vectorstore.as_retriever(search_kwargs={"k": 100, "filter": filters})
    docs = retriever.invoke(query)

    batches = []
    for i in range(0, len(docs), batch_size):
        batch = docs[i:i + batch_size]
        content = "\n\n".join(doc.page_content for doc in batch)
        batches.append(content)
    return batches


@traceable(name="Retrieve from Pinecone - all")
def get_all_chunks_by_batch_streamed(
        user_id: int,
        filenames: List[str],
        chunk_page_size: int = 100,
        max_tokens_per_batch: int = 10_000
) -> List[str]:
    filters = {"user_id": user_id}
    if filenames:
        filters["filename"] = {"$in": filenames}

    embedded_vector = embeddings.embed_query("")
    response = vectorstore._index.query(
        vector=embedded_vector,
        # top_k=chunk_page_size * 100,
        top_k=9999,
        filter=filters,
        include_metadata=True
    )

    chunks = [match['metadata']['text'] if 'text' in match['metadata'] else "" for match in response['matches']]
    all_batches = []
    current_batch = []
    current_tokens = 0

    for chunk in chunks:
        chunk_tokens = count_tokens(chunk)
        if current_tokens + chunk_tokens > max_tokens_per_batch:
            all_batches.append("\n\n".join(current_batch))
            current_batch = [chunk]
            current_tokens = chunk_tokens
        else:
            current_batch.append(chunk)
            current_tokens += chunk_tokens

    if current_batch:
        all_batches.append("\n\n".join(current_batch))

    total_chunks = sum(len(batch.split("\n\n")) for batch in all_batches)
    print(f"[INFO] Retrieved {len(chunks)} raw chunks from Pinecone.")
    print(f"[INFO] Grouped into {len(all_batches)} batches. Total text chunks: approx. {total_chunks}")

    return all_batches


@traceable(name="Generate Notes")
def generate(state: GraphState) -> GraphState:
    if state["topic"]:
        print("focused")
        context_batches = get_context_chunks(
            user_id=state["user_id"],
            filenames=state["filenames"],
            topic=state["topic"],
            focus=state["focus"],
            batch_size=20
        )
    else:
        print("full scan")
        context_batches = get_all_chunks_by_batch_streamed(
            user_id=state["user_id"],
            filenames=state["filenames"],
            chunk_page_size=100,
            max_tokens_per_batch=10_000
        )

    llm = ChatOpenAI(model="gpt-4o", temperature=0.3, tags=["notes", "generate"])
    partial_notes = []

    for batch in context_batches:
        prompt = f"""
        You are an advanced academic assistant generating **comprehensive** and **in-depth** study notes from the context below.

        Your goal is to extract and expand on **all important details**, creating an extensive resource for learning and revision. These notes should resemble a full lecture summary or textbook chapter.

        ---

        ### Requirements:

        1. **Explain How Things Work, Not Just What They Are**:
           - Always describe **how** each technique, algorithm, or mechanism works step-by-step.
           - Include technical details like formulas, logic, flow of execution, or inner components.

        2. **Thoroughness**:
           - Cover **every major concept** from the context.
           - Do not skip over technical terms — define and explain them deeply.

        3. **Structure**:
           - Use **clear headings**, **subheadings**, and **bullet points**.
           - Group related ideas together logically.

        3. **Use Tables When Appropriate**:
           - Present comparisons, feature breakdowns, pros/cons, or differences **in tabular form**.
           - Make sure each table has a clear purpose and is **descriptive**, with labeled rows and columns.
   
        5. **Educational Style**:
           - Use examples, comparisons, edge cases, and common mistakes.

        6. **Depth over Brevity**:
           - Your answer should aim for **AT LEAST 800–1000 words** per batch of content, if the material allows.

        Return ONLY notes.
        ---

        Topic: {state["topic"] or "General"}
        Focus (more detailed section): {state["focus"] or "None"}

        Context:
        {batch}
        """.strip()

        for i in range(3):
            try:
                response = llm.invoke(prompt)
                break
            except RateLimitError as e:
                if 'TPM' in str(e):
                    print("[WARN] Rate limit hit (TPM). Waiting 90s before retry...")
                    time.sleep(90)
                else:
                    raise
            except OutputParserException:
                print("[WARN] Output parsing failed, retrying...")
                time.sleep(2)
        else:
            raise Exception("Rate limit exceeded after 3 retries")

        partial_notes.append(response.content)

    return {**state, "partial_notes": partial_notes}


def check(state: GraphState) -> str:
    feedback = validate_notes(state["notes"])
    if feedback.strip().lower() == "ok":
        return "end"
    if state["attempt"] >= 3:
        return "end"
    return "improve"


def improve(state: GraphState) -> GraphState:
    new_notes = improve_notes(
        notes=state["notes"],
        feedback=state["feedback"],
        user_id=state["user_id"],
        filenames=state["filenames"],
        topic=state["topic"]
    )
    return {**state, "notes": new_notes, "attempt": state["attempt"] + 1}


def feedback_state(state: GraphState) -> GraphState:
    fb = validate_notes(state["notes"])
    return {**state, "feedback": fb}


def merge_notes(notes_parts: List[str], topic: str, focus: str) -> str:
    separator = "\n\n---\n\n"
    prompt = f"""
        You are merging multiple AI-generated note segments into one coherent and complete set of notes.
        Identify and remove redundancies or contradictions.
        If any topic appears fragmented or underdeveloped, consolidate it into one complete explanation.
        
        Topic: {topic or "General"}
        Focus (more detailed section): {focus or "None"}
        
        Segments:
        {separator.join(notes_parts)}
        
        Combine them into one long, detailed, and complete set of notes. 
        Do not summarize or shorten any section — preserve all technical content and examples from each segment.
        Only remove *literal repetition*, and ensure logical flow and consistent formatting.
        
        Return the final result as a complete HTML body (no head/style/meta) (e.g., using <h2>, <ul>, <p>, <strong> zamiast Markdown). 
        Usuń zbędne białe znaki. Używaj pojedynczego nowego wiersza TYLKO przed nowym akapitem (drugim, trzecim itd. - nie pierwszym).
        
        Return only notes.
        """.strip()

    for i in range(3):
        try:
            return ChatOpenAI(model="gpt-4o", temperature=0.3).invoke(prompt).content
        except RateLimitError as e:
            if 'TPM' in str(e):
                print("[WARN] Rate limit hit (TPM). Waiting 60s before retry...")
                sleep(60)
            else:
                raise
    raise Exception("Rate limit exceeded in merge_notes after 3 retries")


def recursive_merge(notes_parts: List[str], topic: str, focus: str, max_tokens: int = 10_000) -> str:
    batches = []
    current_batch = []
    current_tokens = 0

    for part in notes_parts:
        tokens = count_tokens(part)
        if current_tokens + tokens > max_tokens and current_batch:
            batches.append(current_batch)
            current_batch = []
            current_tokens = 0
        current_batch.append(part)
        current_tokens += tokens
    if current_batch:
        batches.append(current_batch)

    merged_batches = [merge_notes(batch, topic, focus) for batch in batches]

    if len(merged_batches) == 1:
        return merged_batches[0]

    return recursive_merge(merged_batches, topic, focus, max_tokens=max_tokens)


def combine(state: GraphState) -> GraphState:
    merged = recursive_merge(state["partial_notes"], state["topic"], state["focus"])
    return {**state, "notes": merged}


def call_with_retry(api_call, max_retries=3):
    for i in range(max_retries):
        try:
            return api_call()
        except RateLimitError:
            wait_time = 90
            print(f"[Retry {i + 1}] Rate limit hit. Waiting {wait_time} seconds...")
            time.sleep(wait_time)
    raise Exception("Rate limit exceeded after retries.")


def build_notes_generation_graph() -> Runnable:
    workflow = StateGraph(GraphState)
    workflow.add_node("generate", generate)
    workflow.add_node("combine", combine)
    workflow.add_node("validate", feedback_state)
    workflow.add_node("improve", improve)

    workflow.set_entry_point("generate")
    workflow.add_edge("generate", "combine")
    workflow.add_edge("combine", "validate")
    workflow.add_conditional_edges("validate", check, {
        "end": END,
        "improve": "improve"
    })
    workflow.add_edge("improve", "validate")

    return workflow.compile()


@traceable("enhance")
def enhance_notes_with_agent(content: str, feedback: str, user_id: int, filenames: list[str]) -> str:
    retriever = vectorstore.as_retriever(
        search_kwargs={"k": 20, "filter": {"user_id": user_id, "filename": {"$in": filenames}}}
    )

    context_tool = create_retriever_tool(
        retriever=retriever,
        name="search_materials",
        description="Use this tool to look up study materials or missing topics relevant to the note."
    )

    tools = [context_tool]

    llm = ChatOpenAI(model="gpt-4o", temperature=0.3)
    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.OPENAI_FUNCTIONS,
        verbose=False,
    )

    prompt = f"""
        Your task is to improve the user's study note. Change already written part only if necessary.
        
        Original Note:
        {content}
        
        Feedback from the user on what needs improvement:
        {feedback}
        
        Use external materials if needed using the provided tools.
        Return ONLY the revised note as a complete HTML body (no head/style/meta).
        
        Do not remove image placeholders from note.
        """

    response = agent.invoke({"input": prompt})
    return response["output"]


@traceable(name="Retrieve all chunks for material")
def get_all_chunks_for_material(user_id: int, filenames: List[str]) -> List[Dict[str, Any]]:
    """
    Pobiera WSZYSTKIE chunki jako listę słowników z ich metadanymi z Pinecone
    dla danego użytkownika i plików. Każdy słownik zawiera 'id' i 'text'.
    """
    filters = {"user_id": user_id}
    if filenames:
        filters["filename"] = {"$in": filenames}

    embedded_vector = embeddings.embed_query("")

    response = vectorstore._index.query(
        vector=embedded_vector,
        top_k=9999,
        filter=filters,
        include_metadata=True
    )

    all_chunks = []
    for match in response['matches']:
        all_chunks.append({
            "id": match['id'],
            "text": match['metadata'].get('text', ''),
            "metadata": match['metadata']
        })

    print(f"[INFO] Retrieved {len(all_chunks)} chunks from Pinecone for knowledge tree generation.")

    return all_chunks


@traceable(name="Fetch Chunks by IDs")
def get_chunks_by_ids(user_id: int, chunk_ids: List[str]) -> List[str]:
    """
    Pobiera treść tekstową chunków z Pinecone na podstawie listy ich ID.
    Poprawiona wersja, zgodna z nowym API klienta Pinecone.
    """
    if not chunk_ids:
        return []

    try:
        fetch_response = vectorstore._index.fetch(ids=chunk_ids)

        vectors = fetch_response.vectors
        texts = []

        for vector_data in vectors.values():
            metadata = vector_data.metadata

            if metadata and metadata.get('user_id') == user_id:
                text = metadata.get('text', '')
                if text:
                    texts.append(text)
            else:
                chunk_id = vector_data.id
                print(
                    f"SECURITY WARNING/DATA MISMATCH: Attempt to fetch chunk {chunk_id} for user {user_id}, "
                    f"but it belongs to another user or metadata is missing."
                )

        return texts

    except Exception as e:
        print(f"An error occurred while fetching chunks by IDs from Pinecone: {e}")
        return []