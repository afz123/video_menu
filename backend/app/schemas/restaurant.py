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
    currency: Optional[str] = "TJS"
    service_charge_percent: Optional[float] = 10.0
    call_types_enabled: Optional[List[str]] = ["waiter", "bill", "sommelier", "hookah", "admin"]
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: Optional[bool] = False
    enabled_modules: Optional[List[str]] = [
        "menu", "ordering", "service_dispatch", "guest_finance", "reservations", "kiosk", "kds"
    ]
    ui_config: Optional[Dict[str, Any]] = None

class RestaurantCreate(RestaurantBase):
    admin_password: Optional[str] = None

class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    supported_locales: Optional[List[str]] = None
    default_locale: Optional[str] = None
    theme_config: Optional[Dict[str, Any]] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None
    service_charge_percent: Optional[float] = None
    call_types_enabled: Optional[List[str]] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: Optional[bool] = None
    enabled_modules: Optional[List[str]] = None
    admin_password: Optional[str] = None
    ui_config: Optional[Dict[str, Any]] = None

class RestaurantResponse(RestaurantBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
