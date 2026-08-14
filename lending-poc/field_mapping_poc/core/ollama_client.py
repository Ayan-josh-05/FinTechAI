"""
Thin wrapper around the `ollama` python library.

Keeping this isolated means:
- if Ollama gets swapped for vLLM / a hosted endpoint later, this is
  the only file that needs to change.
- retry / timeout / error-handling logic lives in exactly one place.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

import ollama

from config import OLLAMA

logger = logging.getLogger(__name__)


class OllamaClientError(Exception):
    """Raised when the Ollama backend fails after all retries."""


class OllamaClient:
    def __init__(
        self,
        model: str = OLLAMA.model,
        host: str = OLLAMA.host,
        temperature: float = OLLAMA.temperature,
        num_ctx: int = OLLAMA.num_ctx,
        max_retries: int = OLLAMA.max_retries,
    ):
        self.model = model
        self.temperature = temperature
        self.num_ctx = num_ctx
        self.max_retries = max_retries
        self._client = ollama.Client(host=host, timeout=OLLAMA.request_timeout)

    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        """
        Calls the model in JSON mode and returns the raw string response.
        Retries on transient failures with linear backoff (1s, 2s, ...).
        """
        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 2):
            try:
                response = self._client.chat(
                    model=self.model,
                    format="json",  # forces the model to emit valid JSON only
                    options={
                        "temperature": self.temperature,
                        "num_ctx": self.num_ctx,
                    },
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                content = response["message"]["content"]
                if not content or not content.strip():
                    raise OllamaClientError("Model returned empty content")
                return content

            except Exception as exc:  # noqa: BLE001 - retry on anything transient
                last_error = exc
                logger.warning(
                    "Ollama call failed (attempt %d/%d): %s",
                    attempt, self.max_retries + 1, exc,
                )
                if attempt <= self.max_retries:
                    time.sleep(attempt)

        raise OllamaClientError(
            f"Ollama call failed after {self.max_retries + 1} attempts"
        ) from last_error
