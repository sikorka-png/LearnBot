from functools import wraps
from typing import Callable, Any
from datetime import datetime
import inspect

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.usage_stat import UsageStats
from app.models.subscription import Subscription
from app.models.subscription_plan import SubscriptionPlan
from app.decorators.token import get_current_user_from_cookie


def check_usage_limit(usage_field: str, plan_field: str):
    """
    usage_field: pole z UsageStats (np. 'chat_messages')
    plan_field: pole z SubscriptionPlan (np. 'max_chat_messages')
    """

    def decorator(endpoint_func: Callable[..., Any]):
        @wraps(endpoint_func)
        async def wrapper(
            *args,
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user_from_cookie),
            **kwargs,
        ):
            subscription = (
                db.query(Subscription)
                .filter(Subscription.user_id == current_user.id, Subscription.is_active == True)
                .order_by(Subscription.start_date.desc())
                .first()
            )
            if not subscription or subscription.current_period_end < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No active subscription.",
                )

            plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Subscription plan not found.",
                )

            usage = (
                db.query(UsageStats)
                .filter(UsageStats.user_id == current_user.id)
                .order_by(UsageStats.period_start.desc())
                .first()
            )
            if not usage:
                usage_value = 0
            else:
                usage_value = getattr(usage, usage_field, None)

            if usage_value is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Usage field '{usage_field}' not found on UsageStats.",
                )

            max_allowed = getattr(plan, plan_field, None)
            if max_allowed is not None and usage_value >= max_allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Usage limit reached for '{usage_field}'.",
                )

            result = endpoint_func(*args, db=db, current_user=current_user, **kwargs)
            if inspect.isawaitable(result):
                return await result
            return result

        return wrapper

    return decorator
