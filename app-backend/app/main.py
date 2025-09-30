from fastapi import FastAPI

from app.api import file, user, notes, exam, quiz, stripe, flashcard, study_card, focus_study, reset_password, \
    quick_exam, focus_study_answer_checker
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, chat
from app.core.database import Base, engine
from app.core.initializer import initialize_plans
from app.schedulers.limits import start_scheduler

Base.metadata.create_all(bind=engine)
initialize_plans()

scheduler = None
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")
app.include_router(chat.router, prefix="/chat")
app.include_router(file.router, prefix="/file")
app.include_router(user.router, prefix="/user")
app.include_router(notes.router, prefix="/notes")
app.include_router(exam.router, prefix="/exam")
app.include_router(quiz.router, prefix="/quiz")
app.include_router(stripe.router, prefix="/payments")
app.include_router(flashcard.router, prefix="/flashcard")
app.include_router(study_card.router, prefix="/study_card")
app.include_router(focus_study.router, prefix="/focus_study")
app.include_router(reset_password.router, prefix="/password")
app.include_router(quick_exam.router, prefix="/quick_exam")
app.include_router(focus_study_answer_checker.router, prefix="/answer_checker")


@app.on_event("startup")
async def _startup():
    global scheduler
    scheduler = start_scheduler()


@app.on_event("shutdown")
async def _shutdown():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
