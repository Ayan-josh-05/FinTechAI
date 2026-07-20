"""
Extraction/validate_llm/engine.py
Rule-based validation engine.

Walks a raw entity dict (as returned by the LLM extraction step) against
the declarative rules in field_rules.py. Any field that fails its rule(s)
is nulled out (kept in the dict as None) so the rest of the entity still
gets inserted — matching the codebase's existing to_none()/missing_data_log
convention for "no reliable value".

Fields flagged here are also collected so a future LLM-review step can
pick them up (see FLAGGED_FOR_LLM below) without touching this module.
"""
import logging
from typing import Any

from Extraction.utils.helpers import to_none
from Extraction.validate_llm.field_rules import ENTITY_RULES

logger = logging.getLogger('pipeline')


def validate_entity(entity_type: str, data: dict, context: str = '') -> tuple[dict, list[dict]]:
    """
    Validate one entity dict in place (returns a new dict; input is not mutated).

    Returns (cleaned_data, dropped) where `dropped` is a list of
    {'entity_type', 'field', 'value', 'context'} describing what was nulled.
    """
    rules = ENTITY_RULES.get(entity_type.lower())
    if not rules:
        return data, []

    cleaned = dict(data)
    dropped: list[dict] = []

    for field, checks in rules.items():
        if field not in cleaned:
            continue
        raw_value = to_none(cleaned.get(field))
        if raw_value is None:
            continue

        if not all(check(raw_value) for check in checks):
            dropped.append({
                'entity_type': entity_type,
                'field'      : field,
                'value'      : raw_value,
                'context'    : context,
            })
            cleaned[field] = None

    if dropped:
        for d in dropped:
            logger.warning(
                f"[validate_llm] dropped invalid field "
                f"{d['entity_type']}.{d['field']}={d['value']!r} ({d['context']})"
            )

    return cleaned, dropped


def validate_entities(entity_type: str, items: list[dict], context: str = '') -> tuple[list[dict], list[dict]]:
    """Validate a list of entity dicts (e.g. all judges_data). Returns (cleaned_items, all_dropped)."""
    cleaned_items = []
    all_dropped: list[dict] = []
    for item in items:
        cleaned, dropped = validate_entity(entity_type, item, context)
        cleaned_items.append(cleaned)
        all_dropped.extend(dropped)
    return cleaned_items, all_dropped
