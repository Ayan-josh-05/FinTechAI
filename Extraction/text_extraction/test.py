import sys
from pathlib import Path

# Add the parent directory to sys.path to handle imports if run from inside text_extraction
sys.path.append(str(Path(__file__).parent.parent))

from pdf_extractor import extract_pdf_text

pdf_path = "/home/ue/LegalAI/Extraction/data/198_2020/documents/order_judgement_2021-12-11.pdf"
if Path(pdf_path).exists():
    text, method = extract_pdf_text(pdf_path)
    print(f"Extracted via: {method}")
    print("-" * 20)
    print(text[:500] + "...")
else:
    print(f"Test PDF not found: {pdf_path}")
