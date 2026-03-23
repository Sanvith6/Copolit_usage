"""
FastAPI backend for the Job Aggregator.

Endpoints:
    GET  /jobs          – list stored jobs (with optional filters)
    GET  /jobs/{id}     – get a single job by ID
    POST /run           – manually trigger a scrape + process + notify cycle
    GET  /health        – health check
"""

import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from db.models import Job, get_db, init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialised.")
    yield


app = FastAPI(
    title="DevOps Job Aggregator",
    description="Aggregates DevOps / Cloud / SRE intern job listings from multiple sources.",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Pydantic response schemas
# ---------------------------------------------------------------------------


class JobOut(BaseModel):
    id: int
    title: str
    company: str
    location: str | None
    link: str
    source: str
    date_posted: str | None
    score: int
    notified: bool

    model_config = {"from_attributes": True}


class RunResult(BaseModel):
    scraped: int
    inserted: int
    skipped: int
    notified: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/jobs", response_model=list[JobOut])
def list_jobs(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    source: str | None = Query(None, description="Filter by source (linkedin / indeed)"),
    min_score: int = Query(0, ge=0, le=100),
) -> list[Job]:
    query = db.query(Job).filter(Job.score >= min_score)
    if source:
        query = query.filter(Job.source == source)
    return query.order_by(desc(Job.score)).offset(offset).limit(limit).all()


@app.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Annotated[Session, Depends(get_db)]) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/run", response_model=RunResult)
def run_pipeline(db: Annotated[Session, Depends(get_db)]) -> RunResult:
    """
    Manually trigger a full scrape → filter → rank → store → notify pipeline run.
    """
    from core.filter import deduplicate_jobs, filter_jobs
    from core.rank import rank_jobs
    from db.models import upsert_jobs
    from notifier.telegram import send_job_alert
    from scrapers.indeed import scrape_indeed_jobs
    from scrapers.linkedin import scrape_linkedin_jobs

    raw_jobs = scrape_linkedin_jobs() + scrape_indeed_jobs()
    filtered = filter_jobs(raw_jobs)
    deduped = deduplicate_jobs(filtered)
    ranked = rank_jobs(deduped)

    new_jobs, skipped = upsert_jobs(ranked, db)

    # Notify only about newly inserted jobs (up to 20)
    top_new = new_jobs[:20]
    send_job_alert(top_new)

    # Mark notified jobs in the DB using a single IN query
    notified_links = [j["link"] for j in top_new]
    if notified_links:
        db.query(Job).filter(Job.link.in_(notified_links)).update(
            {"notified": True}, synchronize_session="fetch"
        )
        db.commit()

    return RunResult(
        scraped=len(raw_jobs),
        inserted=len(new_jobs),
        skipped=skipped,
        notified=len(top_new),
    )
