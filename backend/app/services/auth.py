import re
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserResponse
from app.services.email import EmailDeliveryError, EmailService

VERIFICATION_TOKEN_TTL = timedelta(hours=24)
VERIFICATION_RESEND_COOLDOWN = timedelta(minutes=1)
VERIFICATION_SEND_WINDOW = timedelta(hours=24)
VERIFICATION_MAX_SENDS_PER_WINDOW = 5


def _verification_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

# Configure passlib to use argon2 as specified by the guide
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

class AuthService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register_user(self, user_in: UserCreate) -> UserResponse:
        # Check password strength
        pw = user_in.password
        if len(pw) < 8 or not re.search(r'[A-Z]', pw) or not re.search(r'[a-z]', pw) or not re.search(r'\d', pw) or not re.search(r'[@$!%*?&#^_-]', pw):
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.")

        # Check if email is already taken
        if self.repo.get_by_email(user_in.email):
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash password and save
        hashed_pw = pwd_context.hash(user_in.password)
        now = datetime.now(timezone.utc)
        verification_token = secrets.token_urlsafe(32)
        user = self.repo.create(
            user_in,
            hashed_pw,
            _verification_token_hash(verification_token),
            now + VERIFICATION_TOKEN_TTL,
            now,
        )

        try:
            EmailService().send_verification_email(user.email, verification_token)
        except EmailDeliveryError as exc:
            raise HTTPException(
                status_code=503,
                detail="Account created, but the verification email could not be sent. Please request another verification email.",
            ) from exc

        return user

    def verify_email(self, token: str):
        user = self.repo.get_by_verification_token_hash(_verification_token_hash(token))
        if not user or not user.verification_token_expires_at:
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")

        expires_at = user.verification_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) >= expires_at:
            raise HTTPException(status_code=400, detail="Verification token has expired")

        if user.is_email_verified:
            return user

        user.is_email_verified = True
        user.email_verified_at = datetime.now(timezone.utc)
        user.verification_token = None
        user.verification_token_hash = None
        user.verification_token_expires_at = None
        self.repo.db.commit()
        return user

    def authenticate_user(self, email: str, password: str):
        user = self.repo.get_by_email(email)
        if not user:
            return None
        # Verify the plain text password against the stored hash
        if not user.password_hash or not pwd_context.verify(password, user.password_hash):
            return None
        if not user.is_email_verified:
            raise HTTPException(
                status_code=403,
                detail="Verify your email address before logging in.",
                headers={"X-Error-Code": "email_not_verified"},
            )
        return user

    def resend_verification_email(self, email: str) -> None:
        now = datetime.now(timezone.utc)
        user = self.repo.get_by_email_for_update(email)
        if not user or user.is_email_verified:
            return

        window_started_at = user.verification_email_window_started_at
        if window_started_at and window_started_at.tzinfo is None:
            window_started_at = window_started_at.replace(tzinfo=timezone.utc)
        if not window_started_at or now - window_started_at >= VERIFICATION_SEND_WINDOW:
            user.verification_email_window_started_at = now
            user.verification_email_send_count = 0

        last_attempt_at = user.verification_email_last_attempt_at
        if last_attempt_at and last_attempt_at.tzinfo is None:
            last_attempt_at = last_attempt_at.replace(tzinfo=timezone.utc)
        if last_attempt_at and now - last_attempt_at < VERIFICATION_RESEND_COOLDOWN:
            self.repo.db.rollback()
            return
        if user.verification_email_send_count >= VERIFICATION_MAX_SENDS_PER_WINDOW:
            self.repo.db.rollback()
            return

        token = secrets.token_urlsafe(32)
        user.verification_token = None
        user.verification_token_hash = _verification_token_hash(token)
        user.verification_token_expires_at = now + VERIFICATION_TOKEN_TTL
        user.verification_email_last_attempt_at = now
        user.verification_email_send_count += 1
        self.repo.db.commit()

        try:
            EmailService().send_verification_email(user.email, token)
        except EmailDeliveryError as exc:
            raise HTTPException(
                status_code=503,
                detail="The verification email could not be sent. Please try again later.",
            ) from exc

    def handle_google_oauth(self, code: str):
        raise HTTPException(
            status_code=501,
            detail="Google sign-in is not available yet",
        )

    def request_password_reset(self, email: str):
        user = self.repo.get_by_email(email)
        if not user:
            # Silently return to prevent email enumeration
            return

        token = secrets.token_urlsafe(32)
        user.reset_password_token = token
        # Token expires in 1 hour
        user.reset_password_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        self.repo.db.commit()

        email_service = EmailService()
        email_service.send_password_reset_email(user.email, token)

    def reset_password(self, token: str, new_password: str):
        user = self.repo.get_by_reset_password_token(token)

        if not user or not user.reset_password_expires:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        # Check if token is expired
        if datetime.now(timezone.utc) > user.reset_password_expires:
            raise HTTPException(status_code=400, detail="Reset token has expired")

        # Check password strength
        if len(new_password) < 8 or not re.search(r'[A-Z]', new_password) or not re.search(r'[a-z]', new_password) or not re.search(r'\d', new_password) or not re.search(r'[@$!%*?&#^_-]', new_password):
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.")

        user.password_hash = pwd_context.hash(new_password)
        user.reset_password_token = None
        user.reset_password_expires = None
        self.repo.db.commit()
        return user