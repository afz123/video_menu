from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

class ThemeColors(BaseModel):
    background: str = "#09090b"
    surface: str = "rgba(18, 18, 22, 0.70)"
    primary_accent: str = "#d4af37"
    secondary_accent: str = "#f59e0b"
    text_primary: str = "#f8fafc"
    text_secondary: str = "#94a3b8"
    border_glow: str = "rgba(212, 175, 55, 0.25)"

class ThemeTypography(BaseModel):
    font_title: str = "'Cormorant Garamond', serif"
    font_body: str = "'Plus Jakarta Sans', sans-serif"

class KioskSettings(BaseModel):
    inactivity_seconds: int = 45
    attract_video_url: Optional[str] = ""
    show_qr_overlay: bool = True
    headline: str = "A Culinary Odyssey"
    subheadline: str = "Коснитесь экрана, чтобы открыть меню"

class RestaurantThemeConfig(BaseModel):
    theme_id: str = "luxury_dark_gold"
    colors: ThemeColors = Field(default_factory=ThemeColors)
    typography: ThemeTypography = Field(default_factory=ThemeTypography)
    kiosk_settings: KioskSettings = Field(default_factory=KioskSettings)
