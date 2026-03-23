"""
Main orchestrator for the Job Aggregator pipeline.

Run directly (e.g., via cron or GitHub Actions) to execute a full cycle:
    1. Scrape jobs from LinkedIn + Indeed (via Apify)
    2. Filter for relevant DevOps / Cloud / SRE intern roles
    3. Deduplicate
    4. Rank by relevance score
    5. Store new jobs in the database
    6. Send Telegram alert for newly added jobs
"""

import logging
import sys

from core.filter import deduplicate_jobs, filter_jobs
from core.rank import rank_jobs
from db.models import SessionLocal, init_db, upsert_jobs
from notifier.telegram import send_job_alert
from scrapers.indeed import scrape_indeed_jobs
from scrapers.linkedin import scrape_linkedin_jobs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def run() -> None:
    logger.info("=== Job Aggregator Pipeline Started ===")

    # Step 1: Initialise DB
    init_db()

    # Step 2: Scrape
    logger.info("Scraping LinkedIn…")
    linkedin_jobs = scrape_linkedin_jobs()
    logger.info("Scraping Indeed…")
    indeed_jobs = scrape_indeed_jobs()
    raw_jobs = linkedin_jobs + indeed_jobs
    logger.info("Total raw jobs scraped: %d", len(raw_jobs))

    # Step 3: Filter
    filtered = filter_jobs(raw_jobs)
    logger.info("Jobs after filtering: %d", len(filtered))

    # Step 4: Deduplicate
    deduped = deduplicate_jobs(filtered)
    logger.info("Jobs after deduplication: %d", len(deduped))

    if not deduped:
        logger.info("No relevant jobs found. Exiting.")
        return

    # Step 5: Rank
    ranked = rank_jobs(deduped)
    logger.info("Top job score: %d | Bottom score: %d", ranked[0]["score"], ranked[-1]["score"])

    # Step 6: Store
    with SessionLocal() as db:
        new_jobs, skipped = upsert_jobs(ranked, db)
        logger.info("Inserted: %d | Skipped (duplicates): %d", len(new_jobs), skipped)

    # Step 7: Notify about only newly inserted jobs
    top_new = new_jobs[:20]

    # Step 7: Notify
    if top_new:
        send_job_alert(top_new)
        logger.info("Notification sent for %d jobs.", len(top_new))
    else:
        logger.info("No new jobs to notify about.")

    logger.info("=== Pipeline Complete ===")


if __name__ == "__main__":
    run()
