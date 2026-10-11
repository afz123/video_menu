from fastapi import APIRouter
from app.api.v1.restaurants import router as restaurants_router
from app.api.v1.categories import router as categories_router
from app.api.v1.dishes import router as dishes_router
from app.api.v1.media import router as media_router
from app.api.v1.kiosk import router as kiosk_router

api_router = APIRouter()
api_router.include_router(restaurants_router)
api_router.include_router(categories_router)
api_router.include_router(dishes_router)
api_router.include_router(media_router)
api_router.include_router(kiosk_router)
