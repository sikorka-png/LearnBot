import math
from typing import List

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from ai.agents.notes_agent import get_all_chunks_by_batch_streamed
from ai.schemas.flashcard import FlashcardGenerateParams, FlashcardResponse, Flashcard
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate

load_dotenv()


def generate_flashcard(flashcard_params: FlashcardGenerateParams, model: str, temperature: float) -> FlashcardResponse:
    """
    Generates flashcards based on the content of user-provided files without needing a topic.
    """
    try:
        llm = ChatOpenAI(
            model_name=model,
            temperature=temperature
        )

        batches = get_all_chunks_by_batch_streamed(
            user_id=flashcard_params.user_id,
            filenames=flashcard_params.filenames,
            max_tokens_per_batch=8000
        )

        if not batches:
            print("Warning: No content chunks were generated from the provided files.")
            return FlashcardResponse(flashcards=[])

        parser = PydanticOutputParser(pydantic_object=FlashcardResponse)
        format_instructions = parser.get_format_instructions()

        num_batches = len(batches)
        flashcards_per_batch = math.ceil(flashcard_params.flashcards_needed / num_batches)

        topic_instruction = f"The flashcards should be specifically about these topics: '{flashcard_params.topics}'." if flashcard_params.topics else "The flashcards should cover the main ideas from the entire text."

        prompt_template = PromptTemplate(
            template="""
        Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE.
        Jesteś ekspertem w tworzeniu materiałów edukacyjnych, specjalizującym się w efektywnych fiszkach. Twoim zadaniem jest tworzenie fiszek na podstawie kluczowych pojęć z podanego tekstu.

        ---KONTEKST---
        {context}
        ---KONIEC KONTEKSTU---
        
        **Zakres fiszek:**
        {topic_focus}

        **Instrukcje tworzenia fiszek:**
        1.  Zidentyfikuj najważniejsze pojęcia, definicje i kluczowe terminy.
        2.  Dla każdego pojęcia stwórz jasną i zwięzłą definicję lub pytanie po jednej stronie fiszki (`definition`).
        3.  Po drugiej stronie podaj odpowiadający termin lub krótką, precyzyjną odpowiedź (`answer`).
        4.  Używaj wyłącznie informacji z podanego kontekstu. Nie korzystaj z wiedzy zewnętrznej.
        5.  Twórz fiszki, które są naprawdę przydatne do nauki i zapamiętywania kluczowych informacji. Unikaj trywialnych lub zbyt szczegółowych detali.

        **Wymagania dotyczące wyniku:**
        - Wygeneruj dokładnie {num_flashcards} fiszek.
        - Zwróć WYŁĄCZNIE obiekt JSON zgodny ze schematem. Nie dodawaj żadnego dodatkowego tekstu ani wyjaśnień przed lub po JSON.
        - Wszystkie teksty, definicje i odpowiedzi muszą być po polsku.

        {format_instructions}
        """,
            input_variables=["context", "num_flashcards"],
            partial_variables={"format_instructions": format_instructions}
        )

        chain = prompt_template | llm | parser

        all_flashcards: List[Flashcard] = []

        for batch_context in batches:
            if len(all_flashcards) >= flashcard_params.flashcards_needed:
                break

            print(f"Processing a batch to generate up to {flashcards_per_batch} flashcards...")
            try:
                response_part = chain.invoke({
                    "context": batch_context,
                    "num_flashcards": flashcards_per_batch,
                    "topic_focus": topic_instruction
                })

                if response_part and response_part.flashcards:
                    all_flashcards.extend(response_part.flashcards)
                    print(
                        f"Successfully generated {len(response_part.flashcards)} flashcards. Total now: {len(all_flashcards)}")

            except Exception as e:
                print(f"An error occurred while processing a batch: {e}. Skipping to next batch.")
                continue

        final_flashcards = all_flashcards[:flashcard_params.flashcards_needed]

        return FlashcardResponse(flashcards=final_flashcards)

    except Exception as e:
        print(f"A critical error occurred in generate_flashcard: {e}")
        return FlashcardResponse(flashcards=[])
