"""
seed_cache.py — Pre-fetch and cache a real demo dataset from Regulations.gov.

Run this ONCE before the demo to ensure the app works offline / under poor
network conditions (per the spec's reliability plan).

Usage:
    cd backend
    python seed_cache.py

The script fetches comments for a known high-volume docket and writes them to
backend/data/<docket_id>.json. The Flask API will automatically use this cache
if the live API is unavailable during judging.

Chosen demo docket: EPA-HQ-OAR-2021-0317
  "Standards of Performance for New, Reconstructed, and Modified Sources and
   Emissions Guidelines for Existing Sources: Oil and Natural Gas Sector
   Climate Review"
  — attracted tens of thousands of comments including documented mass-comment
  campaigns from environmental advocacy groups, making it a reliable source of
  real coordinated-comment patterns for the demo.
"""

import os
import sys
import json
import logging

# Make sure we can import from the backend root
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

import config
from pipeline.fetch import fetch_comments, CACHE_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Demo dockets — ordered by preference
# Change DEMO_DOCKET_ID to switch which docket the frontend defaults to.
# ---------------------------------------------------------------------------
DEMO_DOCKETS = [
    {
        "id": "EPA-HQ-OAR-2021-0317",
        "description": "EPA Oil & Gas Methane Rule — documented mass-comment campaigns",
    },
    {
        "id": "CFPB-2023-0047",
        "description": "CFPB Medical Debt Credit Reporting Rule — high comment volume",
    },
]

DEMO_DOCKET_ID = DEMO_DOCKETS[0]["id"]
MAX_TO_CACHE = 250


def main():
    os.makedirs(CACHE_DIR, exist_ok=True)

    for docket in DEMO_DOCKETS:
        docket_id = docket["id"]
        cache_path = os.path.join(CACHE_DIR, f"{docket_id}.json")

        logger.info("Seeding cache for: %s (%s)", docket_id, docket["description"])
        try:
            comments = fetch_comments(docket_id, max_comments=MAX_TO_CACHE)
            logger.info("Cached %d comments → %s", len(comments), cache_path)
        except Exception as e:
            logger.error("Failed to seed %s: %s", docket_id, e)

    # Write a manifest so the frontend knows which docket is the default demo
    manifest_path = os.path.join(CACHE_DIR, "demo_manifest.json")
    manifest = {
        "default_docket_id": DEMO_DOCKET_ID,
        "dockets": DEMO_DOCKETS,
    }
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    logger.info("Demo manifest written → %s", manifest_path)


if __name__ == "__main__":
    main()
