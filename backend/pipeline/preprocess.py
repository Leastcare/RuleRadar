"""
preprocess.py — Clean and normalise raw comment text.

Rules:
- Strip common form-letter salutations / sign-offs
- Collapse whitespace
- Lowercase for comparison vectors (original text preserved separately)
- Remove very short comments (< 20 chars after cleaning) — likely blank submissions
"""

import re
import logging

logger = logging.getLogger(__name__)

# Salutation / sign-off patterns common in form-letter comment campaigns
_SALUTATION_PATTERNS = [
    r"^(dear\s+)?(administrator|secretary|director|commissioner|sir|madam|to whom it may concern)[,:\s]*",
    r"^(re|subject|regarding)[:]\s+",
    r"(sincerely|regards|respectfully|thank you)[,.]?\s*$",
    r"^\s*\[.*?\]\s*",   # bracketed placeholders like [YOUR NAME]
]
_SALUTATION_RE = re.compile(
    "|".join(_SALUTATION_PATTERNS),
    flags=re.IGNORECASE | re.MULTILINE,
)

_WHITESPACE_RE = re.compile(r"\s+")


def preprocess(comments: list[dict]) -> list[dict]:
    """
    Given a list of raw comment dicts (each with at least 'text'),
    return a new list of dicts with an added 'cleanText' field.
    Comments that are too short after cleaning are dropped.
    """
    result = []
    dropped = 0
    for comment in comments:
        raw = comment.get("text", "")
        cleaned = _clean(raw)
        if len(cleaned) < 20:
            dropped += 1
            continue
        result.append({**comment, "cleanText": cleaned})

    logger.info(
        "Preprocessing complete: %d kept, %d dropped (too short)",
        len(result), dropped,
    )
    return result


def _clean(text: str) -> str:
    """Normalise a single comment string for similarity comparison."""
    # Remove salutation / sign-off boilerplate
    text = _SALUTATION_RE.sub(" ", text)
    # Collapse whitespace
    text = _WHITESPACE_RE.sub(" ", text).strip()
    # Lowercase for vectorisation (original text kept in 'text' field)
    return text.lower()
