"""
validate_llm/metrics.py

Composite confidence scoring for a single validated entity.
Formula (from research):
  score = 0.30 * fuzzy_score + 0.40 * semantic_sim + 0.30 * nli_score

For now semantic_sim is approximated by a normalised fuzzy score 
(avoids loading a second embedder just for validation).
"""
import logging

logger = logging.getLogger('pipeline')


def compute_confidence_score(
    fuzzy_score: float,     # 0–100 from RapidFuzz
    nli_score: float,       # 0–1 from NLI model
    fuzzy_weight: float = 0.50,
    nli_weight: float   = 0.50,
) -> float:
    """Return a 0–1 composite confidence score for one entity."""
    normalised_fuzzy = fuzzy_score / 100.0
    return round(normalised_fuzzy * fuzzy_weight + nli_score * nli_weight, 4)


def calculate_accuracy_score(verified: int, total: int) -> float:
    """Return the overall accuracy % for a case's delta (0–100)."""
    if total == 0:
        return 100.0
    return round((verified / total) * 100, 2)


def generate_validation_summary(case_id: str, metrics: dict) -> None:
    logger.info(f"--- VALIDATION SUMMARY for Case {case_id} ---")
    logger.info(f"Total New Entities Extracted : {metrics.get('total_extracted', 0)}")
    logger.info(f"Verified Entities            : {metrics.get('total_verified', 0)}")
    logger.info(f"Unverified / Rejected        : {metrics.get('total_rejected', 0)}")
    logger.info(f"FINAL ACCURACY SCORE         : {metrics.get('accuracy_score', 0.0)}%")
    logger.info("---------------------------------------------")
