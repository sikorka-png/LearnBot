import logging
import os
from datetime import datetime

import stripe
from fastapi import HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.models.subscription_plan import SubscriptionPlan
from app.models.user import User
from app.schemas.user import PlanIn
from app.services.auth_service import update_user_plan, plan_extension, cancel_plan, change_to_higher_plan, \
    change_to_lowe_plan, cancel_schedules
from app.services.user_service import get_user_id_from_customer, save_customer_id

logger = logging.getLogger("stripe_webhook")

STRIPE_KEY = os.environ["STRIPE_KEY"]
stripe.api_key = STRIPE_KEY

PRICE_IDS = {
    "basic": "price_1RksIc2fKuvpViwjEo4z9gBK",
    "pro": "price_1RksJJ2fKuvpViwjsDZiLgRn",
    "premium": "price_1RksJb2fKuvpViwjuvLeBq8i",
    "basic - year": "price_1RksKM2fKuvpViwjMOqEWa4h",
    "pro - year": "price_1RksKi2fKuvpViwjWkq3tNHb",
    "premium - year": "price_1RksL42fKuvpViwjYt5UT592",
}

PLAN_ORDER = {
    "basic": 1,
    "basic - year": 2,
    "pro": 3,
    "pro - year": 4,
    "premium": 5,
    "premium - year": 6,
}


def get_stripe_url(db: Session, plan: str, email: str, user_id: int):
    user_customer_id = db.query(User.customer_id).filter(User.id == user_id).first()[0]
    if not user_customer_id:
        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": user_id}
        )
        save_customer_id(user_id, customer.id, db)
        user_customer_id = customer.id

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        customer=user_customer_id,
        line_items=[{
            "price": PRICE_IDS[plan],
            "quantity": 1,
        }],
        payment_method_collection="always",
        success_url="http://localhost:3000",
        cancel_url="http://localhost:3000/account",
    )

    return session.id


def cancel_user_plan(db: Session, user_id: int):
    sub = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.is_active == True,
        Subscription.stripe_subscription_id != None
    ).first()
    current_plan = db.query(SubscriptionPlan) \
        .filter_by(id=sub.plan_id) \
        .first()

    if current_plan.name == "free":
        raise HTTPException(status_code=400, detail="Can't cancel free plan")
    if sub.canceled_at:
        raise HTTPException(status_code=400, detail="Plan already canceled")

    stripe.Subscription.modify(
        sub.stripe_subscription_id,
        cancel_at_period_end=True
    )

    # usuniecie potencjalnie wczesniej zaplanowanej subskrybcji (downgradu)
    schedules = stripe.SubscriptionSchedule.list(customer=sub.stripe_customer_id)
    for schedule in schedules.auto_paging_iter():
        if schedule["status"] in ("not_started", "active"):
            stripe.SubscriptionSchedule.cancel(schedule["id"])
    cancel_schedules(db, user_id)

    sub.canceled_at = datetime.now()
    db.commit()


def change_plan(db: Session, user_id: int, plan: PlanIn):
    sub = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.is_active == True,
        Subscription.stripe_subscription_id != None
    ).first()
    current_plan = db.query(SubscriptionPlan) \
        .filter_by(id=sub.plan_id) \
        .first()

    if current_plan.name == "free":
        raise HTTPException(status_code=400, detail="Can't upgrade from free - use create-checkout-session")
    if plan.plan == "free":
        raise HTTPException(status_code=400, detail="Can't downgrade from free - use cancel-subscription")

    if PLAN_ORDER[plan.plan] > PLAN_ORDER[current_plan.name]:
        upgrade_plan(db, user_id, plan)
    elif PLAN_ORDER[plan.plan] < PLAN_ORDER[current_plan.name]:
        downgrade_plan(db, user_id, plan)
    else:
        raise HTTPException(status_code=400, detail="You already have this plan")


