from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.subscription import Subscription
from app.models.usage_stat import UsageStats
from app.models.user import User
from app.services.auth_service import get_current_user


def get_user_usage_limits(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    usage = db.query(UsageStats).filter_by(user_id=current_user.id).order_by(UsageStats.period_end.desc()).first()
    sub = db.query(Subscription).filter_by(user_id=current_user.id, is_active=True).first()

    if not usage or not sub:
        raise HTTPException(status_code=400, detail="Subscription or usage data missing")

    return {
        "usage": usage,
        "plan": sub.plan
    }
