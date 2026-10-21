from datetime import datetime
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_verification_token_hash(self, token_hash: str) -> User | None:
        return (
            self.db.query(User)
            .filter(User.verification_token_hash == token_hash)
            .with_for_update()
            .first()
        )

    def get_by_email_for_update(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).with_for_update().first()

    def get_by_reset_password_token(self, token: str) -> User | None:
        return self.db.query(User).filter(User.reset_password_token == token).first()

    def get_by_provider_id(self, provider: str, provider_user_id: str):
        from app.models.user import AuthIdentity
        return self.db.query(AuthIdentity).filter(
            AuthIdentity.provider == provider, 
            AuthIdentity.provider_user_id == provider_user_id
        ).first()

    def link_identity(self, user_id: str, provider: str, provider_user_id: str, email: str):
        from app.models.user import AuthIdentity
        identity = AuthIdentity(
            user_id=user_id,
            provider=provider,
            provider_user_id=provider_user_id,
            email=email
        )
        self.db.add(identity)
        self.db.commit()

    def create(
        self,
        user_data: UserCreate,
        hashed_password: str,
        verification_token_hash: str,
        verification_token_expires_at: datetime,
        verification_email_attempted_at: datetime,
    ) -> User:
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            is_email_verified=False,
            verification_token=None,
            verification_token_hash=verification_token_hash,
            verification_token_expires_at=verification_token_expires_at,
            verification_email_last_attempt_at=verification_email_attempted_at,
            verification_email_window_started_at=verification_email_attempted_at,
            verification_email_send_count=1,
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def create_oauth_user(self, email: str, full_name: str, provider: str, provider_user_id: str) -> User:
        from app.models.user import AuthIdentity
        db_user = User(
            email=email,
            full_name=full_name,
            password_hash=None,
            is_email_verified=False,
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)

        identity = AuthIdentity(
            user_id=db_user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            email=email
        )
        self.db.add(identity)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user