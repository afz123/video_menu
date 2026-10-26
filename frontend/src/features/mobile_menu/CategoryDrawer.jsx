import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useUI } from '../../context/UIConfigContext';
import { X, Check, Utensils, Layers, Calendar } from 'lucide-react';

export const CategoryDrawer = ({
  isOpen,
  onClose,
  categories,
  activeCategoryId,
  onSelectCategory,
  onOpenBooking
}) => {
  const { t } = useLanguage();
  const ui = useUI();
  const header = ui?.header || {};


  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease forwards'
      }}
      onClick={onClose}
    >
      {/* Bottom Sheet Box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '80vh',
          backgroundColor: '#121218',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          borderTop: '1px solid var(--glass-border)',
          padding: '20px 20px calc(24px + env(safe-area-inset-bottom)) 20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
          animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Grab Handle */}
        <div
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            margin: '0 auto 16px'
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            paddingBottom: '14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Layers size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                Разделы меню
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Всего {categories.length} категорий
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Categories List */}
        <div
          style={{
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingRight: '4px'
          }}
        >
          {categories.map((cat, idx) => {
            const isActive = cat.id === activeCategoryId;
            const dishCount = cat.dishes?.length || 0;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  backgroundColor: isActive
                    ? 'rgba(212, 175, 55, 0.15)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isActive
                    ? '1px solid var(--accent-gold)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  color: isActive ? 'var(--accent-gold-light)' : 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: isActive ? 'var(--accent-gold)' : 'var(--text-dim)',
                      width: '20px'
                    }}
                  >
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: isActive ? '700' : '500' }}>
                      {t(cat.name)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {dishCount} {dishCount === 1 ? 'позиция' : dishCount < 5 ? 'позиции' : 'позиций'}
                    </div>
                  </div>
                </div>

                {isActive && (
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#09090b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Table Reservation Button */}
        {header.show_table_booking_btn !== false && onOpenBooking && (
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBooking();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'var(--accent-gold-gradient)',
                border: 'none',
                borderRadius: '14px',
                padding: '13px 16px',
                color: '#000',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)'
              }}
            >
              <Calendar size={16} />
              <span>Забронировать стол онлайн</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
