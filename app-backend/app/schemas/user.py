from typing import Optional

from pydantic import BaseModel, EmailStr, model_validator, Field


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    access_token: str

    class Config:
        from_attributes = True


class UserDetails(BaseModel):
    username: str
    email: EmailStr


class UserUpdate(BaseModel):
    username: str
    old_password: Optional[str] = None
    new_password: Optional[str] = None
    confirm_password: Optional[str] = None

    @model_validator(mode="after")
    def check_password_fields(self):
        old = self.old_password
        new = self.new_password
        confirm = self.confirm_password
        filled = [x for x in [old, new, confirm] if x not in (None, '')]
        if filled and (not old or not new or not confirm):
            raise ValueError("All passwords are required")
        if filled and new != confirm:
            raise ValueError("Passwords don't match")
        return self


class PlanIn(BaseModel):
    plan: str


class UsageLimitEntry(BaseModel):
    current: Optional[float] = None
    limit: Optional[float] = None


class UsageAndLimits(BaseModel):
    AI_Chats: UsageLimitEntry = Field(..., alias="AI Chats")
    Chat_Groups: UsageLimitEntry = Field(..., alias="Chat Groups")
    Study_Sessions: UsageLimitEntry = Field(..., alias="Study Sessions")
    Storage: UsageLimitEntry = Field(..., alias="Storage")
    Files: UsageLimitEntry = Field(..., alias="Files")
    Exams: UsageLimitEntry = Field(..., alias="Exams")
    Study_Cards: UsageLimitEntry = Field(..., alias="Created Study Cards")
    Notes: UsageLimitEntry = Field(..., alias="Notes")
    Generated_Notes: UsageLimitEntry = Field(..., alias="Generated Notes")
    Enhance_Notes: UsageLimitEntry = Field(..., alias="Enhance Notes")
