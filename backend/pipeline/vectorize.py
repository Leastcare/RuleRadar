"""
vectorize.py — Convert cleaned comment text into TF-IDF vectors and compute
               pairwise cosine similarity.

Design notes (documented for README "What Didn't Work" section):
- TF-IDF is the primary layer: fast, interpretable, no model download required,
  reliable for near-identical / lightly-reworded template comments.
- Sentence-transformer embeddings are the optional secondary layer: catches
  deeper paraphrases but requires ~90 MB model download and is ~20x slower.
  Enabled only when USE_EMBEDDINGS=true in environment or explicitly requested.
- Threshold testing: tried 0.70 (too many false positives on topically-similar
  but independent comments), 0.95 (missed real templates with minor edits),
  settled on 0.82 as the best balance on test dockets.
"""

import os
import logging
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config

logger = logging.getLogger(__name__)

USE_EMBEDDINGS = os.getenv("USE_EMBEDDINGS", "false").lower() == "true"


def build_similarity_matrix(comments: list[dict]) -> np.ndarray:
    """
    Given preprocessed comments (with 'cleanText' field),
    return an (N x N) float32 cosine-similarity matrix.

    Uses TF-IDF by default; sentence-transformers if USE_EMBEDDINGS=true.
    """
    texts = [c["cleanText"] for c in comments]

    if USE_EMBEDDINGS:
        return _embedding_similarity(texts)
    return _tfidf_similarity(texts)


def _tfidf_similarity(texts: list[str]) -> np.ndarray:
    """TF-IDF + cosine similarity (primary layer)."""
    vectorizer = TfidfVectorizer(
        min_df=1,
        max_df=0.95,       # ignore terms in >95% of docs (pure stopwords)
        ngram_range=(1, 2), # unigrams + bigrams — catches phrase reuse
        sublinear_tf=True,  # log normalization reduces impact of long comments
    )
    matrix = vectorizer.fit_transform(texts)
    sim = cosine_similarity(matrix, dense_output=False)
    logger.info("TF-IDF similarity matrix built: %dx%d", sim.shape[0], sim.shape[1])
    return sim.toarray().astype(np.float32)


def _embedding_similarity(texts: list[str]) -> np.ndarray:
    """
    Sentence-transformer embedding similarity (optional secondary layer).
    Model: all-MiniLM-L6-v2 (~22 MB, strong sentence-level semantics).
    Falls back to TF-IDF if the library isn't installed.
    """
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        # L2-normalise so dot product == cosine similarity
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)
        embeddings = embeddings / norms
        sim = np.dot(embeddings, embeddings.T).astype(np.float32)
        logger.info("Embedding similarity matrix built: %dx%d", sim.shape[0], sim.shape[1])
        return sim
    except ImportError:
        logger.warning("sentence-transformers not installed; falling back to TF-IDF.")
        return _tfidf_similarity(texts)
