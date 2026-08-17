"""
Demo runner for the Field Mapping POC.

Usage:
    python main.py
    python main.py --schema schemas/examples/identity_card.json --text samples/sample_ocr_text.txt

Requires a running local Ollama instance with the target model pulled:
    ollama pull gemma3:4b
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from core.mapper import FieldMapper
from core.ollama_client import OllamaClientError
from core.response_parser import ResponseParseError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LegalAI Field Mapping POC")
    parser.add_argument("--schema", type=Path, default=Path("schemas/examples/salary_slip.json"),
                         help="Path to a JSON file describing the target schema")
    parser.add_argument("--text", type=Path, default=Path("samples/sample_ocr_text.txt"),
                         help="Path to a text file containing raw OCR output")
    
    args = parser.parse_args()
    return args


def main() -> int:
    args = parse_args()

    schema = json.loads(args.schema.read_text(encoding="utf-8"))
    document_text = args.text.read_text(encoding="utf-8")

    mapper = FieldMapper()

    try:
        result = mapper.map_fields(schema, document_text)
    except (OllamaClientError, ResponseParseError, ValueError) as exc:
        logging.error("Field mapping failed: %s", exc)
        return 1

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
