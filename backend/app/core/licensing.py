from fastapi import HTTPException, status
from app.models.restaurant import Restaurant

class ModuleAccess:
    MENU = "menu"
    ORDERING = "ordering"
    SERVICE_DISPATCH = "service_dispatch"
    GUEST_FINANCE = "guest_finance"
    RESERVATIONS = "reservations"
    KIOSK = "kiosk"
    KDS = "kds"

DEFAULT_MODULES = [
    ModuleAccess.MENU,
    ModuleAccess.ORDERING,
    ModuleAccess.SERVICE_DISPATCH,
    ModuleAccess.GUEST_FINANCE,
    ModuleAccess.RESERVATIONS,
    ModuleAccess.KIOSK,
    ModuleAccess.KDS
]

MODULE_TITLES = {
    ModuleAccess.MENU: "Digital Video Menu",
    ModuleAccess.ORDERING: "Smart Table Ordering",
    ModuleAccess.SERVICE_DISPATCH: "Staff Dispatcher & Telegram",
    ModuleAccess.GUEST_FINANCE: "Fintech Split-Bill & Tips",
    ModuleAccess.RESERVATIONS: "Spatial Booking & 3D Floor",
    ModuleAccess.KIOSK: "Outdoor Smart Showcase (Kiosk)",
    ModuleAccess.KDS: "Kitchen Display System (KDS)"
}

def require_module(restaurant: Restaurant, module_name: str):
    """
    Проверяет, оплачен/включен ли данный коммерческий модуль у заведения.
    Если нет — жестко прерывает выполнение с 403 Forbidden.
    """
    modules = restaurant.enabled_modules
    if modules is None:
        modules = DEFAULT_MODULES

    if module_name not in modules:
        title = MODULE_TITLES.get(module_name, module_name)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Модуль '{title}' не активирован в тарифном плане данного заведения."
        )
