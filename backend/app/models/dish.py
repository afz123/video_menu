from sqlalchemy import Column, Integer, String, Boolean, Numeric, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)

    # Multi-language fields: {"ru": "Филе-миньон с трюфелем", "en": "Truffle Filet Mignon", "tj": "Филе-минйон бо трюфел"}
    name_translations = Column(JSON, nullable=False, default=dict)
    description_translations = Column(JSON, default=dict)
    
    weight_info = Column(String(64), nullable=True) # "350 г"
    calories_info = Column(String(64), nullable=True) # "520 ккал"
    allergens = Column(JSON, default=list) # ["лактоза", "орехи"]
    
    # Dynamic badges: e.g. ["Хит", "Острое 🌶️", "Выбор Шефа", "NEW"]
    badges = Column(JSON, default=list)
    
    # Modifiers & options: e.g. degrees of doneness, sauces, additions
    modifiers = Column(JSON, default=list)
    
    # Food pairings & sommelier recommendations
    pairings = Column(JSON, default=list)
    
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(8), default="TJS")
    
    # 1-tap stop-list toggle
    is_available = Column(Boolean, default=True, index=True)
    is_featured = Column(Boolean, default=False)
    display_order = Column(Integer, default=0, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Video & poster asset relationship
    media_id = Column(Integer, ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True)
    media = relationship("MediaAsset", back_populates="dish", uselist=False)

    restaurant = relationship("Restaurant", back_populates="dishes")
    category = relationship("Category", back_populates="dishes")
