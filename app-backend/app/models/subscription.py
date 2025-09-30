from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="subscriptions")

    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    is_yearly = Column(Boolean, default=False)

    stripe_subscription_id = Column(String, unique=False, nullable=True)
    stripe_customer_id = Column(String, unique=False, nullable=True)

    start_date = Column(DateTime, default=datetime.utcnow)
    current_period_end = Column(DateTime, nullable=False)
    canceled_at = Column(DateTime, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

