"""
validate_llm/verifier.py

Two-step evidence-grounded verification:
  Step 1 — RapidFuzz window scan to locate the entity in PDF text
  Step 2 — Local NLI model (deberta-v3-small) to confirm the claim

No extra LLM API calls. Runs entirely on CPU in milliseconds.
"""
import re
import logging
from functools import lru_cache
from typing import Optional

from rapidfuzz import fuzz, process as rfprocess

logger = logging.getLogger('pipeline')

# ─── NLI model (loaded once, cached) ─────────────────────────────────────────
_nli_pipeline = None

def get_nli_pipeline():
    global _nli_pipeline
    if _nli_pipeline is None:
        from transformers import pipeline as hf_pipeline
        logger.info("Loading local NLI model (cross-encoder/nli-deberta-v3-small)...")
        _nli_pipeline = hf_pipeline(
            "text-classification",
            model="cross-encoder/nli-deberta-v3-small",
            device=-1,          # CPU
            truncation=True,
            max_length=512,
        )
        logger.info("NLI model loaded.")
    return _nli_pipeline


# ─── Utility ──────────────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    """Collapse whitespace/newlines so the NLI model reads clean sentences."""
    return re.sub(r'\s+', ' ', text).strip()


def _sliding_window_candidates(text: str, window_words: int, step: int = 2) -> list[str]:
    """Split text into overlapping word-windows for RapidFuzz to search."""
    words = text.split()
    return [
        " ".join(words[i : i + window_words + 4])
        for i in range(0, max(1, len(words) - window_words), step)
    ]


# ─── Step 1: Fuzzy localization ───────────────────────────────────────────────

def find_evidence_snippet(
    quote: Optional[str],
    pdf_texts: dict,
    window_chars: int = 800,
    fuzzy_threshold: int = 40,
) -> tuple[Optional[str], float]:
    """
    Try to locate the LLM's supporting_quote in the PDF.

    Returns: (snippet or None, fuzzy_score 0-100)
      - score ≥ 85 → high confidence exact match
      - score 40–84 → partial/approximate match (proceed with NLI)
      - score < 40  → quote not found (caller should try name-based fallback)
    """
    if not quote or not pdf_texts:
        return None, 0.0

    quote_clean = _clean_text(quote)
    quote_words = len(quote_clean.split())
    window_words = max(quote_words, 4)

    best_score  = 0.0
    best_match  = None
    best_source = None

    for storage_id, text in pdf_texts.items():
        if not text:
            continue
        text_clean = _clean_text(text)
        candidates = _sliding_window_candidates(text_clean, window_words)
        if not candidates:
            continue

        result = rfprocess.extractOne(
            quote_clean,
            candidates,
            scorer=fuzz.token_set_ratio,
            score_cutoff=fuzzy_threshold,
        )
        if result and result[1] > best_score:
            best_score  = result[1]
            best_match  = result[0]       # the matched sliding window
            best_source = (storage_id, text_clean)

    if best_match is None:
        return None, 0.0

    # Expand to a larger context window around the matched text
    _, text_clean = best_source
    idx = text_clean.find(best_match[:30])
    if idx == -1:
        snippet = best_match
    else:
        start = max(0, idx - window_chars // 2)
        end   = min(len(text_clean), idx + len(best_match) + window_chars // 2)
        snippet = text_clean[start:end].strip()

    return snippet, best_score


def find_entity_name_evidence(
    entity_name: str,
    pdf_texts: dict,
    window_chars: int = 1000,
    max_hits: int = 5,
) -> Optional[str]:
    """
    Fallback: search for the ENTITY NAME directly across the document.
    Bundles up to max_hits occurrence-snippets into a single evidence block.
    Used when the LLM's quote is useless (score < 40).
    """
    if not entity_name or not pdf_texts:
        return None

    name_clean  = _clean_text(entity_name)
    name_pattern = re.compile(re.escape(name_clean), re.IGNORECASE)
    snippets = []

    for _, text in pdf_texts.items():
        if not text:
            continue
        text_clean = _clean_text(text)
        for m in name_pattern.finditer(text_clean):
            if len(snippets) >= max_hits:
                break
            start = max(0, m.start() - window_chars // 2)
            end   = min(len(text_clean), m.end() + window_chars // 2)
            snippets.append(text_clean[start:end].strip())

    if not snippets:
        return None

    return "\n\n---\n\n".join(snippets)


# ─── Step 2: NLI entailment check ────────────────────────────────────────────

def check_nli_entailment(claim: str, evidence: str, threshold: float = 0.65) -> tuple[bool, float]:
    """
    Ask the local NLI model: does *evidence* ENTAIL *claim*?

    Returns: (is_entailed: bool, entailment_score: float)
    """
    nli = get_nli_pipeline()
    # DeBERTa NLI format: premise [SEP] hypothesis
    text = f"{evidence[:800]} [SEP] {claim}"
    try:
        result = nli(text, truncation=True)[0]
        label  = result['label'].upper()
        score  = result['score']
        is_entailed = (label == 'ENTAILMENT') and (score >= threshold)
        return is_entailed, score if label == 'ENTAILMENT' else 0.0
    except Exception as e:
        logger.error(f"NLI model error: {e}")
        return False, 0.0


# ─── Step 3: Name correction ──────────────────────────────────────────────────

def extract_canonical_name(
    llm_name: str,
    evidence_snippet: str,
    match_threshold: int = 80,
) -> tuple[str, bool]:
    """
    Given an evidence snippet from the PDF, find the closest actual spelling
    of the entity name using character-level RapidFuzz matching.

    Returns: (canonical_name, was_corrected)
      - canonical_name: the PDF's spelling (authoritative)
      - was_corrected: True if the LLM's spelling was different
    """
    if not evidence_snippet or not llm_name:
        return llm_name, False

    llm_name_clean  = _clean_text(llm_name)
    name_word_count = len(llm_name_clean.split())

    # Slide same-length windows and score character-level similarity
    words      = evidence_snippet.split()
    candidates = [
        " ".join(words[i : i + name_word_count])
        for i in range(max(1, len(words) - name_word_count + 1))
    ]

    # Use fuzz.ratio for strict character-level comparison (catches Ishan vs Ishaan)
    result = rfprocess.extractOne(
        llm_name_clean,
        candidates,
        scorer=fuzz.ratio,          # strict character-level, NOT token-set
        score_cutoff=match_threshold,
    )

    if result is None:
        return llm_name, False

    pdf_name, score, _ = result
    # Strip trailing PDF formatting artifacts (brackets, punctuation) from matched name
    pdf_name = pdf_name.strip().rstrip(')].,:;')

    was_corrected = pdf_name.lower() != llm_name_clean.lower()

    if was_corrected:
        logger.warning(
            f"NAME CORRECTION: LLM said '{llm_name}' | "
            f"PDF says '{pdf_name}' | char-sim={score:.0f}%"
        )

    return pdf_name, was_corrected
