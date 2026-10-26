from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class TableZone(Base):
    """Зоны ресторана (Основной зал, Терраса, VIP, Барная зона)"""
    __tablename__ = "table_zones"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(64), nullable=False)  # "Основной зал", "Панорамная терраса", "VIP-комната"
    description = Column(String(256), nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    restaurant = relationship("Restaurant", back_populates="zones")
    tables = relationship("DiningTable", back_populates="zone", cascade="all, delete-orphan")


class DiningTable(Base):
    """Физический стол в заведении с вместимостью и координатами для интерактивной карты"""
    __tablename__ = "dining_tables"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey("table_zones.id", ondelete="CASCADE"), nullable=False, index=True)
    
    table_number = Column(String(16), nullable=False)  # "1", "VIP-1", "T-4"
    min_capacity = Column(Integer, default=1)           # Мин. персон
    max_capacity = Column(Integer, default=4)           # Макс. персон
    
    # Координаты для интерактивной карты рассадки (Floor Plan)
    pos_x = Column(Float, default=100.0)
    pos_y = Column(Float, default=100.0)
    shape = Column(String(16), default="square")  # "square", "round", "rectangle"
    
    is_active = Column(Boolean, default=True)

    restaurant = relationship("Restaurant", back_populates="dining_tables")
    zone = relationship("TableZone", back_populates="tables")
    reservations = relationship("TableReservation", back_populates="table")


class TableReservation(Base):
    """Карточка бронирования стола"""
    __tablename__ = "table_reservations"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(16), unique=True, index=True, nullable=False)  # "BK-7842"
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    table_id = Column(Integer, ForeignKey("dining_tables.id", ondelete="SET NULL"), nullable=True, index=True)
    zone_id = Column(Integer, ForeignKey("table_zones.id", ondelete="SET NULL"), nullable=True)

    # Данные гостя
    guest_name = Column(String(128), nullable=False)
    guest_phone = Column(String(32), nullable=False, index=True)
    guest_email = Column(String(128), nullable=True)
    guests_count = Column(Integer, nullable=False, default=2)

    # Временные рамки
    reservation_date = Column(String(10), nullable=False, index=True)  # "YYYY-MM-DD"
    start_time = Column(String(5), nullable=False)                     # "HH:MM"
    end_time = Column(String(5), nullable=False)                       # "HH:MM"
    duration_minutes = Column(Integer, default=120)

    # Статусы бронирования:
    # PENDING, CONFIRMED, SEATED, COMPLETED, CANCELLED, NO_SHOW
    status = Column(String(32), default="PENDING", index=True)
    
    source = Column(String(32), default="MOBILE_QR")  # "MOBILE_QR", "KIOSK_STREET", "PHONE_CALL", "WALK_IN"
    guest_wishes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    restaurant = relationship("Restaurant", back_populates="reservations")
    table = relationship("DiningTable", back_populates="reservations")
    zone = relationship("TableZone")
