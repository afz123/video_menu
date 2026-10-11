from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(32), default="PROCESSING", index=True) # PROCESSING, READY, FAILED
    error_message = Column(String(512), nullable=True)

    original_filename = Column(String(256), nullable=True)
    original_url = Column(String(512), nullable=False)
    
    # Transcoded video versions
    video_mobile_url = Column(String(512), nullable=True) # MP4 H.264 (720x1280) FastStart ~1-1.5MB
    video_kiosk_url = Column(String(512), nullable=True)  # MP4/WebM (1080x1920) High Definition
    poster_hd_url = Column(String(512), nullable=True)     # WebP 1080x1920 ~50KB
    poster_lqip_url = Column(String(512), nullable=True)   # Micro WebP 320x568 blur LQIP ~8KB
    
    duration_seconds = Column(Integer, default=0)
    file_size_bytes = Column(BigInteger, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    dish = relationship("Dish", back_populates="media", uselist=False)
