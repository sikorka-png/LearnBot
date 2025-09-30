import logging
import os
from datetime import datetime, timedelta

import jwt
from dateutil.relativedelta import relativedelta
from jwt import InvalidTokenError
from passlib.context import CryptContext
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.exceptions.token_exception import TokenExpiredException, InvalidTokenException, NoTokenException
from app.exceptions.user_exception import UserExistsException, UserNotFoundException
from app.models.chat_group import ChatGroup
from app.models.subscription import Subscription
from app.models.subscription_plan import SubscriptionPlan
from app.models.usage_stat import UsageStats
from app.models.user import User
from app.schemas.user import UserOut
from app.services import user_service

logger = logging.getLogger("stripe_webhook")

SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_user(db: Session, user_data) -> UserOut:
    if user_service.does_user_exists(db, user_data.email):
        raise UserExistsException()

    hashed = get_password_hash(user_data.password)
    user = User(username=user_data.username, email=user_data.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)

    now = datetime.utcnow()
    free_plan = db.query(SubscriptionPlan) \
        .filter_by(name="free") \
        .first()
    subscription = Subscription(
        user_id=user.id,
        plan_id=free_plan.id,
        start_date=now,
        stripe_subscription_id="-1",
        current_period_end=now + relativedelta(years=50),
        is_active=True
    )
    db.add(subscription)
    db.commit()

    stats = UsageStats(
        user_id=user.id,
        period_start=now,
        period_end=now + relativedelta(months=1)
    )
    db.add(stats)
    db.commit()

    general = ChatGroup(
        name="General",
        description="Default general chat",
        color="gray",
        internetConnection=True,
        user_id=user.id,
        files=[]
    )
    db.add(general)
    db.commit()

    access_token = create_access_token(data={"sub": str(user.id)})
    return UserOut(
        access_token=access_token
    )


def authenticate_user(db: Session, email: str, password: str) -> UserOut | None:
    user = db.query(User).filter(User.email == email).first()
    if user and verify_password(password, user.hashed_password):
        access_token = create_access_token(data={"sub": str(user.id)})
        return UserOut(
            access_token=access_token
        )
    return None


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    encoded = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded


def verify_jwt_from_cookie(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if datetime.utcnow().timestamp() > payload.get("exp", 0):
            raise TokenExpiredException()
        return payload
    except InvalidTokenError:
        raise InvalidTokenException()


def get_current_user(db: Session, token: str):
    if not token:
        raise NoTokenException()
    try:
        payload = verify_jwt_from_cookie(token)
    except TokenExpiredException:
        raise TokenExpiredException()
    except InvalidTokenException:
        raise InvalidTokenException()

    user_id = int(str(payload["sub"]))
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise UserNotFoundException()

    return user


def update_user_plan(
        db: Session,
        user_id: int,
        subscription_id,
        plan: str,
        current_period_start,
        current_period_end,
        customer_id
):
    current_period_end = current_period_end + relativedelta(days=7)
    is_yearly = False
    if " - year" in plan:
        plan = plan.replace(" - year", "")
        is_yearly = True

    # usuniecie poprzedniego planu (planu free)
    active_subscription = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True
        )
    ).first()
    if active_subscription:
        active_subscription.is_active = False
        db.commit()

    # dodanie nowego planu
    user_plan = db.query(SubscriptionPlan) \
        .filter_by(name=plan) \
        .first()
    subscription = Subscription(
        user_id=user_id,
        plan_id=user_plan.id,
        is_yearly=is_yearly,
        stripe_subscription_id=subscription_id,
        stripe_customer_id=customer_id,
        start_date=current_period_start,
        current_period_end=current_period_end,
        is_active=True,
        canceled_at=None
    )
    db.add(subscription)
    db.commit()


def change_to_higher_plan(db: Session, user_id: int, plan_name, current_period_end):
    # usuwam wszystkie wczesniej zaplanowane plany
    planned_subs = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.stripe_subscription_id == None
        )
    ).all()
    for ps in planned_subs:
        db.delete(ps)

    is_yearly = False
    if " - year" in plan_name:
        plan_name = plan_name.replace(" - year", "")
        is_yearly = True
    plan = db.query(SubscriptionPlan) \
        .filter_by(name=plan_name) \
        .first()

    active_subscription = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.stripe_subscription_id != None
        )
    ).first()
    active_subscription.plan_id = plan.id
    active_subscription.current_period_end = current_period_end
    active_subscription.is_yearly = is_yearly
    active_subscription.canceled_at = None
    db.commit()


