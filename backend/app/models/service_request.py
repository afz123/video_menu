from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    table_number = Column(String(32), nullable=False, index=True)
    request_type = Column(String(32), nullable=False) # call_waiter, bill_card, bill_cash, order, repeat_order
    
    # Anti-spoofing and session tracking
    guest_session_id = Column(String(64), nullable=True, index=True)
    table_signature = Column(String(64), nullable=True)
    
    guest_comment = Column(Text, nullable=True)
    cart_items = Column(JSON, default=list) # Items specification with modifiers and courses
    subtotal_amount = Column(Float, default=0.0)
    service_charge_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    currency = Column(String(8), default="TJS")
    
    nps_score = Column(Integer, nullable=True) # Guest NPS score 1-5
    status = Column(String(32), default="PENDING", index=True) # PENDING, ACKNOWLEDGED, COMPLETED, CANCELLED
    acknowledged_by = Column(String(64), nullable=True) # Staff member name who took the request
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    restaurant = relationship("Restaurant", back_populates="service_requests")
