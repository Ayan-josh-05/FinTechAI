import requests

API_URL = "https://zaban.joshsoftware.com/api/v1/translate"

API_KEY = "sk-xWeJidb1qWUkQNT0DVc0-K9pFB9vVTcNv0G6xXGz2swee_wkIEu_KNdT35thGZPo"

def translate_to_english(text: str) -> str:
    """
    Calls external IndicTrans2 API
    Auto detect source language
    Target = English
    """

    if not text:
        return ""

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }

    payload = {
        "text": text,
        "target_lang": "eng_Latn",
        "auto_detect": True
    }

    try:
        response = requests.post(
            API_URL,
            headers=headers,
            json=payload,
            timeout=60
        )

        response.raise_for_status()

        data = response.json()

        return data.get("translated_text", "")

    except Exception as e:
        print("Translation API error:", e)
        return text