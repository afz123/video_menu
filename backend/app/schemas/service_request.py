from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class ServiceRequestCreate(BaseModel):
    table_number: str
    table_token: Optional[str] = None # HMAC-SHA256 signature from QR code
    guest_session_id: Optional[str] = None
    request_type: str # "call_waiter", "request_bill_cash", "request_bill_card", "order", "repeat_order"
    guest_comment: Optional[str] = None
    cart_items: Optional[List[Any]] = []
    nps_score: Optional[int] = None
    split_type: Optional[str] = None
    tip_percent: Optional[float] = None
    tip_amount: Optional[float] = None

class ServiceRequestStatusUpdate(BaseModel):
    status: str # "COMPLETED", "CANCELLED", "PENDING", "ACKNOWLEDGED"
    acknowledged_by: Optional[str] = None

class ServiceRequestResponse(BaseModel):
    id: int
    restaurant_id: int
    table_number: str
    request_type: str
    guest_session_id: Optional[str] = None
    guest_comment: Optional[str] = None
    cart_items: Optional[List[Any]] = []
    subtotal_amount: Optional[float] = 0.0
    service_charge_amount: Optional[float] = 0.0
    total_amount: Optional[float] = 0.0
    currency: Optional[str] = "TJS"
    nps_score: Optional[int] = None
    status: str
    acknowledged_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
