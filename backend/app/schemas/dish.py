from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime

class DishMediaResponse(BaseModel):
    id: int
    status: str
    lqip: Optional[str] = None
    poster: Optional[str] = None
    video_mobile: Optional[str] = None
    video_kiosk: Optional[str] = None
    duration_seconds: Optional[int] = 0

class DishBase(BaseModel):
    name_translations: Dict[str, Any]
    description_translations: Optional[Dict[str, Any]] = None
    weight_info: Optional[str] = None
    calories_info: Optional[str] = None
    allergens: Optional[List[str]] = []
    price: float
    currency: str = "TJS"
    is_available: bool = True
    is_featured: bool = False
    display_order: int = 0
    category_id: int

class DishCreate(DishBase):
    restaurant_id: int
    media_id: Optional[int] = None

class DishUpdate(BaseModel):
    name_translations: Optional[Dict[str, Any]] = None
    description_translations: Optional[Dict[str, Any]] = None
    weight_info: Optional[str] = None
    calories_info: Optional[str] = None
    allergens: Optional[List[str]] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    is_available: Optional[bool] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None
    category_id: Optional[int] = None
    media_id: Optional[int] = None

class DishResponse(DishBase):
    id: int
    restaurant_id: int
    media_id: Optional[int] = None
    media: Optional[DishMediaResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DishReorderItem(BaseModel):
    id: int
    display_order: int
