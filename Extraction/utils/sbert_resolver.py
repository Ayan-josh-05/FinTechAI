"""
Extraction/utils/sbert_resolver.py
SBERT-based contextual scoring for judge disambiguation (Stage 3b).

Only runs for judges in the fuzzy-ambiguous band (0.60–0.92) where
current_court is available on both sides. For parties and advocates the
context fields are too often missing, so this module is not called for them.

Model: all-MiniLM-L6-v2 (~80 MB, CPU-only, loaded once as a lazy singleton).
"""
import logging
import numpy as np

logger = logging.getLogger('pipeline')

_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading SBERT model (all-MiniLM-L6-v2) — first use only.")
            _model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        except ImportError:
            logger.warning("sentence-transformers not installed; SBERT scoring disabled.")
            return None
    return _model


def _build_entity_text(entity: dict) -> str:
    """
    Encode name + court + role together. Bare name embeddings are nearly
    useless for disambiguation — the context is what separates e.g.
    "A. K. Singh, Delhi HC" from "A. K. Singh, Bombay HC".
    """
    parts = [entity.get("name", "")]
    if entity.get("court"):       parts.append(entity["court"])
    if entity.get("designation"): parts.append(entity["designation"])
    return ", ".join(p for p in parts if p)


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def sbert_score(entity_a: dict, entity_b: dict) -> float:
    """
    Cosine similarity between SBERT embeddings of two entity context strings.
    Returns 0.0 if the model is unavailable or context is empty on either side.
    """
    model = _get_model()
    if model is None:
        return 0.0
    text_a = _build_entity_text(entity_a)
    text_b = _build_entity_text(entity_b)
    if not text_a or not text_b:
        return 0.0
    ea, eb = model.encode([text_a, text_b])
    return _cosine(ea, eb)


def combined_judge_score(
    extracted: dict,
    candidate: dict,
    fuzzy_score: float,
    fuzzy_w: float = 0.5,
    sbert_w: float = 0.5,
) -> dict:
    """
    Combine fuzzy string score with SBERT contextual score for a judge pair.

    Args:
        extracted   — {'name': ..., 'court': ..., 'designation': ...} for the new entity
        candidate   — {'name': ..., 'current_court': ..., 'designation': ...} from the graph
        fuzzy_score — pre-computed score from score_pair()
        fuzzy_w     — weight for fuzzy component
        sbert_w     — weight for SBERT component

    Returns dict with keys: fuzzy, sbert, combined, conflict_flag, route
    """
    cand_for_sbert = {
        "name":        candidate.get("name", ""),
        "court":       candidate.get("current_court", ""),
        "designation": candidate.get("designation", ""),
    }
    ext_for_sbert = {
        "name":        extracted.get("name", ""),
        "court":       extracted.get("court", ""),
        "designation": extracted.get("designation", ""),
    }

    s_score = sbert_score(ext_for_sbert, cand_for_sbert)

    # Conflict: strings look very similar but contexts diverge sharply.
    # This catches "A.K. Singh, Delhi HC" vs "A.K. Singh, Bombay HC".
    conflict = fuzzy_score > 0.90 and s_score < 0.65

    combined = fuzzy_w * fuzzy_score + sbert_w * s_score
    if conflict:
        combined = min(combined, 0.45)

    if combined >= 0.92:
        route = "auto_merge"
    elif combined >= 0.60:
        route = "llm_review"
    else:
        route = "auto_reject"

    return {
        "fuzzy":         round(fuzzy_score, 3),
        "sbert":         round(s_score, 3),
        "combined":      round(combined, 3),
        "conflict_flag": conflict,
        "route":         route,
    }
