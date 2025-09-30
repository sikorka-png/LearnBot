import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base

RESET_TOKEN_TTL_MIN = 30


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash = Column(String(128), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    used_at = Column(DateTime, nullable=True)
    created_ip = Column(String(45), nullable=True)

    user = relationship("User")


def expiry_dt():
    return datetime.utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MIN)


def generate_reset_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def mask_email(email: str) -> str:
    name, domain = email.split("@", 1)
    return name[0] + "***@" + domain
