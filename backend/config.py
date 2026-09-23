"""
Central configuration for RuleRadar backend.
All tunable constants live here so they're easy to find and document.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Regulations.gov API
# ---------------------------------------------------------------------------
REGULATIONS_API_KEY = os.getenv("REGULATIONS_GOV_API_KEY", "DEMO_KEY")
REGULATIONS_BASE_URL = "https://api.regulations.gov/v4"

# Max comments to fetch per docket (keeps demo snappy; raise for production)
MAX_COMMENTS_FETCH = 100

# ---------------------------------------------------------------------------
# Similarity / clustering thresholds
# (documented in README "What Didn't Work" — tested 0.70–0.95, settled on 0.82)
# ---------------------------------------------------------------------------

# TF-IDF cosine similarity threshold to consider two comments "similar"
SIMILARITY_THRESHOLD = 0.82

# Minimum cluster size to report (lone pairs are noise; require at least 3)
MIN_CLUSTER_SIZE = 3

# ---------------------------------------------------------------------------
# Timing-based coordination signal
# ---------------------------------------------------------------------------

# A cluster is "timing-suspicious" if the median gap between consecutive
# submissions within the cluster is below this value (seconds).
# 300s = 5 minutes — comments arriving faster than one per 5 min on average
# within a group is an unusually tight burst for organic independent writers.
TIMING_WINDOW_SECONDS = 300

# Minimum fraction of a cluster's members that must fall within a single
# TIMING_WINDOW_SECONDS burst to trigger the timing signal.
TIMING_BURST_FRACTION = 0.6

# ---------------------------------------------------------------------------
# Flask
# ---------------------------------------------------------------------------
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
