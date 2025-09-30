import os

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session

import stripe
from app.core.database import get_db
from app.decorators.token import get_current_user_from_cookie
from app.models.user import User
from app.schemas.user import PlanIn
from app.services.stripe_service import get_stripe_url, handle_stripe_webhook_event, cancel_user_plan, change_plan, \
    get_portal_session, get_card

router = APIRouter()

STRIPE_KEY = os.environ["STRIPE_KEY"]
WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]
stripe.api_key = STRIPE_KEY


@router.post("/create-checkout-session")
def create_checkout_session(
        plan: PlanIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    session_id = get_stripe_url(db, plan.plan, current_user.email, current_user.id)
    return {"id": session_id}


@router.post("/cancel-subscription")
async def cancel_subscription(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    cancel_user_plan(db, current_user.id)
    return {"message": "Subskrypcja zostanie anulowana po zakończeniu bieżącego okresu."}


@router.post("/change-plan")
async def change_user_plan(
        plan: PlanIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_cookie)
):
    # upgrade dziala ale chyba w bazie sie nie pokazuje
    change_plan(db, current_user.id, plan)
    return {"message": "Plan upgraded and prorated"}


@router.post("/webhook")
async def stripe_webhook(
        request: Request,
        stripe_signature: str = Header(None),
        db: Session = Depends(get_db),
):
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event['type']
    data_object = event['data']['object']

    handle_stripe_webhook_event(db, event_type, data_object)

    return {"status": "ok"}


@router.get("/portal-session")
def create_portal_session(
        current_user: User = Depends(get_current_user_from_cookie),
        db: Session = Depends(get_db)
):
    url = get_portal_session(current_user.id, db)
    return {"url": url}


@router.get("/method")
def get_user_card(
        current_user: User = Depends(get_current_user_from_cookie),
        db: Session = Depends(get_db)
):
    last4 = get_card(current_user.id, db)
    return {"last4": last4}
