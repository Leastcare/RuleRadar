"""
fetch.py — Pull public comments from the Regulations.gov v4 API.

The Regulations.gov API is a two-step process:
  1. GET /comments?filter[docketId]=X  → list of comment IDs + metadata (no text)
  2. GET /comments/{id}                 → full comment detail including the text

This module handles both steps and caches the result locally.
"""

import json
import os
import time
import logging
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_comments(docket_id: str, max_comments: int = config.MAX_COMMENTS_FETCH) -> list[dict]:
    """
    Fetch up to `max_comments` comments for `docket_id`.

    Returns a list of dicts, each with:
        id, text, submittedAt (ISO-8601 string), authorName, organization
    """
    cache_path = os.path.join(CACHE_DIR, f"{docket_id}.json")

    # Use cache if it exists and has content
    if os.path.exists(cache_path):
        cached = _load_cache(docket_id, cache_path)
        if len(cached) > 0:
            logger.info("Using cached data (%d comments) for %s", len(cached), docket_id)
            return cached[:max_comments]

    if config.REGULATIONS_API_KEY == "DEMO_KEY":
        logger.warning(
            "Using DEMO_KEY — rate limits apply. Set REGULATIONS_GOV_API_KEY "
            "in your .env file."
        )

    try:
        comments = _fetch_from_api(docket_id, max_comments)
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(comments, f, indent=2)
        return comments
    except Exception as exc:
        logger.warning("API fetch failed (%s); falling back to cache.", exc)
        return _load_cache(docket_id, cache_path)


def fetch_dockets(search_term: str = "", page_size: int = 10) -> list[dict]:
    """Search for dockets on Regulations.gov."""
    url = f"{config.REGULATIONS_BASE_URL}/dockets"
    params = {
        "api_key": config.REGULATIONS_API_KEY,
        "filter[searchTerm]": search_term,
        "page[size]": page_size,
        "sort": "-lastModifiedDate",
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    results = []
    for item in data.get("data", []):
        attrs = item.get("attributes", {})
        results.append({
            "id": item.get("id"),
            "title": attrs.get("title", ""),
            "agencyId": attrs.get("agencyId", ""),
            "commentCount": attrs.get("numberOfCommentsReceived", 0),
        })
    return results


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _fetch_from_api(docket_id: str, max_comments: int) -> list[dict]:
    """
    Two-step fetch:
      Step 1 — page through the comment listing to collect IDs
      Step 2 — fetch each comment's detail page to get the actual text
    """
    # Step 1: collect comment IDs from the listing endpoint
    comment_ids = []
    page_num = 1
    page_size = 25  # API maximum

    logger.info("Step 1: collecting comment IDs for %s ...", docket_id)
    while len(comment_ids) < max_comments:
        url = f"{config.REGULATIONS_BASE_URL}/comments"
        params = {
            "api_key": config.REGULATIONS_API_KEY,
            "filter[docketId]": docket_id,
            "page[size]": page_size,
            "page[number]": page_num,
            "sort": "postedDate",
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        page_items = data.get("data", [])
        if not page_items:
            break

        for item in page_items:
            comment_ids.append({
                "id": item.get("id"),
                "postedDate": item.get("attributes", {}).get("postedDate", ""),
            })
            if len(comment_ids) >= max_comments:
                break

        time.sleep(0.25)  # stay well under 1000 req/hr

        total_pages = data.get("meta", {}).get("totalPages", 1)
        if page_num >= total_pages:
            break
        page_num += 1

    logger.info("Step 1 done: %d IDs collected. Starting detail fetch...", len(comment_ids))

    # Step 2: fetch full detail for each comment using a thread pool
    # 8 workers × 0.15s sleep ≈ ~50 req/s, well within 1000 req/hr limit
    def _fetch_detail(item):
        comment_id = item["id"]
        try:
            detail_url = f"{config.REGULATIONS_BASE_URL}/comments/{comment_id}"
            detail_resp = requests.get(
                detail_url,
                params={"api_key": config.REGULATIONS_API_KEY},
                timeout=15,
            )
            detail_resp.raise_for_status()
            attrs = detail_resp.json().get("data", {}).get("attributes", {})
            text = attrs.get("comment", "") or ""
            if not text.strip():
                return None  # attachment-only comment, skip
            return {
                "id": comment_id,
                "text": text,
                "submittedAt": attrs.get("postedDate", item.get("postedDate", "")),
                "authorName": (
                    (attrs.get("firstName") or "") + " " +
                    (attrs.get("lastName") or "")
                ).strip(),
                "organization": attrs.get("organization", "") or "",
            }
        except Exception as e:
            logger.warning("Failed to fetch detail for %s: %s", comment_id, e)
            return None

    comments = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(_fetch_detail, item): item for item in comment_ids}
        done = 0
        for future in as_completed(futures):
            result = future.result()
            if result:
                comments.append(result)
            done += 1
            if done % 25 == 0:
                logger.info("  Detail fetch progress: %d/%d", done, len(comment_ids))

    logger.info(
        "Fetch complete: %d comments with text out of %d IDs for docket %s",
        len(comments), len(comment_ids), docket_id,
    )
    return comments


def _load_cache(docket_id: str, cache_path: str) -> list[dict]:
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            logger.info("Loaded %d cached comments for %s", len(data), docket_id)
            return data
    raise FileNotFoundError(
        f"No cached data found for docket '{docket_id}'. "
        "Run backend/seed_cache.py to pre-fetch demo data."
    )
