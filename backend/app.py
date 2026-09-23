"""
app.py — RuleRadar Flask API

Endpoints:
  POST /api/analyze        { docket_id, max_comments?, threshold? }
  GET  /api/dockets        ?search=<term>&page_size=<n>
  GET  /api/health
"""

import logging
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from pipeline.analyze import run_analysis
from pipeline.fetch import fetch_dockets
import config

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Allow requests from the React dev server and production Vercel URL
CORS(app, origins=[
    config.FRONTEND_ORIGIN,
    "https://ruleradar.vercel.app",
    "https://*.vercel.app",
])


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "RuleRadar API"})


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Body (JSON):
        docket_id     string  required
        max_comments  int     optional (default from config)
        threshold     float   optional (default from config)
    """
    body = request.get_json(silent=True) or {}
    docket_id = (body.get("docket_id") or "").strip()

    if not docket_id:
        return jsonify({"error": "docket_id is required"}), 400

    # Sanitise numeric inputs
    try:
        max_comments = int(body.get("max_comments", config.MAX_COMMENTS_FETCH))
        max_comments = max(10, min(max_comments, 500))  # clamp 10–500
    except (TypeError, ValueError):
        max_comments = config.MAX_COMMENTS_FETCH

    try:
        threshold = float(body.get("threshold", config.SIMILARITY_THRESHOLD))
        threshold = max(0.5, min(threshold, 0.99))  # clamp to sensible range
    except (TypeError, ValueError):
        threshold = config.SIMILARITY_THRESHOLD

    logger.info(
        "Analyze request: docket=%s max_comments=%d threshold=%.2f",
        docket_id, max_comments, threshold,
    )

    try:
        result = run_analysis(docket_id, max_comments=max_comments, threshold=threshold)
        return jsonify(result)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.exception("Analysis failed for docket %s", docket_id)
        return jsonify({"error": "Analysis failed. See server logs for details."}), 500


@app.route("/api/demo_manifest", methods=["GET"])
def demo_manifest():
    """Return the pre-cached demo manifest (default docket ID + available dockets)."""
    import json
    manifest_path = os.path.join(
        os.path.dirname(__file__), "data", "demo_manifest.json"
    )
    if not os.path.exists(manifest_path):
        return jsonify({
            "default_docket_id": "EPA-HQ-OAR-2021-0317",
            "dockets": [
                {"id": "EPA-HQ-OAR-2021-0317", "description": "EPA Oil & Gas Methane Rule"},
                {"id": "CFPB-2023-0047", "description": "CFPB Medical Debt Credit Reporting Rule"},
            ],
        })
    with open(manifest_path, "r", encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/api/dockets", methods=["GET"])
def dockets():
    """
    Query params:
        search     string  optional
        page_size  int     optional (default 10)
    """
    search = request.args.get("search", "").strip()
    try:
        page_size = int(request.args.get("page_size", 10))
        page_size = max(1, min(page_size, 25))
    except (TypeError, ValueError):
        page_size = 10

    try:
        results = fetch_dockets(search_term=search, page_size=page_size)
        return jsonify({"dockets": results})
    except Exception as e:
        logger.exception("Docket search failed")
        return jsonify({"error": "Could not fetch dockets from Regulations.gov."}), 502


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=config.FLASK_DEBUG)
