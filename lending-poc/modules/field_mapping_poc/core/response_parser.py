"""
Parses and normalizes the raw model response.

Responsibilities:
- Safely parse JSON, with a light repair pass for common LLM slip-ups
  (markdown fences, stray prose around the JSON object).
- Guarantee every key from the original schema is present in the
  output (filled with null if the model dropped it).
- Tag every field NOT present in the original schema as an "extra
  field" using the {"value": ..., "source": "llm_added"} wrapper
  convention, so downstream code (e.g. the future Neo4j writer) can
  decide whether to trust, review, or discard it.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict

from config import (
    EXTRA_FIELD_SOURCE_KEY,
    EXTRA_FIELD_SOURCE_TAG,
    EXTRA_FIELD_VALUE_KEY,
)

logger = logging.getLogger(__name__)


class ResponseParseError(Exception):
    """Raised when the model's response cannot be salvaged into JSON."""


_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _strip_code_fences(text: str) -> str:
    return _FENCE_RE.sub("", text).strip()


def _extract_json_substring(text: str) -> str:
    """
    Fallback for when the model wraps JSON in stray prose: grabs the
    substring between the first '{' and the last '}'.
    """
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ResponseParseError("No JSON object found in model output")
    return text[start : end + 1]


def parse_raw_json(raw_text: str) -> Dict[str, Any]:
    """Best-effort parse of the model's raw string into a dict."""
    candidate = _strip_code_fences(raw_text)
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        logger.debug("Direct JSON parse failed, attempting substring extraction")

    candidate = _extract_json_substring(candidate)
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise ResponseParseError(f"Could not parse model output as JSON: {exc}") from exc


def _wrap_extra(value: Any) -> Dict[str, Any]:
    return {
        EXTRA_FIELD_VALUE_KEY: value,
        EXTRA_FIELD_SOURCE_KEY: EXTRA_FIELD_SOURCE_TAG,
    }


def reconcile_with_schema(
    schema: Dict[str, Any],
    model_output: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Recursively walks `schema` and `model_output` together.

    - Keys present in schema: pass the model's value through as-is
      (or null if the model omitted / couldn't find it). No wrapper —
      these stay flat so existing consumers of the schema shape don't
      need to change.
    - Keys present in model_output but NOT in schema: kept flat, at
      the same nesting level, but wrapped as
      {"value": ..., "source": "llm_added"} so they're clearly
      distinguishable from schema-backed fields.
    - Nested dicts are handled recursively, so multi-level schemas
      (e.g. an "address" object) work the same way.
    """
    result: Dict[str, Any] = {}

    if not isinstance(model_output, dict):
        logger.warning("Model output at this level was not a dict; discarding")
        model_output = {}

    # 1. Walk schema fields first, guaranteeing they all exist in the output.
    for key, expected in schema.items():
        model_value = model_output.get(key)
        if isinstance(expected, dict) and isinstance(model_value, dict):
            result[key] = reconcile_with_schema(expected, model_value)
        elif isinstance(expected, dict):
            # Model dropped a whole nested object -> recurse against {} so
            # every nested schema key still shows up, null-filled.
            result[key] = reconcile_with_schema(expected, {})
        else:
            result[key] = model_value

    # 2. Anything the model added that wasn't in the schema.
    for key, value in model_output.items():
        if key in schema:
            continue
        if isinstance(value, dict):
            # Nested extra object: recurse with an empty schema so every
            # leaf inside it also gets flagged as llm_added.
            result[key] = reconcile_with_schema({}, value)
        else:
            result[key] = _wrap_extra(value)

    return result


def normalize_response(schema: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
    """Full pipeline: raw model string -> parsed JSON -> schema-reconciled dict."""
    parsed = parse_raw_json(raw_text)
    return reconcile_with_schema(schema, parsed)
