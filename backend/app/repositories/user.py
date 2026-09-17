from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

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

    def create(self, user_data: UserCreate, hashed_password: str) -> User:
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name
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
            password_hash=None
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