# ustawimy dlugosc nowej gorszej subskrypcji na 7 dni bo jesli platnosc przejdzie to samo sie ustawi na poprawna,
# a jesli nie to sie po prostu usunie
def change_to_lowe_plan(db: Session, user_id: int, plan_name, customer_id, current_period_start):
    # usuwam wszystkie wczesniej zaplanowane plany
    planned_subs = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.stripe_subscription_id == None
        )
    ).all()
    for ps in planned_subs:
        db.delete(ps)

    # ustawiam date zmiany obecnego planu
    active_subscription = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.stripe_subscription_id != None
        )
    ).first()
    active_subscription.canceled_at = datetime.now()

    is_yearly = False
    if " - year" in plan_name:
        plan_name = plan_name.replace(" - year", "")
        is_yearly = True
    plan = db.query(SubscriptionPlan) \
        .filter_by(name=plan_name) \
        .first()

    start_dt = datetime.utcfromtimestamp(current_period_start)
    end_dt = start_dt + relativedelta(days=7)
    subscription = Subscription(
        user_id=user_id,
        plan_id=plan.id,
        is_yearly=is_yearly,
        stripe_customer_id=customer_id,
        current_period_end=end_dt,
        is_active=True,
        canceled_at=None
    )
    db.add(subscription)
    db.commit()


def plan_extension(db: Session, user_id: int, current_period_end, plan_name: str, subscription_id):
    plan_id = db.query(SubscriptionPlan.id) \
        .filter(SubscriptionPlan.name == plan_name) \
        .first()[0]

    # przedluzenie planu
    active_subscription = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.plan_id == plan_id
        )
    ).first()

    # ta metoda wywoluje sie w 2 przypadkach
    # 1. kupiłem plan i przeszła płatność
    # 2. plan przedłużył się automatycznie
    #
    # w przypadku pierwszym nie mam pewności, czy ta metoda uruchomi się jako druga ale to w niczym nie przeszkadza,
    # ponieważ wszyskie operacje zakładania planu są wykonywane w metodzie update_user_plan
    #
    # w przypadku drugim wywołą się tylko ta metoda, skoro plan się przedłużył to oznacza, że ja mam aktywny plan
    # o podanym id i wejdzie do ifa
    if active_subscription:
        logger.info("====== active_subscription ======")
        current_period_end = current_period_end + relativedelta(days=7)
        active_subscription.current_period_end = current_period_end
        active_subscription.canceled_at = None
        active_subscription.stripe_subscription_id = subscription_id

        # reset usage_stat
        usage_stat = db.query(UsageStats) \
            .filter(UsageStats.user_id == user_id) \
            .first()

        usage_stat.chat_messages = 0
        usage_stat.total_file_mb = 0
        usage_stat.number_of_generated_questions = 0
        usage_stat.generated_study_cards = 0
        usage_stat.study_sessions = 0
        usage_stat.number_of_generating_notes = 0
        usage_stat.number_of_enhance_notes = 0

        db.commit()


def cancel_plan(db: Session, user_id: int):
    # ustawiam date zakonczenia planu dzieki temu mozna przefiltrowac codziennine czy wygisic jakies plany
    active_subscription = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.stripe_subscription_id != None
        )
    ).first()

    active_subscription.canceled_at = datetime.utcnow()
    active_subscription.is_active = False

    other_active = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.id != active_subscription.id
        )
    ).first()

    # dodajemy tylko w tedy kiedy nie mamy zaplanowanego innego planu
    if not other_active:
        now = datetime.utcnow()
        free_plan = db.query(SubscriptionPlan) \
            .filter_by(name="free") \
            .first()
        subscription = Subscription(
            user_id=user_id,
            plan_id=free_plan.id,
            start_date=now,
            stripe_subscription_id="-1",
            current_period_end=now + relativedelta(years=50),
            is_active=True
        )
        db.add(subscription)

        usage_stat = db.query(UsageStats) \
            .filter(UsageStats.user_id == user_id) \
            .first()

        usage_stat.chat_messages = 0
        usage_stat.total_file_mb = 0
        usage_stat.number_of_generated_questions = 0
        usage_stat.generated_study_cards = 0
        usage_stat.study_sessions = 0
        usage_stat.number_of_generating_notes = 0
        usage_stat.number_of_enhance_notes = 0

    db.commit()


def cancel_schedules(db: Session, user_id: int):
    planned_subs = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.stripe_subscription_id == None
        )
    ).all()
    for ps in planned_subs:
        db.delete(ps)

    db.commit()
