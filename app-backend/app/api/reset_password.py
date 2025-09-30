import os
from datetime import datetime

from fastapi import APIRouter, Depends, BackgroundTasks, Request, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.password_reset_token import PasswordResetToken, hash_token, generate_reset_token, expiry_dt, mask_email
from app.models.user import User
from app.schemas.reset_pass import ForgotPasswordIn, VerifyTokenOut, ResetPasswordIn
from app.services.auth_service import get_password_hash
from app.services.email_service import send_reset_email


router = APIRouter()

APP_URL = "http://localhost:3000"
APP_NAME = os.getenv("APP_NAME", "Your App")
RESET_TOKEN_TTL_MIN = 30


@router.post("/forgot")
def forgot_password(payload: ForgotPasswordIn, bg: BackgroundTasks, db: Session = Depends(get_db),
                    request: Request = None):
    # zawsze 200 – bez enumeracji
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        token = generate_reset_token()
        token_h = hash_token(token)
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=token_h,
            expires_at=expiry_dt(),  # bazuje na RESET_TOKEN_TTL_MIN
            created_ip=request.client.host if request else None
        ))
        db.commit()

        reset_link = f"{APP_URL}/new-password?token={token}"

        # wysyłka w tle (nie blokuje requestu)
        bg.add_task(send_reset_email, user.email, reset_link, APP_NAME, RESET_TOKEN_TTL_MIN)

    return {"ok": True}


@router.get("/verify", response_model=VerifyTokenOut)
def verify_token(token: str, db: Session = Depends(get_db)):
    token_h = hash_token(token)
    rec = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_h
    ).first()
    if not rec or rec.used_at or rec.expires_at < datetime.utcnow():
        return VerifyTokenOut(ok=False)

    email_mask = mask_email(rec.user.email)
    return VerifyTokenOut(ok=True, email_mask=email_mask)


@router.post("/reset")
def reset_password(data: ResetPasswordIn, db: Session = Depends(get_db)):
    token_h = hash_token(data.token)
    rec = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_h
    ).with_for_update().first()

    if not rec or rec.used_at or rec.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = rec.user
    # ustaw nowe hasło
    user.password_hash = get_password_hash(data.new_password)
    rec.used_at = datetime.utcnow()

    db.commit()
    return {"ok": True}
