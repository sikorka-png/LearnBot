# ai/tools/tools.py

import os
from typing import List
import cohere

from langchain_core.tools import tool
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.language_models import BaseChatModel
from ai.services.pinecone_service import vectorstore
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.chains import LLMMathChain


def format_docs(docs):
    """Converts a list of Document objects into a single string context."""
    return "\n\n---\n\n".join(doc.page_content for doc in docs)


@tool
def answer_from_documents(query: str, user_id: int, llm: BaseChatModel, filenames: List, cohere_client) -> str:
    """
    Use this tool FIRST to search for an answer in the user's private documents.
    This is the best way to answer questions about user-specific or uploaded information.
    If the answer is found, this tool will return it.
    If not, it will indicate that the information was not found in the documents
    """
    if not vectorstore:
        return "Error: The knowledge base is not available."

    print(f"Executing RAG chain for user_id: {user_id} with query: '{query}'")

    try:
        if filenames:
            print(f"Filtering by filenames: {filenames}")
            search_filter = {
                '$and': [
                    {'user_id': {'$eq': user_id}},
                    {'filename': {'$in': filenames}}
                ]
            }
        else:
            print("No filenames provided, filtering by user_id only.")
            search_filter = {'user_id': {'$eq': user_id}}

        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={'filter': search_filter, 'k': 20}
        )

        print("Step 1: Retrieving initial documents from vector store...")
        initial_docs = retriever.get_relevant_documents(query)

        if not initial_docs:
            return "No relevant information was found in the user's documents."

        print(f"Retrieved {len(initial_docs)} documents for reranking.")

        final_docs = []
        if cohere_client:
            print("Step 2: Reranking documents with Cohere...")
            doc_texts = [doc.page_content for doc in initial_docs]

            try:
                # Call the Cohere Rerank API
                reranked_results = cohere_client.rerank(
                    model='rerank-english-v3.0',
                    query=query,
                    documents=doc_texts,
                    top_n=5
                )

                final_docs = [initial_docs[result.index] for result in reranked_results.results if
                              result.relevance_score > 0.1]
                print(f"Kept {len(final_docs)} documents after reranking.")
            except cohere.errors.CohereError as e:
                print(f"Cohere API error: {e}. Falling back to standard retrieval.")
                final_docs = initial_docs[:5]

        else:
            print("Warning: Cohere client not available. Skipping reranking.")
            final_docs = initial_docs[:5]

        if not final_docs:
            return "No relevant information was found in the user's documents after reranking."

        print("Step 3: Generating final answer with LLM...")

        template = """
        Use ONLY the following pieces of context to answer the question at the end.
        If the context does not contain the answer, just say that you don't know the answer based on the provided documents. Don't make anything up.
        Keep the answer concise.

        Context:
        {context}

        Question:
        {question}

        Helpful Answer:"""
        custom_rag_prompt = PromptTemplate.from_template(template)

        synthesis_chain = (
                custom_rag_prompt
                | llm
                | StrOutputParser()
        )

        context_str = format_docs(final_docs)
        answer = synthesis_chain.invoke({"context": context_str, "question": query})

        failure_phrases = [
            "don't know",
            "do not know",
            "couldn't find",
            "not find",
            "no relevant information",
            "based on the provided documents",
            "could not find an answer"
        ]

        answer_lower = answer.lower()
        if any(phrase in answer_lower for phrase in failure_phrases):
            print("RAG chain could not find an answer. Instructing agent to use other tools.")
            return "No relevant information was found in the user's documents for this query."
        else:
            return answer

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return f"An error occurred while answering from your documents: {str(e)}"


@tool
def search_web(query: str, user_id: int, llm: BaseChatModel, is_web_search_enable: bool = True) -> str:
    """
            Use this tool when you need to answer questions about current events, recent topics,
            or any information that you likely wouldn't find in a user's private documents.
            This tool performs a web search.
    """
    search = TavilySearchResults(max_results=3)
    return search.invoke(query)


@tool
def use_calculator(query: str, llm: BaseChatModel) -> str:
    """
        Use this tool for any math questions or calculations.
        It is best for solving mathematical problems, like addition, subtraction,
        multiplication, division, and exponents. The input should be a simple
        mathematical expression.
    """
    print(f"--- Executing Calculator for query: '{query}' ---")
    math_chain = LLMMathChain.from_llm(llm=llm, verbose=True)

    try:
        result = math_chain.invoke(query)
        return result.get("answer", "Calculation failed.")
    except Exception as e:
        return f"Error during calculation: {e}"