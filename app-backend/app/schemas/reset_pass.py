from pydantic import BaseModel, EmailStr, Field


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class VerifyTokenOut(BaseModel):
    ok: bool
    email_mask: str | None = None


class ResetPasswordIn(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8)
