"""
Telegram notification module.

Sends daily job alert messages via a Telegram Bot.

Required environment variables:
    TELEGRAM_BOT_TOKEN  – Bot token from @BotFather
    TELEGRAM_CHAT_ID    – Chat / channel ID to post alerts to
"""

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
TELEGRAM_API_BASE = "https://api.telegram.org"

MAX_MESSAGE_LENGTH = 4096  # Telegram limit per message


def _send_message(text: str, parse_mode: str = "HTML") -> bool:
    """Send a single text message to the configured Telegram chat."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning("Telegram credentials not configured — skipping notification.")
        return False

    url = f"{TELEGRAM_API_BASE}/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }
    try:
        with httpx.Client(timeout=30) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            return True
    except httpx.HTTPError as exc:
        logger.error("Telegram send error: %s", exc)
        return False


def _format_job(index: int, job: dict[str, Any]) -> str:
    title = job.get("title", "N/A")
    company = job.get("company", "N/A")
    location = job.get("location", "N/A")
    link = job.get("link", "#")
    score = job.get("score", 0)
    return (
        f"{index}. <b>{title}</b> – {company}\n"
        f"   📍 {location}  |  ⭐ Score: {score}\n"
        f"   🔗 <a href='{link}'>Apply here</a>"
    )


def _chunk_messages(header: str, job_lines: list[str]) -> list[str]:
    """
    Split job lines into multiple messages if they exceed Telegram's limit.
    Each chunk starts with the header.
    """
    chunks: list[str] = []
    current = header + "\n\n"
    for line in job_lines:
        candidate = current + line + "\n\n"
        if len(candidate) > MAX_MESSAGE_LENGTH:
            chunks.append(current.strip())
            current = header + " (cont.)\n\n" + line + "\n\n"
        else:
            current = candidate
    if current.strip():
        chunks.append(current.strip())
    return chunks


def send_job_alert(jobs: list[dict[str, Any]]) -> None:
    """
    Send a formatted Telegram alert with the top new job listings.

    Args:
        jobs: List of job dicts (already filtered and ranked).
              Each dict must contain at least: title, company, location, link, score.
    """
    if not jobs:
        logger.info("No jobs to notify about.")
        return

    header = "🚀 <b>New DevOps Intern Jobs Today!</b>"
    job_lines = [_format_job(i + 1, job) for i, job in enumerate(jobs)]
    messages = _chunk_messages(header, job_lines)

    for msg in messages:
        success = _send_message(msg)
        if success:
            logger.info("Telegram alert sent (%d chars).", len(msg))
