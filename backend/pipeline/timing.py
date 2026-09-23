"""
timing.py — Secondary coordination signal: submission-timestamp clustering.

A cluster flagged by text similarity is ALSO timing-suspicious if a meaningful
fraction of its members were submitted in an unnaturally tight burst window.

Why this matters (from the spec):
  Topically similar comments can appear similar by chance (e.g., everyone says
  "clean air is important" on an EPA docket). The timing signal provides an
  independent check: genuinely organic commenters write at random times, while
  coordinated campaigns often produce bursts of submissions over a short period
  because a call-to-action email was sent, a webpage auto-submitted, etc.

  Requiring BOTH signals to agree meaningfully reduces false positives.
"""

import logging
from datetime import datetime, timezone

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config

logger = logging.getLogger(__name__)

_TIMESTAMP_FORMATS = [
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M:%S.%fZ",
    "%Y-%m-%dT%H:%M:%S%z",
    "%Y-%m-%d",
]


def score_cluster_timing(cluster: dict) -> dict:
    """
    Analyse the submission timestamps of a cluster's members.

    Adds to the cluster dict:
        timing_suspicious   bool  — True if timing signal fires
        timing_score        float — 0.0–1.0 (fraction of members in tightest burst)
        timing_note         str   — human-readable explanation for the UI
    """
    members = cluster.get("members", [])
    timestamps = []

    for m in members:
        ts = _parse_timestamp(m.get("submittedAt", ""))
        if ts:
            timestamps.append(ts)

    if len(timestamps) < 2:
        return {
            **cluster,
            "timing_suspicious": False,
            "timing_score": 0.0,
            "timing_note": "Insufficient timestamp data to evaluate timing.",
        }

    timestamps.sort()
    burst_fraction = _largest_burst_fraction(timestamps, config.TIMING_WINDOW_SECONDS)
    is_suspicious = burst_fraction >= config.TIMING_BURST_FRACTION

    if is_suspicious:
        note = (
            f"{int(burst_fraction * 100)}% of comments in this cluster were submitted "
            f"within a {config.TIMING_WINDOW_SECONDS // 60}-minute window — "
            "an unusually tight burst for independent organic commenters."
        )
    else:
        note = (
            f"Submissions spread across a wider timeframe "
            f"(tightest burst covers {int(burst_fraction * 100)}% of members)."
        )

    logger.debug(
        "Cluster %d timing: burst_fraction=%.2f suspicious=%s",
        cluster.get("cluster_id", -1), burst_fraction, is_suspicious,
    )

    return {
        **cluster,
        "timing_suspicious": is_suspicious,
        "timing_score": round(burst_fraction, 4),
        "timing_note": note,
    }


def annotate_clusters(clusters: list[dict]) -> list[dict]:
    """Apply timing scoring to every cluster. Returns annotated list."""
    return [score_cluster_timing(c) for c in clusters]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_timestamp(raw: str) -> datetime | None:
    """Try several ISO-8601 formats; return None if unparseable."""
    if not raw:
        return None
    for fmt in _TIMESTAMP_FORMATS:
        try:
            dt = datetime.strptime(raw, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def _largest_burst_fraction(timestamps: list[datetime], window_seconds: int) -> float:
    """
    Sliding-window maximum: find the largest number of timestamps that fit
    within any window of `window_seconds`, then return that as a fraction of
    total timestamps.

    O(N²) — fine for clusters of a few hundred comments.
    """
    n = len(timestamps)
    max_in_window = 1
    for i in range(n):
        count = 1
        for j in range(i + 1, n):
            delta = (timestamps[j] - timestamps[i]).total_seconds()
            if delta <= window_seconds:
                count += 1
            else:
                break  # timestamps are sorted
        max_in_window = max(max_in_window, count)
    return max_in_window / n
