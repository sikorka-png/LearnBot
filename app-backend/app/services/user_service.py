import logging

from dateutil.relativedelta import relativedelta
from passlib.context import CryptContext
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.models.subscription_plan import SubscriptionPlan
from app.models.usage_stat import UsageStats
from app.models.user import User
from app.schemas.user import UserUpdate, UsageAndLimits, UsageLimitEntry

logger = logging.getLogger("stripe_webhook")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def does_user_exists(db: Session, email: int):
    user = db.query(User).filter(User.email == email).first()
    return user


def get_password_hash(password):
    return pwd_context.hash(password)


def update_user(db: Session, user_id: int, user_data: UserUpdate):
    user = db.query(User).filter(User.id == user_id).first()

    user.username = user_data.username
    if user_data.new_password:
        if not user_data.old_password:
            raise ValueError("Old password is required to change password")
        if not verify_password(user_data.old_password, user.hashed_password):
            raise ValueError("Old password does not match")
        user.hashed_password = get_password_hash(user_data.new_password)

    db.commit()
    db.refresh(user)


def get_user_plan(db: Session, user_id: int):
    subs = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.is_active == True,
        Subscription.plan_id != 1  # plan free
    ).order_by(Subscription.start_date.asc()).all()

    if not subs:
        return {
            "name": "free",
            "current_period_end": None,
            "canceled_at": None,
            "next_plan": None,
            "is_yearly": None,
            "is_next_yearly": None
        }

    sub = subs[0]
    plan = db.query(SubscriptionPlan) \
        .filter_by(id=sub.plan_id) \
        .first()

    next_plan = None
    if len(subs) > 1:
        next_plan_obj = db.query(SubscriptionPlan) \
            .filter_by(id=subs[1].plan_id) \
            .first()
        next_plan = next_plan_obj.name

    return {
        "name": plan.name,
        "current_period_end": sub.current_period_end - relativedelta(days=7),
        "canceled_at": sub.canceled_at,
        "next_plan": next_plan,
        "is_yearly": sub.is_yearly
    }


def save_customer_id(user_id: int, customer_id, db: Session):
    user = db.query(User) \
        .filter(User.id == user_id) \
        .first()
    user.customer_id = customer_id
    db.commit()


def get_user_id_from_customer(customer_id: str, db: Session) -> int | None:
    user = db.query(User) \
        .filter(User.customer_id == customer_id) \
        .first()
    return user.id


def get_usage_and_limits(user_id: int, db: Session):
    usage = db.query(UsageStats) \
        .filter(UsageStats.user_id == user_id) \
        .first()

    plan_id = db.query(Subscription.plan_id).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.stripe_subscription_id != None
        )
    ).first()[0]

    plan = db.query(SubscriptionPlan) \
        .filter(SubscriptionPlan.id == plan_id) \
        .first()

    mapping = {
        "AI Chats": ("chat_messages", "max_chat_messages"),
        "Chat Groups": ("chat_groups", "max_chat_groups"),
        "Study Sessions": ("study_sessions", "max_study_sessions"),
        "Storage": ("total_file_mb", "max_total_file_mb"),
        "Files": ("number_of_files", "max_number_of_files"),
        "Exams": ("number_of_exams", "max_number_of_exams"),
        "Created Study Cards": ("generated_study_cards", "max_generated_study_cards"),
        "Notes": ("number_of_notes", "max_number_of_notes"),
        "Generated Notes": ("number_of_generating_notes", "max_number_of_generating_notes"),
        "Enhance Notes": ("number_of_enhance_notes", "max_number_of_enhance_notes"),
    }

    values = {}
    for key, (usage_attr, plan_attr) in mapping.items():
        values[key] = UsageLimitEntry(
            current=getattr(usage, usage_attr, None) if usage else None,
            limit=getattr(plan, plan_attr, None) if plan else None
        )

    return UsageAndLimits(**values)
