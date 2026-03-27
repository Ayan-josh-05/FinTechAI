"""
Text_Extraction/Pdf_extraction/pdf_extractor.py
PDF text extraction pipeline:
  1. Digital extraction via fitz (PyMuPDF)
  2. OCR fallback via pytesseract (hindi + english)
  3. Fixed-field extraction (judge UIDs, vehicle numbers, CNR refs)
"""
import re
import logging
from pathlib import Path
import fitz
import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger('pipeline')

# ── Misencoded Devanagari detection ───────────────────────────────────────
# Detects Hindi PDFs where Devanagari glyphs are mapped to wrong Latin codepoints.
DEVA_GARBAGE_RE = re.compile(
    r'[a-z]{1,4};[a-z]'
    r'|[a-z]\.[a-z]\.[a-z]'
    r'|[a-z]{2,}&[a-z0-9]'
)
GARBAGE_CHARS = {'\ufffd', '\x00', '\ufffe', '\uffff'}

# ── Fixed-format regex patterns ────────────────────────────────────────────
UID_RE     = re.compile(r'UID\s*[Nn]o\.?\s*([A-Z]{2}\d{3,6})', re.IGNORECASE)
VEHICLE_RE = re.compile(r'\b([A-Z]{2}[\s\-]?\d{2}[\s\-]?[A-Z]{1,3}[\s\-]?\d{4})\b')
CNR_RE     = re.compile(r'\b([A-Z]{4}\d{12})\b')


def is_misencoded_devanagari(text: str) -> bool:
    """Return True if text is Devanagari content mapped to wrong Latin codepoints."""
    if not text:
        return False
    real_hindi = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    if real_hindi > 10:
        return False
    sample  = text[:1000].lower()
    matches = DEVA_GARBAGE_RE.findall(sample)
    total   = max(len(sample.split()), 1)
    return len(matches) / total > 0.03


def _extract_digital(pdf_path: str) -> tuple[str, bool]:
    """Try digital text extraction with PyMuPDF (fitz)."""
    logger.info(f"Starting _extract_digital for {Path(pdf_path).name}")
    try:
        doc = fitz.open(pdf_path)
        pages = []
        for page in doc:
            pages.append(page.get_text())
        full_text = "\n".join(pages).strip()
        doc.close()
    except Exception as e:
        logger.warning(f'fitz failed on {Path(pdf_path).name}: {e}')
        return '', False

    if len(full_text) < 50:
        return full_text, False

    garbage = sum(1 for c in full_text if c in GARBAGE_CHARS)
    if garbage / max(len(full_text), 1) > 0.10:
        return full_text, False

    if is_misencoded_devanagari(full_text):
        logger.info(f'Misencoded Devanagari in {Path(pdf_path).name} — falling back to OCR')
        return full_text, False

    return full_text, True


def _extract_ocr(pdf_path: str) -> str:
    """Strong OCR fallback using pytesseract with dimension skip rule."""
    logger.info(f"Starting _extract_ocr for {Path(pdf_path).name}")
    try:
        import pytesseract
        from pdf2image import convert_from_path
    except ImportError as e:
        logger.error(f"OCR dependencies missing: {e}")
        return ""

    try:
        doc = fitz.open(pdf_path)
        pages_text = []
        
        for i, page in enumerate(doc):
            # Dimension Check: Skip OCR if any dimension is < 1000px at reasonable DPI
            # We'll use 300 DPI for the check as it's standard for OCR
            pix = page.get_pixmap(dpi=300)
            if pix.width < 1000 or pix.height < 1000:
                logger.info(f"  - Page {i+1}: Image dimensions too small ({pix.width}x{pix.height}) - skipping OCR")
                continue
            
            # Preprocess image
            img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
            # Thresholding + Noise reduction
            gray = cv2.medianBlur(gray, 3)
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            
            # OCR execution
            custom_config = r"--oem 3 --psm 6"
            text = pytesseract.image_to_string(thresh, lang="hin+eng", config=custom_config)
            pages_text.append(text.replace('\n', ' '))
            
        doc.close()
        return " ".join(pages_text).strip()

    except Exception as e:
        logger.warning(f"OCR failed on {Path(pdf_path).name}: {e}")
        return ""


def extract_pdf_text(pdf_path: str) -> tuple[str, str]:
    """Extract text from PDF using digital extraction first, then OCR if needed."""
    logger.info(f"Starting extract_pdf_text for {Path(pdf_path).name}")
    text, ok = _extract_digital(pdf_path)
    
    # Corrected logic: if ok is True, we have good text, so don't do OCR.
    if ok:
        return text, 'digital'
    
    # If we are here, digital was either bad, empty, or misencoded.
    ocr_text = _extract_ocr(pdf_path)
    if ocr_text:
        return ocr_text, 'ocr'
        
    return text, 'digital'


def extract_fixed_fields(text: str) -> dict:
    if not text:
        return {}
    return {
        'judge_uids'     : list(dict.fromkeys(UID_RE.findall(text))),
        'vehicle_numbers': list(dict.fromkeys(VEHICLE_RE.findall(text))),
        'cnr_refs'       : list(dict.fromkeys(CNR_RE.findall(text))),
    }