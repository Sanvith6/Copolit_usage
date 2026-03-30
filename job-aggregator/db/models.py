"""
SQLAlchemy database models for the Job Aggregator.

Supported databases: PostgreSQL (recommended) and SQLite (for local dev / tests).
Set DATABASE_URL environment variable, e.g.:
    postgresql://user:password@localhost:5432/jobs_db
    sqlite:///./jobs.db
"""

import os
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jobs.db")

engine = create_engine(
    DATABASE_URL,
    # pool_pre_ping keeps the connection healthy across scheduler restarts
    pool_pre_ping=True,
    # SQLite needs check_same_thread=False for multi-threaded access
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal: sessionmaker[Session] = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


class Job(Base):
    """Stores a single scraped job listing."""

    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    link = Column(String(2048), nullable=False, unique=True)
    source = Column(String(64), nullable=False)
    date_posted = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    score = Column(Integer, default=0)
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())

    def __repr__(self) -> str:
        return f"<Job id={self.id} title={self.title!r} company={self.company!r} score={self.score}>"


def init_db() -> None:
    """Create all tables if they do not already exist."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """
    Dependency-injection helper for FastAPI endpoints.

    Usage::

        @app.get("/jobs")
        def list_jobs(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def upsert_jobs(jobs: list[dict], db: Session) -> tuple[list[dict], int]:
    """
    Insert new jobs and skip duplicates (matched by ``link``).

    Returns:
        (inserted_jobs, skipped_count) where inserted_jobs is the list of
        newly inserted job dicts.
    """
    inserted_jobs: list[dict] = []
    skipped = 0
    for job_data in jobs:
        link = job_data.get("link", "")
        if not link:
            skipped += 1
            continue
        existing = db.query(Job).filter(Job.link == link).first()
        if existing:
            skipped += 1
            continue
        job = Job(
            title=job_data.get("title", ""),
            company=job_data.get("company", ""),
            location=job_data.get("location", ""),
            link=link,
            source=job_data.get("source", ""),
            date_posted=job_data.get("date_posted", ""),
            description=job_data.get("description", ""),
            score=job_data.get("score", 0),
        )
        db.add(job)
        inserted_jobs.append(job_data)
    db.commit()
    return inserted_jobs, skipped
