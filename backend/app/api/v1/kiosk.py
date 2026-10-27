from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.restaurants import find_restaurant_by_slug
from app.core.licensing import require_module, ModuleAccess

router = APIRouter(prefix="/kiosk", tags=["Kiosk"])

@router.get("/{slug}/config")
async def get_kiosk_config(slug: str, db: AsyncSession = Depends(get_db)):
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    require_module(restaurant, ModuleAccess.KIOSK)

    theme = restaurant.theme_config or {}
    kiosk_settings = theme.get("kiosk_settings", {})

    return {
        "restaurant_name": restaurant.name,
        "slug": restaurant.slug,
        "currency": restaurant.currency or "TJS",
        "theme": theme,
        "inactivity_seconds": kiosk_settings.get("inactivity_seconds", 45),
        "attract_video_url": kiosk_settings.get("attract_video_url", ""),
        "headline": kiosk_settings.get("headline", restaurant.name),
        "subheadline": kiosk_settings.get("subheadline", "Коснитесь экрана, чтобы открыть меню"),
        "show_qr_overlay": kiosk_settings.get("show_qr_overlay", True),
        "supported_locales": restaurant.supported_locales or ["ru", "en", "tj"],
        "default_locale": restaurant.default_locale or "ru"
    }
