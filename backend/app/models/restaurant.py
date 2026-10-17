from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, Text, Float, desc
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base
from app.models.service_request import ServiceRequest

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(64), unique=True, index=True, nullable=False)
    # Historic slugs for preserving QR code redirections
    old_slugs = Column(JSON, default=list)
    
    name = Column(String(128), nullable=False)
    tagline = Column(String(256), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Restaurant Economics & Hospitality settings
    currency = Column(String(8), default="TJS")
    service_charge_percent = Column(Float, default=10.0) # Standard 10-15% in Central Asia / Luxury Dining
    admin_password_hash = Column(String(256), nullable=True) # Per-tenant hashed manager credentials
    
    # Enabled Staff Call types: ["waiter", "bill", "sommelier", "hookah", "admin"]
    call_types_enabled = Column(JSON, default=lambda: ["waiter", "bill", "sommelier", "hookah", "admin"])

    # Staff Telegram Bot integration for live waiter calls and bills
    telegram_bot_token = Column(String(128), nullable=True)
    telegram_chat_id = Column(String(64), nullable=True)
    telegram_enabled = Column(Boolean, default=False)

    # Dynamic styling per restaurant
    theme_config = Column(JSON, default=lambda: {
        "theme_id": "luxury_dark_gold",
        "colors": {
            "background": "#09090b",
            "surface": "rgba(18, 18, 22, 0.70)",
            "primary_accent": "#d4af37",
            "secondary_accent": "#f59e0b",
            "text_primary": "#f8fafc",
            "text_secondary": "#94a3b8",
            "border_glow": "rgba(212, 175, 55, 0.25)"
        },
        "typography": {
            "font_title": "'Cormorant Garamond', serif",
            "font_body": "'Plus Jakarta Sans', sans-serif"
        },
        "kiosk_settings": {
            "inactivity_seconds": 45,
            "attract_video_url": "",
            "show_qr_overlay": True,
            "headline": "A Culinary Odyssey",
            "subheadline": "Коснитесь экрана, чтобы открыть меню"
        }
    })

    # Multi-language configuration: ["ru", "en", "tj"]
    supported_locales = Column(JSON, default=lambda: ["ru", "en", "tj"])
    default_locale = Column(String(8), default="ru")

    categories = relationship(
        "Category", 
        back_populates="restaurant", 
        cascade="all, delete-orphan",
        order_by="Category.display_order"
    )
    dishes = relationship(
        "Dish", 
        back_populates="restaurant", 
        cascade="all, delete-orphan"
    )
    service_requests = relationship(
        "ServiceRequest",
        back_populates="restaurant",
        cascade="all, delete-orphan",
        order_by=lambda: desc(ServiceRequest.created_at)
    )
