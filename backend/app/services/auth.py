from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserResponse

# Configure passlib to use argon2 as specified by the guide
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

class AuthService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register_user(self, user_in: UserCreate) -> UserResponse:
        # Check if email is already taken
        if self.repo.get_by_email(user_in.email):
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password and save
        hashed_pw = pwd_context.hash(user_in.password)
        user = self.repo.create(user_in, hashed_pw)
        return user
    def authenticate_user(self, email: str, password: str):
        user = self.repo.get_by_email(email)
        if not user:
            return None
        # Verify the plain text password against the stored hash
        if not user.password_hash or not pwd_context.verify(password, user.password_hash):
            return None
        return user
        
    def handle_google_oauth(self, code: str):
        # MOCKING Google OAuth verification for now
        # In real scenario, exchange `code` for token and get user info from Google
        # Here we pretend `code` is just the email we want to login with for testing
        mocked_email = f"{code}@example.com" if not "@" in code else code
        mocked_name = code.split("@")[0].capitalize()
        mocked_google_id = f"google_id_{mocked_email}"

        identity = self.repo.get_by_provider_id("google", mocked_google_id)
        if identity:
            return identity.user

        user = self.repo.get_by_email(mocked_email)
        if user:
            self.repo.link_identity(user.id, "google", mocked_google_id, mocked_email)
            return user
            
        return self.repo.create_oauth_user(mocked_email, mocked_name, "google", mocked_google_id)