def upgrade_plan(db: Session, user_id: int, plan: PlanIn):
    sub = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.stripe_subscription_id != None
        )
    ).first()

    subscription = stripe.Subscription.retrieve(sub.stripe_subscription_id)
    subscription_item = subscription["items"]["data"][0]
    subscription_item_id = subscription_item["id"]
    old_price_id = subscription_item["price"]["id"]
    new_price_id = PRICE_IDS[plan.plan]

    # usuniecie potencjalnie wczesniej zaplanowanej subskrybcji (downgradu)
    schedules = stripe.SubscriptionSchedule.list(customer=sub.stripe_customer_id)
    for schedule in schedules.auto_paging_iter():
        if schedule["status"] in ("not_started", "active"):
            stripe.SubscriptionSchedule.cancel(schedule["id"])
    cancel_schedules(db, user_id)

    stripe.Subscription.modify(
        sub.stripe_subscription_id,
        items=[{
            "id": subscription_item_id,
            "price": new_price_id,
        }],
        proration_behavior="create_prorations",
        cancel_at_period_end=False
    )

    try:
        invoice = stripe.Invoice.create(
            customer=subscription["customer"],
            subscription=sub.stripe_subscription_id,
            collection_method="charge_automatically",
            auto_advance=True
        )
        stripe.Invoice.pay(invoice.id)
    except Exception as e:
        logger.warning(f"Failed to pay prorated invoice: {e}")

        # rollback do poprzedniego planu
        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            items=[{
                "id": subscription_item_id,
                "price": old_price_id,
            }],
            proration_behavior="none",
            cancel_at_period_end=False
        )
        # platnosc nie przeszla wiec plan sie nie zmienia - nie trzeba aktualizowac nic w bazie


def downgrade_plan(db: Session, user_id: int, plan: PlanIn):
    sub = db.query(Subscription).filter(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.stripe_subscription_id != None
        )
    ).first()

    subscription = stripe.Subscription.retrieve(sub.stripe_subscription_id)
    customer_id = subscription["customer"]
    new_price_id = PRICE_IDS.get(plan.plan)
    current_period_end = subscription["items"]["data"][0]["current_period_end"]

    stripe.Subscription.modify(
        sub.stripe_subscription_id,
        cancel_at_period_end=True,
    )

    # usuniecie potencjalnie wczesniej zaplanowanej subskrybcji (downgradu)
    schedules = stripe.SubscriptionSchedule.list(customer=sub.stripe_customer_id)
    for schedule in schedules.auto_paging_iter():
        if schedule["status"] in ("not_started", "active"):
            stripe.SubscriptionSchedule.cancel(schedule["id"])
    cancel_schedules(db, user_id)

    stripe.SubscriptionSchedule.create(
        customer=customer_id,
        start_date=current_period_end,
        end_behavior="release",
        phases=[
            {
                "items": [{
                    "price": new_price_id,
                    "quantity": 1
                }]
            }
        ]
    )

    change_to_lowe_plan(db, user_id, plan.plan, customer_id, current_period_end)


