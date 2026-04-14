"""
validate_llm/core.py

Validates ALL categories of LLM extraction output:
  judges, assets, new_parties, additional_acts, missing_advocates, case_updates

Two-pass strategy per entity:
  Pass 1 — Fuzzy-quote alignment (RapidFuzz). Fast.
  Pass 2 — Entity-name deep-search + NLI entailment. Robust fallback.

Each validated entity receives a composite confidence_score [0–1].
Entities with score below REJECT_THRESHOLD are removed from the output.
"""
import logging
from typing import Optional

from .verifier import (
    find_evidence_snippet,
    find_entity_name_evidence,
    check_nli_entailment,
    extract_canonical_name,
)
from .metrics import (
    compute_confidence_score,
    calculate_accuracy_score,
    generate_validation_summary,
)

logger = logging.getLogger('pipeline')

# Score below which we reject the entity outright
REJECT_THRESHOLD = 0.30


# ─── Claim builders (what we ask the NLI model to prove) ──────────────────────

def _build_claim(entity_name: str, category: str, extra: dict) -> str:
    """Build a natural language claim for NLI verification."""
    if category == 'judges':
        return f"A judge, magistrate, commissioner, or sessions judge is presiding in this matter."
    if category == 'assets':
        a_type = extra.get('asset_type') or 'asset'
        return f"{entity_name} is a secured {a_type}, property, flat, vehicle, or mortgage mentioned in this document."
    if category == 'new_parties':
        return f"{entity_name} is mentioned as a person or organization involved in this case."
    if category == 'additional_acts':
        section = extra.get('section')
        if section:
            return f"The {entity_name} act, section {section}, is cited in this legal proceeding."
        return f"The {entity_name} is cited as a statute, act, or law in this legal proceeding."
    if category == 'missing_advocates':
        return f"{entity_name} is mentioned as an advocate, counsel, lawyer, or legal representative."
    if category == 'party_additional_info':
        # Verify the known party is named in the document (their info must come from this doc)
        return f"{entity_name} is named as a party, respondent, petitioner, or involved person in this document."
    if category == 'case_updates':
        value = extra.get('value')
        return f"The value '{value}' is mentioned in this document."
    return f"{entity_name} is mentioned in this document."


# ─── Single-entity validator ───────────────────────────────────────────────────

def _validate_entity(
    entity_name: str,
    category: str,
    quote: Optional[str],
    pdf_texts: dict,
    extra: dict,
) -> tuple[bool, float, float, Optional[str]]:
    """
    Returns: (is_accepted, confidence_score, fuzzy_score, evidence_snippet)
             evidence_snippet is the best text found in the PDF (used for name correction)
    """
    claim = _build_claim(entity_name, category, extra)

    # ── Pass 1: Fuzzy quote alignment ───────────────────────────────────────
    snippet, fuzzy_score = find_evidence_snippet(quote, pdf_texts)

    if fuzzy_score >= 85:
        # For legal Acts, a high-confidence text match IS the proof.
        if category == 'additional_acts':
            confidence = compute_confidence_score(fuzzy_score, 1.0)
            logger.info(
                f"[PASS1-ACT] {entity_name}: fuzzy={fuzzy_score:.0f}, "
                f"NLI skipped (act name match sufficient), conf={confidence:.2f}"
            )
            return True, confidence, fuzzy_score, snippet

        # High fuzzy → run NLI with a LOWER threshold (0.40) since text match is already strong
        is_entailed, nli_score = check_nli_entailment(claim, snippet, threshold=0.40)
        confidence = compute_confidence_score(fuzzy_score, nli_score)
        logger.info(
            f"[PASS1] {entity_name}: fuzzy={fuzzy_score:.0f}, "
            f"nli={'YES' if is_entailed else 'NO'}, conf={confidence:.2f}"
        )
        return is_entailed, confidence, fuzzy_score, snippet

    if snippet and 40 <= fuzzy_score < 85:
        # Partial match → still try NLI on the snippet
        is_entailed, nli_score = check_nli_entailment(claim, snippet)
        confidence = compute_confidence_score(fuzzy_score, nli_score)
        logger.info(
            f"[PASS1-PARTIAL] {entity_name}: fuzzy={fuzzy_score:.0f}, "
            f"nli={'YES' if is_entailed else 'NO'}, conf={confidence:.2f}"
        )
        if is_entailed:
            return True, confidence, fuzzy_score, snippet
        # Fall through to deep search

    # ── Pass 2: Entity name deep search ────────────────────────────────────
    logger.debug(f"[PASS2] Deep-hunting '{entity_name}' across all PDF text...")
    deep_evidence = find_entity_name_evidence(entity_name, pdf_texts)

    if not deep_evidence:
        logger.warning(f"[REJECTED] {entity_name}: not found in PDF text at all.")
        return False, 0.0, fuzzy_score, None

    is_entailed, nli_score = check_nli_entailment(claim, deep_evidence)
    confidence = compute_confidence_score(max(fuzzy_score, 20.0), nli_score)
    logger.info(
        f"[PASS2] {entity_name}: nli={'YES' if is_entailed else 'NO'}, "
        f"nli_score={nli_score:.2f}, conf={confidence:.2f}"
    )
    return is_entailed, confidence, fuzzy_score, deep_evidence


