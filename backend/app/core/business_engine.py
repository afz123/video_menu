import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("video_menu.engine")
CONFIG_PATH = Path(__file__).parent / "business_engine_config.json"

def get_default_engine_config() -> Dict[str, Any]:
    try:
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading business_engine_config.json: {e}")
    return {}

def resolve_restaurant_engine_config(restaurant_theme: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    defaults = get_default_engine_config()
    if not restaurant_theme or not isinstance(restaurant_theme, dict):
        return defaults
    
    custom_engine = restaurant_theme.get("business_engine", {})
    if not custom_engine or not isinstance(custom_engine, dict):
        return defaults
    
    # Deep merge top-level keys
    merged = dict(defaults)
    merged.update(custom_engine)
    return merged
