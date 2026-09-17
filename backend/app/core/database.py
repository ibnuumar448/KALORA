from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Using the same credentials from your docker-compose file
SQLALCHEMY_DATABASE_URL = "postgresql://kalora_user:kalora_password@localhost:5432/kalora_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# This dependency will provide a database session to our routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()