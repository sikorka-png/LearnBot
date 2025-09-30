from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.decorators.token import get_current_user_from_cookie
from app.models.user import User
from app.schemas.user import UserDetails, UserUpdate, UsageAndLimits
from app.services.user_service import update_user, get_user_plan, get_usage_and_limits

router = APIRouter()


@router.get("", response_model=UserDetails)
def insert(
        current_user: User = Depends(get_current_user_from_cookie)
):
    return UserDetails(
        username=current_user.username,
        email=current_user.email
    )


@router.patch("/update")
def update(
        user_data: UserUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    update_user(db, current_user.id, user_data)
    return {"message": "User updated"}


@router.get("/subscription/current")
def get_current_subscription(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    plan = get_user_plan(db, current_user.id)
    return plan


@router.get("/limits", response_model=UsageAndLimits)
def get_user_usage_and_limits(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    limits = get_usage_and_limits(current_user.id, db)
    return limits
