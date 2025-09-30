from fastapi import Form
from pydantic import EmailStr

from app.schemas.contact import ContactIn


def as_form(
        topic: str = Form(...),
        subject: str = Form(...),
        email: EmailStr = Form(...),
        message: str = Form(...)
) -> ContactIn:
    return ContactIn(
        topic=topic,
        subject=subject,
        email=email,
        message=message
    )
