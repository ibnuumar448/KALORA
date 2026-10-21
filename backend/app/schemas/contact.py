from pydantic import BaseModel, EmailStr, Field, field_validator


class ContactSubmission(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=150)
    message: str = Field(min_length=10, max_length=5000)

    @field_validator("name", "email", "subject", "message", mode="before")
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("name", "subject")
    @classmethod
    def reject_header_line_breaks(cls, value):
        if any(ord(character) < 32 or ord(character) == 127 for character in value):
            raise ValueError("Control characters are not allowed")
        return value