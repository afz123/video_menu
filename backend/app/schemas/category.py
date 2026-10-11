from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime

class CategoryBase(BaseModel):
    name_translations: Dict[str, str] # {"ru": "...", "en": "...", "tj": "..."}
    icon: Optional[str] = "utensils"
    display_order: int = 0
    is_active: bool = True

class CategoryCreate(CategoryBase):
    restaurant_id: int

class CategoryUpdate(BaseModel):
    name_translations: Optional[Dict[str, str]] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class CategoryResponse(CategoryBase):
    id: int
    restaurant_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CategoryReorderItem(BaseModel):
    id: int
    display_order: int
