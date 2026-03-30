"""
Ranking / scoring logic for filtered job listings.

Each job is assigned a relevance score (0–100) based on how well it
matches the target profile of a DevOps / Cloud intern candidate.
"""

import re
from typing import Any

# High-value technical keywords — each occurrence adds points
HIGH_VALUE_KEYWORDS: dict[str, int] = {
    "kubernetes": 10,
    "k8s": 10,
    "docker": 8,
    "aws": 8,
    "azure": 7,
    "gcp": 7,
    "terraform": 8,
    "ci/cd": 8,
    "github actions": 7,
    "jenkins": 6,
    "ansible": 6,
    "linux": 5,
    "python": 5,
    "bash": 4,
    "devops": 6,
    "cloud": 5,
    "sre": 6,
    "site reliability": 6,
    "monitoring": 4,
    "prometheus": 5,
    "grafana": 5,
    "helm": 5,
    "microservices": 4,
    "infrastructure as code": 6,
    "iac": 5,
    "devsecops": 7,
}

# Bonus for explicitly mentioning entry-level / no-experience requirements
ENTRY_LEVEL_PATTERNS: list[str] = [
    r"\b0[\s\-–]?1\s*years?\b",
    r"\bno experience\b",
    r"\bentry.?level\b",
    r"\bfreshers?\b",
    r"\brecent gradu",
]

MAX_KEYWORD_SCORE = 60
ENTRY_LEVEL_BONUS = 20
INTERN_TITLE_BONUS = 20


def _text(job: dict[str, Any]) -> str:
    return " ".join([job.get("title", ""), job.get("description", "")]).lower()


def _title(job: dict[str, Any]) -> str:
    return job.get("title", "").lower()


def score_job(job: dict[str, Any]) -> int:
    """
    Compute a relevance score between 0 and 100 for a single job.

    Scoring breakdown:
        - Keyword matches (capped at MAX_KEYWORD_SCORE)
        - Bonus for entry-level / no-experience language (ENTRY_LEVEL_BONUS)
        - Bonus for "intern" appearing in the job title (INTERN_TITLE_BONUS)
    """
    combined = _text(job)
    title = _title(job)

    # Keyword score
    keyword_score = 0
    for keyword, points in HIGH_VALUE_KEYWORDS.items():
        if keyword in combined:
            keyword_score += points
    keyword_score = min(keyword_score, MAX_KEYWORD_SCORE)

    # Entry-level bonus
    entry_bonus = ENTRY_LEVEL_BONUS if any(re.search(p, combined) for p in ENTRY_LEVEL_PATTERNS) else 0

    # Intern-in-title bonus
    intern_title_bonus = INTERN_TITLE_BONUS if "intern" in title else 0

    return min(keyword_score + entry_bonus + intern_title_bonus, 100)


def rank_jobs(jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Score and sort jobs by relevance in descending order.

    Adds a 'score' key to each job dict.
    Returns the sorted list (highest score first).
    """
    for job in jobs:
        job["score"] = score_job(job)
    return sorted(jobs, key=lambda j: j["score"], reverse=True)
