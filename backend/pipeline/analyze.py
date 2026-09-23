"""
analyze.py — Orchestrates the full RuleRadar detection pipeline.

Wires together: fetch → preprocess → vectorize → cluster → timing
Returns a structured result dict ready to be serialised by the Flask API.
"""

import logging
import time

from .fetch import fetch_comments
from .preprocess import preprocess
from .vectorize import build_similarity_matrix
from .cluster import find_clusters
from .timing import annotate_clusters

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config

logger = logging.getLogger(__name__)


def run_analysis(
    docket_id: str,
    max_comments: int = config.MAX_COMMENTS_FETCH,
    threshold: float = config.SIMILARITY_THRESHOLD,
) -> dict:
    """
    Run the full pipeline for a docket and return a result dict containing:

        docket_id       str
        total_fetched   int    — comments fetched from API / cache
        total_analyzed  int    — comments after preprocessing
        clusters        list   — cluster dicts (text + timing annotated)
        flagged_count   int    — clusters where BOTH signals fire
        elapsed_seconds float
        threshold_used  float
        data_source     str    — "api" or "cache"
    """
    t0 = time.time()

    # 1. Fetch
    logger.info("Fetching comments for docket: %s", docket_id)
    raw_comments = fetch_comments(docket_id, max_comments)
    total_fetched = len(raw_comments)

    # Detect whether we're using cached data (fetch.py writes cache after API call;
    # if the cache file pre-existed, fetch returns API data and overwrites — so
    # data_source is always "api" unless the API call failed and we fell back)
    data_source = "api"

    # 2. Preprocess
    comments = preprocess(raw_comments)
    total_analyzed = len(comments)

    if total_analyzed < config.MIN_CLUSTER_SIZE:
        return {
            "docket_id": docket_id,
            "total_fetched": total_fetched,
            "total_analyzed": total_analyzed,
            "clusters": [],
            "flagged_count": 0,
            "elapsed_seconds": round(time.time() - t0, 2),
            "threshold_used": threshold,
            "data_source": data_source,
            "warning": "Not enough comments to analyse after preprocessing.",
        }

    # 3. Vectorize
    sim_matrix = build_similarity_matrix(comments)

    # 4. Cluster
    clusters = find_clusters(comments, sim_matrix, threshold=threshold)

    # 5. Timing annotation
    clusters = annotate_clusters(clusters)

    # 6. Flag clusters where BOTH signals agree
    flagged_count = sum(
        1 for c in clusters
        if c.get("timing_suspicious", False)
    )

    # Strip full member dicts from response to keep payload size reasonable;
    # members are included (without cleanText) for the UI's click-to-verify panel
    for cluster in clusters:
        for m in cluster.get("members", []):
            m.pop("cleanText", None)

    elapsed = round(time.time() - t0, 2)
    logger.info(
        "Analysis done: %d clusters, %d dual-signal flagged, %.2fs",
        len(clusters), flagged_count, elapsed,
    )

    return {
        "docket_id": docket_id,
        "total_fetched": total_fetched,
        "total_analyzed": total_analyzed,
        "clusters": clusters,
        "flagged_count": flagged_count,
        "elapsed_seconds": elapsed,
        "threshold_used": threshold,
        "data_source": data_source,
    }
