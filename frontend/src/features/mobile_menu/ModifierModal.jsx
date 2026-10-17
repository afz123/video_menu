import React, { useState, useMemo } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { useLanguage } from '../../context/LanguageContext';
import { X, Check, Plus, AlertCircle } from 'lucide-react';

export const ModifierModal = ({ dish, onClose, onAddToCart }) => {
  const { t } = useLanguage();
  const dishName = t(dish.name);
  const basePrice = Number(dish.price) || 0;
  const modifiers = dish.modifiers || [];

  // Initialize selections:
  // For 'single' choice: pre-select first option (or required default)
  // For 'multiple' choice: empty array
  const [selections, setSelections] = useState(() => {
    const initial = {};
    modifiers.forEach((group) => {
      if (group.type === 'single') {
        initial[group.id] = group.options?.[0]?.name || '';
      } else {
        initial[group.id] = [];
      }
    });
    return initial;
  });

  const [comment, setComment] = useState('');

  // Calculate live total price with selected modifiers
  const totalPrice = useMemo(() => {
    let extra = 0;
    modifiers.forEach((group) => {
      const selected = selections[group.id];
      if (group.type === 'single') {
        const opt = group.options?.find((o) => o.name === selected);
        if (opt && opt.price) extra += Number(opt.price);
      } else if (Array.isArray(selected)) {
        selected.forEach((optName) => {
          const opt = group.options?.find((o) => o.name === optName);
          if (opt && opt.price) extra += Number(opt.price);
        });
      }
    });
    return basePrice + extra;
  }, [basePrice, modifiers, selections]);

  const handleSingleSelect = (groupId, optName) => {
    setSelections((prev) => ({ ...prev, [groupId]: optName }));
  };

  const handleMultipleToggle = (groupId, optName) => {
    setSelections((prev) => {
      const currentList = prev[groupId] || [];
      const exists = currentList.includes(optName);
      const updated = exists
        ? currentList.filter((n) => n !== optName)
        : [...currentList, optName];
      return { ...prev, [groupId]: updated };
    });
  };

  const handleConfirm = () => {
    // Build descriptive list of selected options
    const chosenOptions = [];
    modifiers.forEach((group) => {
      const val = selections[group.id];
      if (group.type === 'single' && val) {
        const opt = group.options?.find((o) => o.name === val);
        chosenOptions.push({
          group: group.name,
          name: val,
          price: opt?.price || 0
        });
      } else if (Array.isArray(val) && val.length > 0) {
        val.forEach((optName) => {
          const opt = group.options?.find((o) => o.name === optName);
          chosenOptions.push({
            group: group.name,
            name: optName,
            price: opt?.price || 0
          });
        });
      }
    });

    onAddToCart({
      dish,
      totalPrice,
      chosenOptions,
      comment: comment.trim()
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '85vh',
          backgroundColor: '#121217',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderBottom: 'none',
          padding: '22px 20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.85)',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>
              Параметры приготовления
            </span>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#fff', margin: '2px 0 0 0' }}>
              {dishName}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modifier groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '20px' }}>
          {modifiers.map((group) => {
            const isSingle = group.type === 'single';
            const selectedVal = selections[group.id];

            return (
              <div key={group.id} style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    {group.name}
                  </span>
                  <span style={{ fontSize: '11px', color: group.required ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                    {group.required ? 'Обязательно' : 'Опционально'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.options?.map((opt, idx) => {
                    const isChecked = isSingle
                      ? selectedVal === opt.name
                      : Array.isArray(selectedVal) && selectedVal.includes(opt.name);

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isSingle) {
                            handleSingleSelect(group.id, opt.name);
                          } else {
                            handleMultipleToggle(group.id, opt.name);
                          }
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          backgroundColor: isChecked ? 'rgba(212, 175, 55, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                          border: isChecked ? '1px solid rgba(212, 175, 55, 0.45)' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: isSingle ? '50%' : '5px',
                              border: isChecked ? '2px solid var(--accent-gold)' : '2px solid rgba(255, 255, 255, 0.3)',
                              backgroundColor: isChecked ? 'var(--accent-gold)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#000',
                              flexShrink: 0
                            }}
                          >
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span style={{ fontSize: '13px', color: isChecked ? '#fff' : 'rgba(255, 255, 255, 0.85)', fontWeight: isChecked ? '600' : '400' }}>
                            {opt.name}
                          </span>
                        </div>

                        {opt.price > 0 && (
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                            +{opt.price} {dish.currency}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special instructions comment */}
          {/* Chef / Sommelier Pairing Recommendation Cross-Sell */}
          {dish.pairings && dish.pairings.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '20px' }}>🍷</span>
              <div style={{ fontSize: '12px', color: '#fff', lineHeight: '1.4' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: '700', textTransform: 'uppercase', fontSize: '10px', display: 'block', letterSpacing: '0.06em' }}>
                  Идеальная пара к блюду
                </span>
                <span>{dish.pairings[0].text || dish.pairings[0].dish_name || 'Бокал выдержанного вина'}</span>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Пожелание повару / официанту (опционально):
            </label>
            <input
              type="text"
              placeholder="Например: без кинзы / соус отдельно"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Footer Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingTop: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Итого за блюдо:</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-gold)' }}>
              {totalPrice} <span style={{ fontSize: '14px' }}>{dish.currency}</span>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              background: 'var(--accent-gold-gradient)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 20px',
              color: '#09090b',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(212, 175, 55, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Добавить в заказ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
