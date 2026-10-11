import React, { useState, useRef, useEffect } from 'react';
import { MobileHeader } from './MobileHeader';
import { DishSlide } from './DishSlide';
import { useLanguage } from '../../context/LanguageContext';
import { useVideoPreload } from '../../hooks/useVideoPreload';

export const MobileFeed = ({ restaurantData }) => {
  const categories = restaurantData.categories || [];
  const [activeCategoryId, setActiveCategoryId] = useState(() => categories[0]?.id || 1);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const containerRef = useRef(null);
  const { t } = useLanguage();

  // Active category & dishes
  const activeCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];
  const dishes = activeCategory ? activeCategory.dishes : [];

  // Preload next video in feed
  const nextVideo = dishes[currentSlideIndex + 1]?.media?.video_mobile;
  useVideoPreload([nextVideo]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = window.innerHeight;
    const index = Math.round(scrollTop / height);
    if (index !== currentSlideIndex && index >= 0 && index < dishes.length) {
      setCurrentSlideIndex(index);
    }
  };

  const handleSelectCategory = (catId) => {
    setActiveCategoryId(catId);
    setCurrentSlideIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        backgroundColor: '#09090b'
      }}
    >
      {/* Unified Luxury Mobile Header (Brand + Menu Drawer + Language Drawer + Category Carousel) */}
      <MobileHeader
        restaurantName={restaurantData.restaurant?.name || 'ASR Maison Royale'}
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* Vertical Reels Container */}
      {dishes.length > 0 ? (
        <div
          ref={containerRef}
          className="reels-container"
          onScroll={handleScroll}
        >
          {dishes.map((dish, idx) => (
            <section key={dish.id} className="reel-slide">
              <DishSlide
                dish={dish}
                isCurrent={idx === currentSlideIndex}
                categoryName={t(activeCategory.name)}
              />
            </section>
          ))}
        </div>
      ) : (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            padding: '24px',
            textAlign: 'center'
          }}
        >
          <p style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '8px' }}>
            В этой категории пока нет блюд
          </p>
          <p style={{ fontSize: '14px' }}>
            Пожалуйста, выберите другой раздел в верхнем меню
          </p>
        </div>
      )}

      {/* Slide counter pill & dots indicator on the right */}
      {dishes.length > 1 && (
        <div
          style={{
            position: 'fixed',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 35,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'none'
          }}
        >
          {/* Subtle numeric badge */}
          <div
            style={{
              fontSize: '10px',
              fontWeight: '700',
              color: 'var(--accent-gold)',
              backgroundColor: 'rgba(9, 9, 11, 0.75)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '8px',
              padding: '2px 5px',
              marginBottom: '4px',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            {currentSlideIndex + 1}/{dishes.length}
          </div>

          {/* Dots */}
          {dishes.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '4px',
                height: idx === currentSlideIndex ? '20px' : '4px',
                borderRadius: '4px',
                backgroundColor:
                  idx === currentSlideIndex
                    ? 'var(--accent-gold)'
                    : 'rgba(255, 255, 255, 0.3)',
                boxShadow:
                  idx === currentSlideIndex
                    ? '0 0 8px rgba(212, 175, 55, 0.6)'
                    : 'none',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
