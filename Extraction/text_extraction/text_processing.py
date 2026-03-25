import re


# -----------------------------
# Detect unicode hindi
# -----------------------------
def is_unicode_hindi(text: str) -> bool:
    return bool(re.search(r'[\u0900-\u097F]', text))


# -----------------------------
# Detect likely KrutiDev / legacy OCR
# -----------------------------
def is_legacy_font(text: str) -> bool:
    patterns = [
        "okf", "U;k", "izk", "vk", "gq", "vkn", "fMdz", "dq"
    ]

    for p in patterns:
        if p in text:
            return True

    return False


# -----------------------------
# Basic cleaning
# -----------------------------
def clean_text(text: str) -> str:

    if not text:
        return ""

    # remove multiple spaces
    text = re.sub(r"\s+", " ", text)

    # remove weird chars
    text = re.sub(r"[^\w\s\u0900-\u097F.,:/()-]", " ", text)

    # remove repeated spaces again
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# -----------------------------
# Normalize text
# -----------------------------
def normalize_text(text: str) -> str:

    text = text.replace("\n", " ")
    text = text.replace("\t", " ")

    text = clean_text(text)

    return text


# -----------------------------
# Split long text (for translation)
# -----------------------------
def split_text(text: str, max_len: int = 500):

    words = text.split()

    chunks = []
    current = []

    for w in words:

        current.append(w)

        if len(" ".join(current)) > max_len:
            chunks.append(" ".join(current))
            current = []

    if current:
        chunks.append(" ".join(current))

    return chunks


# -----------------------------
# Main preprocessing pipeline
# -----------------------------
def preprocess_text(text: str):

    result = {
        "original": text,
        "normalized": "",
        "is_hindi": False,
        "is_legacy": False,
    }

    text = normalize_text(text)

    result["normalized"] = text
    result["is_hindi"] = is_unicode_hindi(text)
    result["is_legacy"] = is_legacy_font(text)

    return result