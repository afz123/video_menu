from sqlalchemy import Column, Integer, String, Boolean, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Localized name: {"ru": "Стейки & Гриль", "en": "Steaks & Grill", "tj": "Стейк ва Грилл"}
    name_translations = Column(JSON, nullable=False, default=dict)
    icon = Column(String(64), nullable=True, default="utensils")
    display_order = Column(Integer, default=0, index=True)
    is_active = Column(Boolean, default=True)
    
    # Dayparting & Active Hours (e.g. Breakfasts 08:00-12:00, Main Menu, Bar)
    schedule_start = Column(String(8), nullable=True) # "08:00"
    schedule_end = Column(String(8), nullable=True)   # "12:00"
    daypart = Column(String(32), default="all")       # "all", "breakfast", "main", "bar"

    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="categories")
    dishes = relationship(
        "Dish", 
        back_populates="category", 
        cascade="all, delete-orphan",
        order_by="Dish.display_order"
    )