# ─── Category handlers ────────────────────────────────────────────────────────

def _get_name_and_quote(item: dict, category: str) -> tuple[str, Optional[str]]:
    """Extract the primary entity name and quote for each category."""
    if category == 'judges':
        return item.get('name', ''), item.get('supporting_quote')
    if category == 'assets':
        return item.get('identifier') or item.get('asset_type', ''), item.get('supporting_quote')
    if category == 'new_parties':
        return item.get('name', ''), item.get('supporting_quote')
    if category == 'additional_acts':
        return item.get('name', ''), item.get('supporting_quote')
    if category == 'missing_advocates':
        return item.get('name', ''), item.get('supporting_quote')
    if category == 'party_additional_info':
        # Validates that the known party's ADDITIONAL info (PAN, age etc.) is in the PDF
        return item.get('name', ''), item.get('supporting_quote')
    return '', None


# ─── Main entry point ─────────────────────────────────────────────────────────

def validate_case_delta(llm_output: dict, pdf_texts: dict) -> tuple[dict, dict]:
    """
    Validate every extractable category returned by the primary LLM.

    Returns:
      verified_output : cleaned llm_output (unverified items removed)
      stats           : validation metrics dict
    """
    logger.info("Starting targeted validation of LLM extraction...")
    verified_output = {k: v for k, v in llm_output.items()}

    stats = {
        'total_extracted': 0,
        'total_verified': 0,
        'total_rejected': 0,
        'accuracy_score': 100.0,
    }

    # ── List-type categories (each item is a dict entity) ─────────────────
    list_categories = [
        'judges',
        'assets',
        'new_parties',
        'additional_acts',
        'missing_advocates',
        'party_additional_info',   # PAN, Aadhaar, age etc. extracted for known parties
    ]

    for category in list_categories:
        items = llm_output.get(category, [])
        if not items:
            continue

        clean_items = []
        for item in items:
            name, quote = _get_name_and_quote(item, category)
            if not name:
                continue

            stats['total_extracted'] += 1
            accepted, confidence, fuzzy, evidence = _validate_entity(
                name, category, quote, pdf_texts, item
            )

            # Store confidence on the item regardless
            item['_confidence'] = confidence
            item['_fuzzy_score'] = fuzzy

            if accepted and confidence >= REJECT_THRESHOLD:
                # ── Name correction: use PDF's canonical spelling ──────────
                if evidence and item.get('name'):
                    corrected, was_fixed = extract_canonical_name(item['name'], evidence)
                    if was_fixed:
                        item['_llm_name'] = item['name']   # preserve original
                        item['name'] = corrected

                stats['total_verified'] += 1
                clean_items.append(item)
            else:
                stats['total_rejected'] += 1

        verified_output[category] = clean_items

    # ── Dict-type category: case_updates ──────────────────────────────────
    case_updates = llm_output.get('case_updates', {})
    if isinstance(case_updates, dict) and case_updates:
        verified_updates = {}
        for field_name, field_value in case_updates.items():
            if not field_value:
                continue
            stats['total_extracted'] += 1
            accepted, confidence, fuzzy = _validate_entity(
                entity_name=field_name,
                category='case_updates',
                quote=str(field_value),
                pdf_texts=pdf_texts,
                extra={'value': str(field_value)},
            )
            if accepted and confidence >= REJECT_THRESHOLD:
                stats['total_verified'] += 1
                verified_updates[field_name] = field_value
            else:
                stats['total_rejected'] += 1
        verified_output['case_updates'] = verified_updates

    # ── Final accuracy score ───────────────────────────────────────────────
    stats['accuracy_score'] = calculate_accuracy_score(
        stats['total_verified'], stats['total_extracted']
    )

    return verified_output, stats
