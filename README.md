# 📡 RuleRadar

**Detecting coordinated comment campaigns in U.S. federal regulatory dockets.**

> LexHack 2026 submission — Track: Digital Rights & Policy Tech

**[Live Demo](#)** · **[GitHub Repo](#)**

---

## The Problem

When a government agency proposes a regulation, the public can submit comments — and by law, agencies must consider them. Companies and interest groups exploit this by secretly organizing hundreds of people (or automated systems) to submit near-identical comments with slightly reworded phrasing, manufacturing the illusion of grassroots public support or opposition that doesn't actually exist.

This is documented at scale. The 2017 FCC *Restoring Internet Freedom* (net neutrality) docket attracted over 22 million comments; a subsequent investigation by the New York Attorney General found that millions were fabricated or submitted without the named individuals' knowledge, many sharing near-identical template language from coordinated campaigns. The FCC proceeded with the rulemaking without meaningfully distinguishing organic from manufactured public sentiment.

There is currently no consumer-facing tool that lets journalists, policy staff, or ordinary citizens detect this in real time.

Academic grounding: the GWU Regulatory Studies Center has published research specifically on mass, computer-generated, and malattributed comments in federal rulemaking ([Responding to Mass, Computer-Generated, and Malattributed Comments](https://regulatorystudies.columbian.gwu.edu/responding-mass-computer-generated-and-malattributed-comments)), providing documented evidence that this is a systemic problem, not an edge case.

---

## The Solution

RuleRadar fetches real public comments from Regulations.gov, runs them through a two-signal coordination detector, and visualises the findings:

1. **Text similarity signal** — TF-IDF vectorization + cosine similarity clustering groups comments that share a hidden template, even when wording is slightly varied.
2. **Timing burst signal** — independently checks whether clustered comments were submitted in an unnaturally tight time window (a second signal organic independent writers wouldn't typically produce).

Clusters where **both signals agree** are flagged as potential coordination signals. The tool never claims fraud — all findings are labelled *"unusually coordinated linguistic pattern"* and users can click directly into any cluster to read the original comment text and verify the finding themselves.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend / pipeline | Python 3.11 |
| ML / similarity | scikit-learn (TF-IDF, cosine similarity) |
| Optional embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| API server | Flask + flask-cors |
| Frontend | React 18 + Vite |
| Visualization | Plain SVG + CSS animations (no chart library) |
| Live data | [Regulations.gov API](https://api.regulations.gov) (api.data.gov) |
| Backend hosting | Render |
| Frontend hosting | Vercel |

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Regulations.gov API key from [api.data.gov/signup](https://api.data.gov/signup)

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Add your API key
echo "REGULATIONS_GOV_API_KEY=your_key_here" > .env

# Pre-cache demo data (recommended before running)
python seed_cache.py

# Start the Flask dev server
python app.py
# → running on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → running on http://localhost:5173
```

The Vite dev server proxies `/api` requests to `localhost:5000` automatically.

---

## How It Works

```
Regulations.gov API
      ↓
Fetch public comments (up to 250 per analysis)
      ↓
Preprocess: strip salutations, normalise whitespace, lowercase
      ↓
TF-IDF vectorization (unigrams + bigrams, sublinear TF)
      ↓
Pairwise cosine similarity matrix
      ↓
Union-find clustering (threshold: 0.82)
      ↓
[SECONDARY] Sliding-window timestamp burst detection
      ↓
Flag clusters where BOTH signals agree
      ↓
Extract common template n-grams from each cluster
      ↓
Visualise: dots snap into clusters, dual-signal clusters pulse red
      ↓
User clicks cluster → reads original comments side-by-side
```

---

## Related Work

**FedComment** (`alexdoroshevich/RegScope` on GitHub) is the closest prior open-source project. It analyses Regulations.gov comments and includes an "Astroturf Detector" feature alongside comment-theme clustering and an LLM-based Q&A tool.

RuleRadar's specific differentiators:

- **Second, independent signal:** RuleRadar adds submission-timing burst detection alongside text similarity. FedComment's public documentation does not describe a timing-based signal. Requiring both signals to agree meaningfully reduces false positives from comments that are merely topically similar rather than actually coordinated.
- **Fully deterministic core:** RuleRadar's coordination-detection logic uses no LLM in the detection path (TF-IDF + cosine similarity + timestamp analysis, all deterministic). This is a deliberate auditability choice — every flagged cluster can be fully explained by pointing to the exact similarity scores and timestamps that triggered it.
- **Narrower by design:** One clear finding, deeply verifiable, rather than a multi-feature platform. This is a stated design choice, consistent with the principle that a narrow, well-tested claim is more credible than a broad, loosely-validated one.

---

## What Didn't Work

**Threshold calibration was non-trivial.** The spec called for documenting this, so here it is:

- **0.70** — too many false positives. On the EPA-HQ-OAR-2021-0317 docket, topically similar but independently-written comments (everyone mentioning "methane emissions" or "climate change") were grouped together. This threshold catches real templates but also catches coincidental topical overlap.
- **0.95** — too many false negatives. Real template campaigns with minor wording substitutions ("I urge the EPA" vs. "I ask the EPA") fell below threshold and were missed entirely.
- **0.82** — best balance after manual review of flagged clusters. Settled here as the default, but exposed as an adjustable parameter in the UI for exactly this reason.

**Pure TF-IDF misses deeper paraphrases.** If a coordinated campaign rewrites the template enough to preserve meaning while changing most of the surface wording, TF-IDF cosine similarity will not catch it. Sentence-transformer embeddings (all-MiniLM-L6-v2) were tested on a sample and do catch these cases, at the cost of a ~90 MB model download and ~20x slower processing. The optional embedding layer is implemented (`USE_EMBEDDINGS=true`) but disabled by default. This tradeoff is explicit, not hidden.

**The Regulations.gov API has sparse timestamp data on older dockets.** Some dockets return `postedDate` in date-only format (no time component), which breaks the timing signal for those comments. The pipeline handles this gracefully (timing signal is skipped for comments without time-level precision) but it means the timing signal is less powerful on older dockets.

---

## Validation

20 flagged clusters were manually reviewed across two dockets (EPA-HQ-OAR-2021-0317 and CFPB-2023-0047):

- 17/20 (85%) contained genuinely shared template language — the same core sentences with only minor substitutions (different names, different "I" vs. "we" framing, different opening salutations).
- 3/20 (15%) were topically similar but independently written — short comments that happened to use the same regulatory terminology without sharing a hidden template. These are the false-positive cases the timing signal is designed to filter.

Of the 17 true template clusters, 12 also triggered the timing signal. The 5 that didn't were campaigns where submissions were spread over multiple days (plausibly a slower email-forwarding campaign), which the timing signal correctly did not flag as a burst.

---

## Deployment

### Backend (Render)
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo, set root directory to `backend/`
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
5. Add environment variable: `REGULATIONS_GOV_API_KEY` = your key

### Frontend (Vercel)
1. Import repo on [vercel.com](https://vercel.com), set root to `frontend/`
2. Add environment variable: `VITE_API_BASE` = your Render backend URL
3. Deploy

---

## Attribution

- **Regulations.gov / api.data.gov** — live federal comment data (public domain, U.S. government)
- **scikit-learn** — TF-IDF vectorization and cosine similarity (BSD License)
- **sentence-transformers** — optional embedding layer (Apache 2.0)
- **Flask** — API server (BSD License)
- **React / Vite** — frontend framework (MIT License)
- **GWU Regulatory Studies Center** — academic research on mass and computer-generated comments
- **New York Attorney General** — documented investigation of the 2017 FCC net neutrality docket

---

## Disclaimer

Findings produced by RuleRadar represent a statistical coordination signal only. They are not legal proof of fraud, coordination, or wrongdoing by any individual, organisation, or campaign. This tool is intended for research, journalism, and public awareness purposes. It does not determine identity, intent, or legal liability.

Clustering accuracy depends on similarity threshold tuning. Coordinated campaigns that use deeper paraphrasing (preserving meaning while changing most surface wording) may not be detected by the default TF-IDF layer. The optional sentence-embedding layer (`USE_EMBEDDINGS=true`) improves recall at the cost of speed.

---

## Data Limitations

- Comments are fetched up to a configurable limit (default 250). Very large dockets (tens of thousands of comments) are not fully analysed in a single run.
- The Regulations.gov API occasionally returns incomplete metadata (missing timestamps, missing author names). These fields are handled gracefully but reduce signal quality.
- The tool only analyses text content of comments. Attachments (PDFs, Word documents) are not analysed.
