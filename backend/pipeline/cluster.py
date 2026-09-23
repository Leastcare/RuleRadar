"""
cluster.py — Group similar comments into coordination clusters.

Algorithm:
  Simple union-find (disjoint set) on pairs whose similarity >= threshold.
  Chosen over k-means / DBSCAN because:
    - No need to specify k in advance
    - Deterministic (same input → same output, every time)
    - Directly interpretable: every edge is an above-threshold pair
    - O(N²) in the similarity matrix, which we already computed

After clustering, extract the "template" — the longest common n-gram
subsequences shared by all cluster members.
"""

import logging
import re
from collections import Counter

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def find_clusters(
    comments: list[dict],
    similarity_matrix,
    threshold: float = config.SIMILARITY_THRESHOLD,
    min_size: int = config.MIN_CLUSTER_SIZE,
) -> list[dict]:
    """
    Return a list of cluster dicts, each containing:
        cluster_id      int
        member_ids      list of comment IDs in this cluster
        members         list of full comment dicts
        template        str  — common phrasing extracted from the cluster
        avg_similarity  float
        size            int
    """
    n = len(comments)
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    # Build edges above threshold (exclude self-similarity on diagonal)
    for i in range(n):
        for j in range(i + 1, n):
            if similarity_matrix[i][j] >= threshold:
                union(i, j)

    # Group indices by root
    groups: dict[int, list[int]] = {}
    for i in range(n):
        root = find(i)
        groups.setdefault(root, []).append(i)

    clusters = []
    cluster_id = 0
    for indices in groups.values():
        if len(indices) < min_size:
            continue

        members = [comments[i] for i in indices]

        # Average pairwise similarity within cluster
        pairs = [
            similarity_matrix[i][j]
            for ii, i in enumerate(indices)
            for j in indices[ii + 1:]
        ]
        avg_sim = float(sum(pairs) / len(pairs)) if pairs else 1.0

        template = _extract_template([c["cleanText"] for c in members])

        clusters.append({
            "cluster_id": cluster_id,
            "size": len(members),
            "member_ids": [c["id"] for c in members],
            "members": members,
            "template": template,
            "avg_similarity": round(avg_sim, 4),
        })
        cluster_id += 1

    # Sort largest clusters first
    clusters.sort(key=lambda c: c["size"], reverse=True)
    logger.info(
        "Clustering complete: %d clusters found (threshold=%.2f, min_size=%d)",
        len(clusters), threshold, min_size,
    )
    return clusters


# ---------------------------------------------------------------------------
# Template extraction
# ---------------------------------------------------------------------------

def _extract_template(texts: list[str], min_ngram: int = 5) -> str:
    """
    Find the most common n-gram phrases (n >= min_ngram words) shared
    across the cluster — this surfaces the 'template' sentence(s).

    Returns a human-readable string of the top shared phrases.
    """
    # Tokenize each text into word lists
    word_lists = [re.findall(r"[a-z0-9']+", t) for t in texts]

    # Count all n-grams of length min_ngram..10 across all texts
    ngram_counts: Counter = Counter()
    for words in word_lists:
        seen = set()
        for n in range(min_ngram, min(11, len(words) + 1)):
            for i in range(len(words) - n + 1):
                gram = tuple(words[i: i + n])
                if gram not in seen:
                    ngram_counts[gram] += 1
                    seen.add(gram)

    if not ngram_counts:
        return ""

    # Keep only n-grams that appear in at least half the cluster members
    threshold = max(2, len(texts) // 2)
    frequent = [
        (gram, count)
        for gram, count in ngram_counts.items()
        if count >= threshold
    ]

    if not frequent:
        return ""

    # Sort by length (longer = more specific template language) then frequency
    frequent.sort(key=lambda x: (len(x[0]), x[1]), reverse=True)

    # Greedily pick non-overlapping top phrases
    selected = []
    used_words: set = set()
    for gram, _ in frequent[:30]:
        gram_set = set(gram)
        if not gram_set & used_words:
            selected.append(" ".join(gram))
            used_words |= gram_set
        if len(selected) >= 3:
            break

    return " … ".join(selected) if selected else ""
