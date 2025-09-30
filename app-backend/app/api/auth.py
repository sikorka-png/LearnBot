from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.decorators.token import get_current_user_from_cookie
from app.exceptions.user_exception import UserExistsException
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin
from app.services import auth_service

router = APIRouter()


@router.post("/register")
def register(user: UserCreate, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_service.create_user(db, user)
    except UserExistsException:
        raise HTTPException(status_code=409, detail="User exists")

    response.set_cookie(
        key="access_token",
        value=user.access_token,
        httponly=True,
        secure=False,  # TODO zmienić na True na produkcji
        samesite="strict",
        max_age=int(timedelta(hours=24).total_seconds())
    )

    return {"message": "Signed up"}


@router.post("/login")
def login(credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    response.set_cookie(
        key="access_token",
        value=user.access_token,
        httponly=True,
        secure=False,  # TODO zmienić na True na produkcji
        samesite="strict",
        max_age=int(timedelta(hours=24).total_seconds())
    )

    return {"message": "Logged in"}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}


@router.get("/me")
def get_current_user(
        current_user: User = Depends(get_current_user_from_cookie)
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }
