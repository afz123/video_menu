from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from datetime import datetime
from app.models.base import Base

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), default="manager") # superadmin, manager, hostess, waiter, chef
    permissions = Column(JSON, default=lambda: ["view_menu", "toggle_stop_list", "resolve_requests"])
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

