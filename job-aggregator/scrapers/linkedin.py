"""
LinkedIn job scraper using Apify Actor.

Requires:
    APIFY_API_TOKEN environment variable set.
    Apify actor: apify/linkedin-jobs-scraper
"""

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN", "")
ACTOR_ID = "curious_coder/linkedin-jobs-scraper"
APIFY_BASE_URL = "https://api.apify.com/v2"


def _build_run_input(keywords: list[str], location: str, max_jobs: int) -> dict[str, Any]:
    return {
        "queries": [{"query": kw, "location": location} for kw in keywords],
        "maxJobs": max_jobs,
    }


def scrape_linkedin_jobs(
    keywords: list[str] | None = None,
    location: str = "United States",
    max_jobs: int = 50,
) -> list[dict[str, Any]]:
    """
    Run the Apify LinkedIn jobs scraper and return a list of raw job dicts.

    Each job dict contains at minimum:
        title, company, location, link, date_posted, source
    """
    if keywords is None:
        keywords = ["DevOps Intern", "Cloud Intern", "SRE Intern", "Platform Engineer Intern"]

    if not APIFY_API_TOKEN:
        logger.warning("APIFY_API_TOKEN not set — returning empty result for LinkedIn scraper.")
        return []

    run_input = _build_run_input(keywords, location, max_jobs)
    run_url = f"{APIFY_BASE_URL}/acts/{ACTOR_ID}/run-sync-get-dataset-items"

    logger.info("Starting LinkedIn Apify scraper for keywords: %s", keywords)
    try:
        with httpx.Client(timeout=300) as client:
            response = client.post(
                run_url,
                params={"token": APIFY_API_TOKEN, "timeout": 240},
                json=run_input,
            )
            response.raise_for_status()
            raw_jobs: list[dict[str, Any]] = response.json()
    except httpx.HTTPError as exc:
        logger.error("LinkedIn scraper HTTP error: %s", exc)
        return []

    jobs = []
    for item in raw_jobs:
        jobs.append(
            {
                "title": item.get("title", ""),
                "company": item.get("companyName", ""),
                "location": item.get("location", ""),
                "link": item.get("url", ""),
                "date_posted": item.get("postedAt", ""),
                "description": item.get("description", ""),
                "source": "linkedin",
            }
        )

    logger.info("LinkedIn scraper returned %d jobs.", len(jobs))
    return jobs
