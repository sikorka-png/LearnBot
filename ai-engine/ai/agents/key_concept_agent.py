from langchain.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI
from langsmith import traceable

from ai.schemas.key_concept import SingleConceptParams, KeyConceptOutput

@traceable(name="Generate Single Key Concept")
def generate_single_key_concept(params: SingleConceptParams, model: str, temperature: float) -> KeyConceptOutput | None:
    """Agent generujący jeden kluczowy koncept na podstawie podanego kontekstu."""
    llm = ChatOpenAI(model=model, temperature=temperature)
    parser = PydanticOutputParser(pydantic_object=KeyConceptOutput)
    format_instructions = parser.get_format_instructions()

    prompt = f"""
    Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE.
    Jesteś ekspertem edukacyjnym. Twoim zadaniem jest wyodrębnienie najważniejszej informacji z podanego tekstu jako "Kluczowy Koncept".
    Tekst dotyczy tematu: "{params.topic_name}" -> podtemat: "{params.subtopic_name}".

    Przeanalizuj kontekst i wskaż jedną najważniejszą ideę. Wyjaśnij ją w 2-3 jasnych zdaniach po polsku.

    --- KONTEKST ---
    {params.source_text}
    --- KONIEC KONTEKSTU ---

    {format_instructions}
    """
    try:
        response = llm.invoke(prompt)
        return parser.parse(response.content)
    except Exception as e:
        print(f"Error in key_concept_agent for subtopic '{params.subtopic_name}': {e}")
        return None