def handle_stripe_webhook_event(db: Session, event_type, data_object):
    if event_type == "checkout.session.completed":
        subscription_id = data_object.get("subscription")
        subscription = stripe.Subscription.retrieve(
            subscription_id,
            expand=["items"]
        )
        customer_id = subscription["customer"]

        user_id = get_user_id_from_customer(customer_id, db)

        item = subscription["items"]["data"][0]
        start_ts = item.get("current_period_start")
        end_ts = item.get("current_period_end")
        current_period_start = datetime.utcfromtimestamp(start_ts)
        current_period_end = datetime.utcfromtimestamp(end_ts)

        product_id = item["price"]["product"]
        product = stripe.Product.retrieve(product_id)
        plan_name = product["name"]

        logger.info("========== checkout.session.completed OK ==========")
        logger.info(f"🧾 Subscription ID: {subscription_id}")
        logger.info(f"👤 User ID: {user_id}")
        logger.info(f"📦 Plan name: {plan_name}")
        logger.info(f"⏳ Start date: {current_period_start}")
        logger.info(f"📅 End date: {current_period_end}")

        update_user_plan(db, user_id, subscription_id, plan_name, current_period_start, current_period_end, customer_id)

        # usuwanie poprzednich kart
        payment_method_id = subscription.get("default_payment_method")

        new_pm = stripe.PaymentMethod.retrieve(payment_method_id)
        new_fingerprint = new_pm["card"]["fingerprint"]

        existing_methods = stripe.PaymentMethod.list(
            customer=customer_id,
            type="card"
        )["data"]

        for method in existing_methods:
            if method["id"] == payment_method_id:
                continue
            if method["card"]["fingerprint"] == new_fingerprint:
                stripe.PaymentMethod.detach(method["id"])

        # ustawienie defaultowej karty
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payment_method_id}
        )

    elif event_type == "invoice.payment_succeeded":
        # logger.info("==================== invoice.payment_succeeded ====================")
        # logger.info(data_object)

        item_list = data_object["lines"]["data"]
        customer_id = data_object.get("customer")
        user_id = get_user_id_from_customer(customer_id, db)

        # jesli jest schedule to tutaj przychodzli platność za nowy plan jako drugi item w liście
        if len(item_list) == 1:
            line_item = data_object["lines"]["data"][0]
        else:
            line_item = data_object["lines"]["data"][1]

        subscription_id = line_item["parent"]["subscription_item_details"]["subscription"]

        end_ts = line_item["period"]["end"]
        current_period_end = datetime.utcfromtimestamp(end_ts)

        product_id = line_item["pricing"]["price_details"]["product"]
        product = stripe.Product.retrieve(product_id)
        plan_name = product["name"]

        logger.info("========== invoice.payment_succeeded OK ==========")
        logger.info(f"👤 User ID: {user_id}")
        logger.info(f"📅 End date: {current_period_end}")
        logger.info(f"🔁 Subscription ID: {subscription_id}")
        logger.info(f"📦 Plan name: {plan_name}")

        if len(item_list) > 1:
            change_to_higher_plan(db, user_id, plan_name, current_period_end)
        else:
            plan_extension(db, user_id, current_period_end, plan_name, subscription_id)

        # robi natychmiastowy release subskrypcji kiedy zostanie ona aktywowana przez SubscriptionSchedule dzięki czemu
        # można później na niej wykonać metodę modify()
        schedules = stripe.SubscriptionSchedule.list(customer=customer_id)
        for schedule in schedules.auto_paging_iter():
            if (
                    schedule.get("subscription") == subscription_id
                    and schedule["status"] == "active"
                    and schedule["current_phase"]
            ):
                logger.info(f"🔓 Releasing schedule: {schedule['id']} after activation")
                stripe.SubscriptionSchedule.release(schedule["id"])

    elif event_type == "customer.subscription.deleted":
        customer_id = data_object.get("customer")
        user_id = get_user_id_from_customer(customer_id, db)

        logger.info("========== customer.subscription.deleted OK ==========")
        # logger.info(data_object)
        logger.info(f"👤 User ID: {user_id}")

        cancel_plan(db, user_id)

    if event_type == "invoice.created":
        invoice_id = data_object["id"]
        try:
            stripe.Invoice.finalize_invoice(invoice_id)
            logger.info(f"✅ Faktura {invoice_id} została sfinalizowana ręcznie")
            stripe.Invoice.pay(invoice_id)
            logger.info(f"💳 Płatność dla faktury {invoice_id} została wymuszona")
        except stripe.error.InvalidRequestError as e:
            logger.warning(f"❌ Nie udało się sfinalizować faktury {invoice_id}: {e}")

    if event_type == "invoice.payment_failed":
        logger.info("karta zostala odrzucona")
        # todo powiadomienie na froncie - pewnie jakis raise exception?


def get_portal_session(user_id: int, db: Session):
    user_row = db.query(User.customer_id).filter(User.id == user_id).first()
    if not user_row[0]:
        raise HTTPException(status_code=404, detail="User not found")
    session = stripe.billing_portal.Session.create(
        customer=user_row[0],
        return_url="http://localhost:3000/account"
    )
    return session.url


def get_card(user_id: int, db: Session):
    user_row = db.query(User.customer_id).filter(User.id == user_id).first()
    if not user_row[0]:
        raise HTTPException(status_code=404, detail="Customer id not found")

    logger.info("==========================")
    logger.info(user_row)

    customer = stripe.Customer.retrieve(
        user_row[0],
        expand=["invoice_settings.default_payment_method"]
    )
    pm = customer["invoice_settings"]["default_payment_method"]
    if pm and pm["object"] == "payment_method" and pm["type"] == "card":
        card = pm["card"]
        return card["last4"]
    return None
