"""
Text_Extraction/Pdf_extraction/pdf_extractor.py
PDF text extraction pipeline:
  1. Digital extraction via pdfplumber
  2. OCR fallback (pdf2image + pytesseract) for scanned / misencoded PDFs
  3. Fixed-field extraction (judge UIDs, vehicle numbers, CNR refs)
"""
import re
import logging
from pathlib import Path
import requests

import pdfplumber
import spacy 
import numpy as np
import cv2
from googletrans import Translator
# from utils.language_translation import translate_to_english
logger = logging.getLogger('pipeline')

# ── Load spacy model ───────────────────────────────────────────────────────
nlp = spacy.load('en_core_web_sm')

# ── Misencoded Devanagari detection ───────────────────────────────────────
# Detects Hindi PDFs where Devanagari glyphs are mapped to wrong Latin codepoints.
# e.g. "okf.kfT;d" instead of "वाणिज्यिक"
DEVA_GARBAGE_RE = re.compile(
    r'[a-z]{1,4};[a-z]'       # semicolon mid-word: "la[;k"
    r'|[a-z]\.[a-z]\.[a-z]'   # multiple dots:       "okf.k"
    r'|[a-z]{2,}&[a-z0-9]'    # ampersand mid-word:  "la[;k&4"
)
GARBAGE_CHARS = {'\ufffd', '\x00', '\ufffe', '\uffff'}

# ── Fixed-format regex patterns ────────────────────────────────────────────
UID_RE     = re.compile(r'UID\s*[Nn]o\.?\s*([A-Z]{2}\d{3,6})', re.IGNORECASE)
VEHICLE_RE = re.compile(r'\b([A-Z]{2}[\s\-]?\d{2}[\s\-]?[A-Z]{1,3}[\s\-]?\d{4})\b')
CNR_RE     = re.compile(r'\b([A-Z]{4}\d{12})\b')


# ── Internal helpers ───────────────────────────────────────────────────────

def is_misencoded_devanagari(text: str) -> bool:
    """
    Return True if the text is Devanagari content mapped to wrong Latin codepoints.
    Real Hindi Unicode (\u0900-\u097F) is correctly encoded; this catches the rest.
    """
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
    """
    Try digital text extraction with pdfplumber.
    Returns (text, quality_ok).  quality_ok=False → caller should try OCR.
    """
    logger.info(f"Starting _extract_digital for {Path(pdf_path).name}")
    try:
        pages = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ''
                pages.append(t)
        full_text = '\n'.join(pages).strip()
    except Exception as e:
        logger.warning(f'pdfplumber failed on {Path(pdf_path).name}: {e}')
        return '', False

    if len(full_text) < 50:
        return full_text, False

    garbage = sum(1 for c in full_text if c in GARBAGE_CHARS)
    if garbage / max(len(full_text), 1) > 0.10:
        return full_text, False
    # print("DIGITAL TEXT",full_text)
    if is_misencoded_devanagari(full_text):
        logger.info(f'Misencoded Devanagari in {Path(pdf_path).name} — falling back to OCR')

        return full_text, False

    return full_text, True


def _extract_ocr(pdf_path: str) -> str:
    """
    Strong OCR for Indian court PDFs
    Handles Hindi + English + bad scans
    """
    logger.info(f"Starting _extract_ocr for {Path(pdf_path).name}")
    try:
        from pdf2image import convert_from_path
        import pytesseract
    except ImportError as e:
        logger.error(f"OCR deps missing: {e}")
        return ""

    try:
        # High DPI for better OCR
        images = convert_from_path(pdf_path, dpi=400)

        pages = []

        for img in images:

            # PIL -> numpy
            img = np.array(img)

            # ---- preprocessing ----

            # grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # remove noise
            gray = cv2.medianBlur(gray, 3)

            # threshold (very important)
            thresh = cv2.threshold(
                gray,
                0,
                255,
                cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )[1]

            # optional resize
            thresh = cv2.resize(
                thresh,
                None,
                fx=1.5,
                fy=1.5,
                interpolation=cv2.INTER_LINEAR
            )

            # OCR config
            custom_config = r"--oem 3 --psm 6"

            text = pytesseract.image_to_string(
                thresh,
                lang="hin+eng",
                config=custom_config
            )

            pages.append(text)
        
        #replace /n with space
        pages = [page.replace('\n', ' ') for page in pages]

        return " ".join(pages).strip()

    except Exception as e:
        logger.warning(
            f"OCR failed on {Path(pdf_path).name}: {e}"
        )
        return ""


# ── Public API ─────────────────────────────────────────────────────────────

def extract_pdf_text(pdf_path: str) -> tuple[str, str]:
    """
    Extract text from a PDF using digital extraction first, OCR as fallback.
    Returns (text, method) where method is 'digital' or 'ocr'.
    """
    logger.info(f"Starting extract_pdf_text for {Path(pdf_path).name}")
    text, ok = _extract_digital(pdf_path)
    if ok:
        return text, 'digital'
    ocr_text = _extract_ocr(pdf_path)
 
    # print("OCR TEXT",ocr_text)
    if ocr_text:
       
        return ocr_text, 'ocr'
    # fallback: return whatever digital gave us even if low quality
    
    return text, 'digital'


def extract_fixed_fields(text: str) -> dict:
    """
    Extract fields that have a truly fixed national format.
    Amounts, assets, addresses → handled by LLM.
    Returns {'judge_uids': [...], 'vehicle_numbers': [...], 'cnr_refs': [...]}.
    """
    if not text:
        return {}
    return {
        'judge_uids'     : list(dict.fromkeys(UID_RE.findall(text))),
        'vehicle_numbers': list(dict.fromkeys(VEHICLE_RE.findall(text))),
        'cnr_refs'       : list(dict.fromkeys(CNR_RE.findall(text))),
    }


