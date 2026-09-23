# RuleRadar — Full Project Specification
**For: LexHack 2026 Hackathon Submission**
**Purpose of this document:** Complete context for an AI coding assistant (Kiro) to understand the hackathon requirements, the project concept, the technical architecture, and the implementation plan, and begin building.

---

## 1. Hackathon Context

**Name:** LexHack 2026 — AI + Law Student Hackathon
**Format:** Online, virtual
**Tagline:** Empowering global student builders to pioneer AI solutions for legal tech, automated law, and AI safety.
**Deadline:** Sep 28, 2026 @ 2:30am GMT+5:30
**Team size:** Individually or up to 4 students
**Hosted on:** Devpost (lexhack-2026.devpost.com)

**Official Tracks:**
- Access to Justice & Civic Tech
- AI Safety, Ethics & Governance
- Legal Automation & Workflow Innovation
- Digital Rights & Policy Tech
- Open Innovation (AI x Law)

**What the hackathon actually wants (in one line):**
Simple, working tech that uses real data to solve one genuine problem in law, AI safety, or civic life — not just an idea, an actual demo-able tool a real person could use.

**Submission Requirements:**
- Project Name & Short Summary
- Problem & Solution explanation
- Working Link or Code Repository (public GitHub repo)
- Demo Video & Screenshots (2–3 minutes)
- Tech Stack list (technologies, APIs, LLMs, or low-code platforms used)
- Clear attribution for any third-party datasets, libraries, or APIs used
- All work must be created substantially during the Build Period

**Judging Criteria (Weighted):**
| Criterion | Weight | What it evaluates |
|---|---|---|
| Real-World Impact & Feasibility | 25% | Does this meaningfully address a genuine legal/civic/AI-governance challenge? Realistic, deployable? |
| Technical Execution & Functionality | 25% | Is the prototype functional, well-structured, executes core workflows, integrates tech/APIs effectively? |
| User Experience & Design | 20% | Is it intuitive, clear, accessible to non-lawyers/non-technical users? |
| Innovation & Originality | 15% | Creative, novel approach? Pushes boundaries of applied AI? |
| Presentation & Documentation | 15% | Clear 2-3 min video demo; write-up states problem, solution, tech stack, declares AI tools used |

---

## 2. Project Concept: RuleRadar

**One-line pitch:**
RuleRadar detects coordinated, templated public comments submitted to U.S. federal regulatory dockets — exposing when a "grassroots" wave of public opinion on a proposed law is actually a disguised corporate/organized campaign.

**The Problem (Plain Language):**
When a government agency proposes a new regulation, the public can submit comments, and by law, agencies must consider public input. Companies and interest groups have learned to exploit this by secretly organizing hundreds of people (or fake accounts) to submit near-identical comments with slightly reworded phrasing — creating the illusion of massive genuine public support or opposition that doesn't actually exist. This corrupts the democratic rulemaking process, and there is currently no consumer-facing tool that lets journalists, policy staff, or ordinary citizens catch this in real time.

