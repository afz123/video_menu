from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class ServiceRequestCreate(BaseModel):
    table_number: str
    request_type: str # "call_waiter", "request_bill_cash", "request_bill_card", "order"
    guest_comment: Optional[str] = None
    cart_items: Optional[List[Any]] = []

class ServiceRequestStatusUpdate(BaseModel):
    status: str # "COMPLETED", "CANCELLED", "PENDING"

class ServiceRequestResponse(BaseModel):
    id: int
    restaurant_id: int
    table_number: str
    request_type: str
    guest_comment: Optional[str] = None
    cart_items: Optional[List[Any]] = []
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
