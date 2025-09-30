from langchain.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI
from langsmith import traceable

from ai.schemas.problem_practice import ProblemGenerationParams, PracticeProblemOutput


@traceable(name="Generate Practice Problem Agent")
def generate_practice_problem(params: ProblemGenerationParams, model: str,
                              temperature: float) -> PracticeProblemOutput | None:
    """
    Agent specializing in creating a practice problem or task based on a given context.
    The goal is to generate a problem that requires the user to apply their knowledge.
    """
    llm = ChatOpenAI(model=model, temperature=temperature, model_kwargs={"response_format": {"type": "json_object"}})
    parser = PydanticOutputParser(pydantic_object=PracticeProblemOutput)
    format_instructions = parser.get_format_instructions()

    prompt = f"""
    Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE.
    Jesteś ekspertem w projektowaniu zadań edukacyjnych. Twoim zadaniem jest stworzenie praktycznego, angażującego zadania lub problemu na podstawie podanego kontekstu.
    Temat: "{params.topic_name}" -> podtemat: "{params.subtopic_name}".

    --- KONTEKST ---
    {params.source_text}
    --- KONIEC KONTEKSTU ---

    Na podstawie tego kontekstu wygeneruj jedno zadanie do ćwiczeń.

    Przykład dobrego zadania dla "Wyszukiwania binarnego":
    - Tytuł: "Zaginiona strona"
    - Opis: "Masz książkę o 1000 stronach, ale jedna strona zaginęła. Wiesz, że numer strony jest między 1 a 1000. Opisz kroki, jakie należy podjąć, używając metody wyszukiwania binarnego, aby znaleźć brakującą stronę w jak najmniejszej liczbie prób."

    Przykład złego zadania:
    - "Jaka jest złożoność czasowa wyszukiwania binarnego?" (To jest pytanie o fakt, a nie zadanie do rozwiązania).

    Twój wynik MUSI być poprawnym obiektem JSON zgodnym ze schematem. Nie dodawaj żadnego innego tekstu.
    {format_instructions}
    """

    try:
        response = llm.invoke(prompt)
        return parser.parse(response.content)
    except Exception as e:
        print(f"Error in practice_problem_agent for subtopic '{params.subtopic_name}': {e}")
        return None