**Why This Idea (Selection Rationale):**
This idea was chosen after multiple rounds of adversarial evaluation:
- Independently rated a "standout" demo concept for visual memorability (vs. "document turns red" style projects, which was flagged as an oversaturated, forgettable pattern in this hackathon's likely submission pool)
- The core technique (comment de-duplication/similarity clustering) is grounded in real academic and regulatory-agency research, not invented from scratch — see Related Work below
- Passes the "remove the AI, does the engineering still work" test — the core mechanism is deterministic math (TF-IDF + cosine similarity clustering), not an LLM wrapper
- Uses real, live, free government data — not a simulation or mock dataset
- Fits the "Digital Rights & Policy Tech" track directly, and touches "Access to Justice & Civic Tech" and "AI Safety, Ethics & Governance" as secondary relevance

**Related Work (include this in the README — get ahead of it, don't let a judge discover it):**
A comparable open-source project exists: **FedComment** (GitHub: `alexdoroshevich/RegScope`), which analyzes Regulations.gov comments and includes an "Astroturf Detector" feature, alongside comment-theme clustering, a citation graph, and an LLM-based (GPT-4o-mini) Q&A tool. RuleRadar's specific differentiation, stated plainly in the README:
- RuleRadar adds a **second, independent signal** — submission-timing clustering — alongside text similarity. FedComment's public documentation does not describe a timing-based signal; requiring both signals to agree meaningfully reduces false positives from comments that are merely topically similar rather than actually coordinated.
- RuleRadar's **core coordination-detection logic is fully deterministic** (TF-IDF/embeddings + cosine similarity + timing), with no LLM in the detection path itself — unlike FedComment's broader toolset, which leans on an LLM for its Q&A feature. This is a deliberate trust/auditability choice worth stating explicitly.
- RuleRadar is narrower by design: one clear finding, deeply verifiable, rather than a multi-feature platform — this is a stated design choice, not a limitation, consistent with the "one problem, one mechanism" principle this project was built around.

**Academic grounding (cite in the Problem section, not just asserted):**
- George Washington University's Regulatory Studies Center has published research on mass, computer-generated, and fraudulent comments in federal rulemaking, providing academic grounding for the real-world scale of this problem — cite this directly rather than just asserting "companies do this."
- The 2017 FCC Restoring Internet Freedom (net neutrality) docket is the most publicly documented real-world case: post-hoc analysis found millions of submitted comments included large batches of duplicated or fabricated submissions. Reference this by name in the Problem section as a concrete, judge-recognizable precedent — it moves the pitch from an abstract claim to a grounded, real event.
- Text-reuse/n-gram matching research (matching comments to lobbying coalitions via shared multi-word phrases) supports the core technique as methodologically sound, not improvised.

**What Was Explicitly Ruled Out and Why:**
- Ideas built on the "extract → normalize → build a dependency/rule graph → flag conflict" pattern (contract contradiction detectors, deadline conflict detectors, form-mismatch detectors) were deprioritized: multiple independent evaluations flagged this as a likely-oversaturated architecture pattern across many hackathon submissions this cycle, and several risk becoming visually indistinguishable "document with a red highlight" demos by the time a judge has seen several similar projects.
- A wage-theft/paycheck-audit idea was researched and dropped: a near-identical live consumer app ("OverPay: Overtime & Pay Audit") already exists on the App Store, which would undermine the Innovation & Originality score.
- An AI-denial counterfactual-explanation tool was considered strong but requires demoing against a mock/self-built decision model rather than real live data, which was deprioritized in favor of RuleRadar's fully real, live data pipeline.

---

## 3. Technical Architecture & Pipeline

**High-level flow:**
```
Real government docket (Regulations.gov)
        ↓
Fetch public comments via API
        ↓
Clean / normalize text
        ↓
Vectorize text (TF-IDF)
        ↓
Compute pairwise similarity (cosine similarity)
        ↓
Cluster comments above a similarity threshold
        ↓
[SECONDARY SIGNAL] Check submission-timestamp clustering
                    (unnaturally tight submission windows)
        ↓
Flag clusters where BOTH signals agree
        ↓
Extract the common "template" language from each cluster
        ↓
Visualize: individual comment nodes "snap together"
           into one exposed cluster
        ↓
User can click into a cluster to read the original comments
           and verify the finding themselves
```

**Step-by-step detail:**

1. **Data ingestion:** Query the Regulations.gov API for a real, currently-open (or recently closed) rulemaking docket with a meaningful number of public comments.
2. **Preprocessing:** Strip boilerplate/salutations, normalize whitespace and punctuation, lowercase for comparison (while preserving original text for display).
3. **Vectorization:** Convert each comment into a TF-IDF vector using scikit-learn.
4. **Similarity computation:** Compute pairwise cosine similarity across all comment vectors.
5. **Clustering:** Group comments whose similarity exceeds a tuned threshold (document your threshold-testing process — e.g., "tested 0.70–0.95, settled on 0.85 to balance false positives vs. real matches" — this should be shown in the README, not hidden).
6. **Secondary signal (adds real technical depth beyond a single metric):** Analyze submission timestamps within each candidate cluster — comments submitted in an unnaturally tight time window are a second, independent signal of coordination. Flag clusters where both the text-similarity signal AND the timing signal agree; this is meaningfully more convincing than similarity alone.
7. **Template extraction:** For confirmed clusters, extract and display the common underlying phrasing that all cluster members share.
8. **Output/labeling:** Present findings conservatively — as **"unusually coordinated linguistic pattern" / "potential coordination signal — not proof of coordination"** — never claim definitive fraud. This is an intentional, judge-tested wording choice to avoid overclaiming.

**Optional upgrade — hybrid similarity detection (do this if time allows; document the tradeoff even if you don't fully build it):**
Pure TF-IDF cosine similarity reliably catches near-identical or lightly reworded comments, but the paraphrase-detection research literature is consistent that it misses deeper paraphrases — comments reworded enough to preserve meaning while changing most of the wording, which is exactly the evasion tactic a more sophisticated coordinated campaign would use once simple duplication starts getting caught.

| Layer | Method | Catches |
|---|---|---|
| Primary (fast, cheap, interpretable) | TF-IDF + cosine similarity | Near-identical / lightly reworded template comments |
| Secondary (optional, if time allows) | Sentence embeddings (e.g., `sentence-transformers` MiniLM) + cosine similarity | Deeper paraphrases that preserve meaning but change most wording |

Even if you don't fully implement the embedding layer, **document in the README that you tested TF-IDF against a small embedding-based comparison and explain the tradeoff** (speed/interpretability vs. paraphrase recall). This demonstrates you understand the method's actual failure mode, not just that you picked a reasonable default — a stronger, more specific version of the "remove the AI, does it still work" test.

---

## 4. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend / data processing | **Python** | Core logic, API calls, clustering pipeline |
| ML / similarity engine | **scikit-learn** | TF-IDF vectorization, cosine similarity, clustering |
| API server | **Flask** | Connects Python backend to the frontend |
| Frontend | **React** (or plain HTML/CSS/JS if time-constrained) | User interface, the "snap together" visualization |
| Live data source | **Regulations.gov API** (api.data.gov) | Real, free, public government comment data |
| Hosting | **Vercel** (frontend) / suitable free backend host | Public live demo link |
| Version control | **GitHub** | Public source repository (submission requirement) |

**API Notes:**
- Sign up for a **real Regulations.gov API key** via api.data.gov immediately — do NOT build the demo around the shared `DEMO_KEY`, which has a very low shared rate limit (as low as 10–30 requests/hour shared across all users) and will likely be exhausted before or during judging.
- A real, personal key gives approximately 1,000 requests/hour — sufficient for a live demo.
- Pre-cache a small, curated dataset from a real docket as a backup, in case of live connectivity issues during judging (see Section 6, Contingency Plan).

---

## 5. User Experience / Demo Design

**The core visual moment ("the wow"):**
Individual comment "dots" on screen, representing distinct public comments, animate and **visually collapse/snap together** into a single node when the clustering algorithm identifies them as sharing a hidden template. This should feel like watching a magic trick being exposed, not like reading a spreadsheet.

**Interaction requirements:**
- User can click into any cluster to read the actual original comment text side-by-side, so they can verify the finding themselves rather than just trusting a label.
- The common "template" sentence(s) shared across a cluster should be visibly highlighted/extracted, not just implied.
- Keep the interface calm and focused — one clear visual per screen, minimal clutter.

**Recommended demo opening ("Puppet Master" technique):**
Do not open the demo video inside your own application. Start the screen recording on the **actual, live Regulations.gov website**, scrolling through a few real comments and narrating the stakes ("Look at these concerned citizens..."). Then switch to your tool, paste in the real docket, and run the analysis — so the "reveal" feels like uncovering something real, not just demonstrating a software feature.

---

## 6. Reliability & Contingency Plan

- **Never depend solely on a live API call during the actual judging demo.** Pre-fetch and cache a real dataset from a genuine docket in advance; use this cached dataset as the default demo data source, with a live API call as a secondary "look, it also works live" moment if time/connectivity allows.
- **Test with network conditions simulated as poor/offline** before the actual demo, to confirm the app degrades gracefully rather than breaking.
- **Prepare for the "how do you know they're fake?" judge question** — the answer should reference both signals (text similarity + timing clustering) and the conservative "coordination signal, not proof" framing, not an overclaimed certainty.
- **Do not attempt to demo on an arbitrary docket chosen live/on the spot** — always use the pre-tested, pre-verified docket and dataset.

---

## 7. README / Documentation Requirements

The README must include:
- Project purpose and one-line pitch
- Live demo link and GitHub repo link
- Problem & Solution explanation (plain language)
- Full technology stack list
- **Attribution section**, explicitly crediting:
  - Regulations.gov / api.data.gov (data source)
  - scikit-learn (open-source library)
  - Any other libraries/frameworks used
- Installation / local development instructions
- **A "What Didn't Work" section** — document real engineering friction: failed similarity thresholds tried, edge cases that broke early versions, any pivots made. This is a deliberate choice to demonstrate genuine engineering depth to judges, not a formality.
- **A "Related Work" section** — name FedComment (`alexdoroshevich/RegScope` on GitHub) and the GWU Regulatory Studies Center research directly, with the specific one-sentence differentiation for each (see Section 2 above). Proactively addressing "hasn't this been done before?" in writing is stronger than hoping a judge doesn't ask.
- **A "Validation" section** — even a small manual accuracy check adds real credibility: e.g., "we manually reviewed 20 flagged clusters and confirmed X% contained genuinely shared template language." This gives judges a concrete accuracy signal instead of just trusting the pipeline's output, and costs only a few hours of manual review relative to the credibility it buys.
- A clear disclaimer: findings represent a statistical coordination signal, not legal proof of fraud or a determination of wrongdoing by any individual or organization.
- Data limitations section (e.g., clustering accuracy depends on threshold tuning; disguised paraphrasing beyond a certain point may not be caught without the optional embedding layer).

---

## 8. Risk Register (Replaces Self-Graded Scoring)

Rather than assigning speculative scores against the rubric before any code is written, this section lists the single biggest risk under each judging criterion and how it's being mitigated. This is a more honest and more persuasive framing — it reads as engineering foresight, not score prediction, and holds up better if a judge reads this document directly.

| Criterion | Weight | Biggest risk | Mitigation |
|---|---|---|---|
| Real-World Impact & Feasibility | 25% | The pitch reads as abstract ("companies sometimes do this") rather than grounded in a real, recognizable event | Cite the 2017 FCC net-neutrality docket by name in the Problem section; name concrete intended users (journalists, policy staff, watchdog orgs) |
| Technical Execution & Functionality | 25% | Live API fails or rate-limits during judging; pure TF-IDF misses paraphrased coordination | Cached dataset is the default demo source, live call is a secondary flourish (Section 6); document the TF-IDF vs. embedding tradeoff even if the embedding layer isn't fully built (Section 3) |
| User Experience & Design | 20% | The "snap together" animation feels janky or the interface feels cluttered under time pressure | Prioritize building and polishing this specific animation early in the build order (Section 9, step 6), before secondary features |
| Innovation & Originality | 15% | A judge discovers FedComment (a real, similar existing project) during Q&A and the team looks unaware of it | Name FedComment directly in the README's Related Work section with the specific timing-signal and deterministic-detection differentiation, before any judge has to ask (Section 2, Section 7) |
| Presentation & Documentation | 15% | The write-up reads as a feature list rather than demonstrating real engineering judgment | Include "What Didn't Work" and "Validation" sections with specific, concrete details (failed thresholds, manual spot-check results), not generic statements |

**Important honest caveat:** This is a planning tool to build toward, not a score prediction. Actual results depend on execution quality, live demo performance on the day, and factors outside this document's control (competing submissions, individual judge preferences).

---

## 9. Build Priority Order (for a ~10-day sprint)

1. Get a real Regulations.gov API key and confirm a working test query against a real docket
2. Build the core Python pipeline: fetch → clean → TF-IDF → cosine similarity → cluster (get this working end-to-end with a small dataset first)
3. Pre-cache a real, demo-ready dataset from a genuine docket as the reliable fallback
4. Add the secondary timing-based coordination signal
5. Build the Flask API layer connecting the pipeline to a frontend
6. Build the frontend visualization — prioritize the "snap together" animation early since it's the core wow-moment
7. Add click-to-verify (view original comments within a cluster)
7.5. Manually review a sample of flagged clusters (e.g., 20) and record accuracy for the README's Validation section
8. Write the README fully, including the "What Didn't Work," "Related Work," and "Validation" sections (update these throughout the build, not just at the end)
9. Script, rehearse, and record the 2–3 minute demo video using the "Puppet Master" opening
10. Final testing pass: simulate poor network conditions, confirm graceful fallback to cached data, do a full clean run-through before submission

---

## 10. Key Disclaimers to Bake Into the Product (Not Just the README)

- Use "unusually coordinated linguistic pattern" or "potential coordination signal" in all UI labels — never "fraud," "fake," or "proof."
- Clearly state the tool identifies textual/temporal coordination patterns; it does not determine legal wrongdoing, identity, or intent.
- Make clear this is a research/awareness tool, not a formal investigative or legal instrument.

---

*End of specification. This document consolidates all planning, research, and design decisions made prior to build start.*
