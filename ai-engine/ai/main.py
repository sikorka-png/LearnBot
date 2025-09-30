from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ai.api import chat, pinecone, notes, exam, quiz, flashcard, knowledge_tree, key_concepts, problem_practice, \
    focus_study_chat_helper, quick_exam, focus_study_answer_checker

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat")
app.include_router(pinecone.router, prefix="/knowledge")
app.include_router(notes.router, prefix="/notes")
app.include_router(exam.router, prefix="/exam")
app.include_router(quiz.router, prefix="/quiz")
app.include_router(flashcard.router, prefix="/flashcard")
app.include_router(knowledge_tree.router, prefix="/knowledge_tree")
app.include_router(key_concepts.router, prefix="/key_concepts")
app.include_router(problem_practice.router, prefix="/problem_practice")
app.include_router(focus_study_chat_helper.router, prefix="/focus_study_helper")
app.include_router(quick_exam.router, prefix="/quick_exam")
app.include_router(focus_study_answer_checker.router, prefix="/focus_study_answer")
