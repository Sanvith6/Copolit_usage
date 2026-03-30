"""
Filtering logic for job listings.

Keeps only relevant DevOps / Cloud / SRE intern-level roles
and rejects senior or unrelated positions.
"""

import re
from typing import Any

# Keywords that must appear (case-insensitive) in the title to be considered relevant
INCLUDE_TITLE_KEYWORDS: list[str] = [
    "devops",
    "cloud",
    "sre",
    "site reliability",
    "platform engineer",
    "infrastructure",
    "backend",
    "kubernetes",
    "docker",
    "aws",
    "azure",
    "gcp",
]

# The word "intern" (or internship) must also be present in the title or description
INTERN_KEYWORDS: list[str] = ["intern", "internship", "co-op", "coop", "co op", "trainee", "apprentice"]

# Patterns that signal a senior / experienced role — reject these
EXCLUDE_TITLE_PATTERNS: list[str] = [
    r"\bsenior\b",
    r"\bstaff\b",
    r"\bprincipal\b",
    r"\blead\b",
    r"\bdirector\b",
    r"\bmanager\b",
    r"\bvp\b",
    r"\bhead of\b",
    r"\barchitect\b",
]

# Experience requirements that disqualify a job (found in description)
EXCLUDE_EXPERIENCE_PATTERNS: list[str] = [
    r"\b[3-9]\+?\s*years?\b",
    r"\b1[0-9]\+?\s*years?\b",
    r"\bminimum\s+[3-9]\s+years?\b",
    r"\bat least\s+[3-9]\s+years?\b",
]


def _text(job: dict[str, Any]) -> str:
    """Combine title + description into a single lower-cased string for matching."""
    return " ".join([job.get("title", ""), job.get("description", "")]).lower()


def _title(job: dict[str, Any]) -> str:
    return job.get("title", "").lower()


def is_intern_level(job: dict[str, Any]) -> bool:
    """Return True if the job appears to be an internship / entry-level position."""
    combined = _text(job)
    return any(kw in combined for kw in INTERN_KEYWORDS)


def is_relevant_role(job: dict[str, Any]) -> bool:
    """Return True if the title contains at least one relevant keyword."""
    title = _title(job)
    return any(kw in title for kw in INCLUDE_TITLE_KEYWORDS)


def is_senior_role(job: dict[str, Any]) -> bool:
    """Return True if the title signals a senior / non-intern position."""
    title = _title(job)
    return any(re.search(pat, title) for pat in EXCLUDE_TITLE_PATTERNS)


def has_excessive_experience(job: dict[str, Any]) -> bool:
    """Return True if the description requires 3+ years of experience."""
    description = job.get("description", "").lower()
    return any(re.search(pat, description) for pat in EXCLUDE_EXPERIENCE_PATTERNS)


def filter_jobs(jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Filter a list of raw job dicts and return only relevant intern-level roles.

    Keeps a job when ALL of the following are true:
        - title contains at least one relevant keyword
        - job appears to be an intern / entry-level role
        - title does NOT signal a senior position
        - description does NOT require 3+ years of experience
    """
    filtered = []
    for job in jobs:
        if not is_relevant_role(job):
            continue
        if not is_intern_level(job):
            continue
        if is_senior_role(job):
            continue
        if has_excessive_experience(job):
            continue
        filtered.append(job)
    return filtered


def deduplicate_jobs(jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Remove duplicate jobs based on (title, company) pair (case-insensitive).
    The first occurrence is kept; subsequent duplicates are dropped.
    """
    seen: set[tuple[str, str]] = set()
    unique = []
    for job in jobs:
        key = (job.get("title", "").lower().strip(), job.get("company", "").lower().strip())
        if key not in seen:
            seen.add(key)
            unique.append(job)
    return unique
