from pydantic import BaseModel, EmailStr, Field


class ContactIn(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    message: str = Field(..., min_length=5, max_length=1000)
