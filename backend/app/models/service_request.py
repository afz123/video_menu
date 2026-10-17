from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    table_number = Column(String(32), nullable=False, index=True)
    request_type = Column(String(32), nullable=False) # "call_waiter", "request_bill_cash", "request_bill_card", "order"
    guest_comment = Column(Text, nullable=True)
    cart_items = Column(JSON, default=list) # optional list of items ordered
    status = Column(String(32), default="PENDING", index=True) # "PENDING", "COMPLETED", "CANCELLED"
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    restaurant = relationship("Restaurant", back_populates="service_requests")
