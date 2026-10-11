import urllib.request
import urllib.parse
import json
import logging
from typing import Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger("video_menu.translate")

router = APIRouter(prefix="/translate", tags=["Translation"])

# Language code mapping for Google Translate and MyMemory (e.g. tj -> tg)
LANG_CODE_MAP = {
    "tj": "tg",  # Tajik ISO 639-1 code in Google Translate
    "ru": "ru",
    "en": "en",
    "uz": "uz",
    "tr": "tr",
    "ar": "ar",
    "zh": "zh-CN",
    "fr": "fr",
    "de": "de",
    "es": "es",
    "it": "it",
    "fa": "fa",
    "kk": "kk",
    "ky": "ky"
}

def call_google_dict_api(text: str, sl: str, tl: str) -> Optional[str]:
    try:
        url = (
            "https://clients5.google.com/translate_a/t?"
            f"client=dict-chrome-ex&sl={sl}&tl={tl}&q={urllib.parse.quote(text)}"
        )
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=7) as response:
            data = json.loads(response.read().decode("utf-8"))
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, str):
                return data
    except Exception as e:
        logger.warning(f"Google dict API failed [{sl}->{tl}]: {e}")
    return None

def call_mymemory_api(text: str, sl: str, tl: str) -> Optional[str]:
    try:
        url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(text)}&langpair={sl}|{tl}"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            res_text = data.get("responseData", {}).get("translatedText")
            if res_text and not res_text.startswith("MYMEMORY WARNING"):
                return res_text
    except Exception as e:
        logger.warning(f"MyMemory API failed [{sl}->{tl}]: {e}")
    return None

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    if not text or not text.strip():
        return ""

    sl = LANG_CODE_MAP.get(source_lang.lower(), source_lang.lower())
    tl = LANG_CODE_MAP.get(target_lang.lower(), target_lang.lower())

    if sl == tl:
        return text

    # Try Google dict API first
    res = call_google_dict_api(text, sl, tl)
    if res:
        return res

    # Try MyMemory API fallback
    res = call_mymemory_api(text, sl, tl)
    if res:
        return res

    return text

class TranslateRequest(BaseModel):
    source_lang: str = "ru"
    target_langs: List[str]
    fields: Dict[str, str] # e.g. {"name": "...", "description": "...", "ingredients": "...", "serving": "..."}

class TranslateResponse(BaseModel):
    translations: Dict[str, Dict[str, str]]

@router.post("", response_model=TranslateResponse)
async def translate_content(req: TranslateRequest):
    translations: Dict[str, Dict[str, str]] = {}
    
    # Filter active non-empty fields
    active_keys = [k for k, v in req.fields.items() if v and v.strip()]
    
    for target_lang in req.target_langs:
        translations[target_lang] = {}

        if not active_keys:
            for k in req.fields:
                translations[target_lang][k] = ""
            continue

        sl = LANG_CODE_MAP.get(req.source_lang.lower(), req.source_lang.lower())
        tl = LANG_CODE_MAP.get(target_lang.lower(), target_lang.lower())

        if sl == tl:
            for k in req.fields:
                translations[target_lang][k] = req.fields.get(k, "")
            continue

        # Batch all fields with unique delimiter
        delimiter = "\n---FLDDELIM---\n"
        combined_text = delimiter.join(req.fields[k] for k in active_keys)

        translated_combined = translate_text(combined_text, req.source_lang, target_lang)

        # Split back
        parts = translated_combined.split(delimiter)
        if len(parts) == len(active_keys):
            for idx, k in enumerate(active_keys):
                translations[target_lang][k] = parts[idx].strip()
        else:
            # Fallback to individual translations if delimiter was altered
            for k in active_keys:
                translations[target_lang][k] = translate_text(req.fields[k], req.source_lang, target_lang)

        # Fill remaining empty fields
        for k in req.fields:
            if k not in translations[target_lang]:
                translations[target_lang][k] = ""

    return TranslateResponse(translations=translations)
