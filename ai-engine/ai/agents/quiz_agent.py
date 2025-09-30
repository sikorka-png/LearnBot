import math
import random
from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
from ai.agents.notes_agent import get_chunks_by_ids
from ai.schemas.quiz import Question, QuestionList, QuizFromTreeParams
load_dotenv()


def generate_quiz(params: QuizFromTreeParams, model: str, temperature: float) -> QuestionList:
    """
    Generuje quiz, inteligentnie wybierając PODTEMATY z drzewa wiedzy
    i przypisując pytaniom jednoznaczny temat w formacie "Główny Temat / Podtemat".
    """
    try:
        llm = ChatOpenAI(model_name=model, temperature=temperature)
        parser = PydanticOutputParser(pydantic_object=QuestionList)
        format_instructions = parser.get_format_instructions()
        subtopics_to_cover = []

        if params.topics:
            print(f"Filtering quiz based on provided subtopics: {params.topics}")
            selected_subtopics_set = {t.strip().lower() for t in params.topics if t.strip()}

            for main_topic, subtopics in params.knowledge_tree.items():
                for subtopic_name, data in subtopics.items():
                    if subtopic_name.lower() in selected_subtopics_set:
                        subtopics_to_cover.append({
                            "main_topic": main_topic,
                            "subtopic": subtopic_name,
                            "chunk_ids": data.get("chunk_ids", []),
                        })
        else:
            print("No specific subtopics provided. Selecting intelligently from the whole tree.")
            for main_topic, subtopics in params.knowledge_tree.items():
                for subtopic_name, data in subtopics.items():
                    if data.get("mastery_level", 0) < 5:
                        subtopics_to_cover.append({
                            "main_topic": main_topic,
                            "subtopic": subtopic_name,
                            "chunk_ids": data.get("chunk_ids", []),
                            "mastery_level": data.get("mastery_level", 0),
                            "confidence": data.get("confidence", 0.0)
                        })
            subtopics_to_cover.sort(key=lambda x: (x["mastery_level"], x["confidence"]))
            random.shuffle(subtopics_to_cover)

        if not subtopics_to_cover:
            print("No suitable subtopics found to generate a quiz.")
            return QuestionList(questions=[])

        prompt_template = PromptTemplate(
            template="""
                Odpowiadaj wyłącznie w języku polskim. To jest BARDZO WAŻNE.
                Jesteś ekspertem w projektowaniu quizów edukacyjnych. Twoim zadaniem jest wygenerowanie dokładnie {num_questions} pytań jednokrotnego wyboru dla podtematu: "{subtopic_name}" należącego do głównego tematu "{main_topic}".
                Pytania muszą być oparte WYŁĄCZNIE na poniższym kontekście.
                ---KONTEKST---
                {context}
                ---KONIEC KONTEKSTU---
                **Wymagania:**
                - Skup się na najważniejszych pojęciach z kontekstu dotyczących podtematu.
                - Każde pytanie musi mieć 4 wiarygodne opcje.
                - Pole `topic` dla każdego pytania MUSI BYĆ DOKŁADNIE: "{topic_path_string}"
                - Pole `correctAnswer` musi być dokładnym tekstem jednej z opcji.
                Zwróć WYŁĄCZNIE poprawny obiekt JSON zgodny ze schematem:
                {format_instructions}
                Wszystkie pytania, odpowiedzi i opisy muszą być po polsku.
            """,
            input_variables=["context", "main_topic", "subtopic_name", "topic_path_string", "num_questions"],
            partial_variables={"format_instructions": format_instructions}
        )
        chain = prompt_template | llm | parser

        all_questions: List[Question] = []

        num_subtopics = len(subtopics_to_cover)
        questions_per_topic = params.total_questions_needed // num_subtopics
        remaining_questions = params.total_questions_needed % num_subtopics

        for i, subtopic_data in enumerate(subtopics_to_cover):
            if len(all_questions) >= params.total_questions_needed:
                break

            chunk_texts = get_chunks_by_ids(user_id=params.user_id, chunk_ids=subtopic_data["chunk_ids"])
            if not chunk_texts:
                continue

            context = "\n\n".join(chunk_texts)
            main_topic = subtopic_data["main_topic"]
            subtopic_name = subtopic_data["subtopic"]
            topic_path_str = f"{subtopic_name}"

            num_questions = questions_per_topic + (1 if i < remaining_questions else 0)
            print(f"Generating {num_questions} questions for subtopic: '{topic_path_str}'")

            try:
                quiz_part = chain.invoke({
                    "context": context,
                    "main_topic": main_topic,
                    "subtopic_name": subtopic_name,
                    "topic_path_string": topic_path_str,
                    "num_questions": num_questions
                })
                if quiz_part and quiz_part.questions:
                    for q in quiz_part.questions:
                        q.topic = topic_path_str
                    all_questions.extend(quiz_part.questions)
            except Exception as e:
                print(f"An error occurred while processing subtopic '{topic_path_str}': {e}")
                continue

        final_questions = all_questions[:params.total_questions_needed]
        return QuestionList(questions=final_questions)

    except Exception as e:
        print(f"A critical error occurred in generate_quiz_from_tree: {e}")
        return QuestionList(questions=[])
