import json
import logging
from pathlib import Path

from core.mapper import FieldMapper
from core.ollama_client import OllamaClientError
from core.response_parser import ResponseParseError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

def run_sample(schema_path: str, text_path: str):
    print(f"\n{'='*50}")
    print(f"Running Mapping Pipeline")
    print(f"Schema: {schema_path}")
    print(f"Input Text: {text_path}")
    print(f"{'='*50}")
    
    try:
        # Load schema and text
        schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
        document_text = Path(text_path).read_text(encoding="utf-8")
        
        # Initialize mapper and run
        mapper = FieldMapper()
        result = mapper.map_fields(schema, document_text)
        
        # Print results
        print("\nMapping Result:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
    except (OllamaClientError, ResponseParseError, ValueError, FileNotFoundError) as exc:
        logging.error("Field mapping failed: %s", exc)

if __name__ == "__main__":
    schema_file = "schemas/examples/salary_slip.json"
    
    # Run the clean sample
    clean_text = "test_inputs/sample_salary_slip.txt"
    run_sample(schema_file, clean_text)
    
    # Run the noisy OCR sample
    noisy_text = "test_inputs/sample_salary_slip_noisy.txt"
    run_sample(schema_file, noisy_text)
