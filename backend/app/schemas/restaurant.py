from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime

class RestaurantBase(BaseModel):
    name: str
    slug: str
    old_slugs: Optional[List[str]] = []
    tagline: Optional[str] = None
    description: Optional[str] = None
    supported_locales: List[str] = ["ru", "en", "tj"]
    default_locale: str = "ru"
    theme_config: Optional[Dict[str, Any]] = None
    service_charge_percent: Optional[float] = 10.0
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: Optional[bool] = False

class RestaurantCreate(RestaurantBase):
    pass

class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    supported_locales: Optional[List[str]] = None
    default_locale: Optional[str] = None
    theme_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    service_charge_percent: Optional[float] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: Optional[bool] = None

class RestaurantResponse(RestaurantBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
