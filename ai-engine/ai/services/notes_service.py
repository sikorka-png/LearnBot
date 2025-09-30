from ai.agents.notes_agent import build_notes_generation_graph, enhance_notes_with_agent
from ai.schemas.notes import NotesGenerate, NoteEnhance


class NotesService:
    def __init__(self, api_key, default_model="gpt-4o-mini", default_temperature=0.7):
        self.api_key = api_key
        self.default_model = default_model
        self.default_temperature = default_temperature

    def generate_notes(self, notes_data: NotesGenerate, model=None, temperature=None):
        model = model or self.default_model
        temperature = temperature or self.default_temperature

        graph = build_notes_generation_graph()

        output = graph.invoke({
            "topic": notes_data.topic,
            "focus": notes_data.focus,
            "user_id": notes_data.user_id,
            "filenames": notes_data.filenames,
            "attempt": 0,
            "notes": "",
            "feedback": "",
            "partial_notes": []
        })
        return output["notes"]

    def enhance_notes(self, notes_data: NoteEnhance, model=None, temperature=None):
        model = model or self.default_model
        temperature = temperature or self.default_temperature

        output = enhance_notes_with_agent(notes_data.content, notes_data.improvement, notes_data.user_id,
                                          notes_data.filenames)

        return output
