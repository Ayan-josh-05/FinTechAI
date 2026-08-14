"""
FieldMapper: the main entry point of the POC.

Given (target_schema, document_text) it returns a schema-shaped JSON
with values filled in from the text, nulls where nothing was found,
and any extra model-discovered fields flagged with a source marker.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from core.ollama_client import OllamaClient
from core.prompt_builder import build_system_prompt, build_user_prompt
from core.response_parser import ResponseParseError, normalize_response

logger = logging.getLogger(__name__)


class FieldMapper:
    def __init__(self, client: Optional[OllamaClient] = None):
        self.client = client or OllamaClient()

    def map_fields(
        self,
        schema: Dict[str, Any],
        document_text: str,
    ) -> Dict[str, Any]:
        """
        :param schema: arbitrary JSON describing expected fields
                        (values are type/description hints, not data).
        :param document_text: raw OCR (post-translation) text.
        :return: schema-shaped dict, values filled or null, with any
                 extra fields flagged as {"value": ..., "source": "llm_added"}.
        :raises ValueError: on empty inputs.
        :raises OllamaClientError: if the model backend fails.
        :raises ResponseParseError: if the model's output can't be
                                     salvaged into valid JSON.
        """
        if not document_text or not document_text.strip():
            raise ValueError("document_text is empty")
        if not schema:
            raise ValueError("schema must not be empty")

        system_prompt = build_system_prompt()
        user_prompt = build_user_prompt(schema, document_text)

        raw_response = self.client.generate_json(system_prompt, user_prompt)

        try:
            return normalize_response(schema, raw_response)
        except ResponseParseError:
            logger.error("Failed to parse model response:\n%s", raw_response)
            raise
