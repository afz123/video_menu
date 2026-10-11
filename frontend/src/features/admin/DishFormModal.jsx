import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { VideoDropzone } from './VideoDropzone';
import { menuService } from '../../services/menuService';
import { X, Check } from 'lucide-react';

export const DishFormModal = ({
  restaurantId,
  categories,
  dishToEdit = null,
  onClose,
  onSaved
}) => {
  const [formData, setFormData] = useState({
    name_ru: dishToEdit?.name?.ru || '',
    name_en: dishToEdit?.name?.en || '',
    name_tj: dishToEdit?.name?.tj || '',
    desc_ru: dishToEdit?.description?.ru || '',
    desc_en: dishToEdit?.description?.en || '',
    desc_tj: dishToEdit?.description?.tj || '',
    price: dishToEdit?.price || '',
    currency: dishToEdit?.currency || 'TJS',
    weight_info: dishToEdit?.weight || '350 г',
    calories_info: dishToEdit?.calories || '500 ккал',
    category_id: dishToEdit?.category_id || categories[0]?.id || '',
    media_id: dishToEdit?.media?.id || null,
    is_available: dishToEdit ? dishToEdit.is_available : true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name_ru) {
      setError('Пожалуйста, введите название блюда (RU)');
      return;
    }
    if (!formData.price) {
      setError('Пожалуйста, укажите цену');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      restaurant_id: restaurantId,
      category_id: parseInt(formData.category_id, 10),
      name_translations: {
        ru: formData.name_ru,
        en: formData.name_en || formData.name_ru,
        tj: formData.name_tj || formData.name_ru
      },
      description_translations: {
        ru: formData.desc_ru,
        en: formData.desc_en,
        tj: formData.desc_tj
      },
      price: parseFloat(formData.price),
      currency: formData.currency,
      weight_info: formData.weight_info,
      calories_info: formData.calories_info,
      media_id: formData.media_id,
      is_available: formData.is_available
    };

    try {
      if (dishToEdit) {
        await menuService.updateDish(dishToEdit.id, payload);
      } else {
        await menuService.createDish(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <GlassCard style={{ padding: '36px', position: 'relative' }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>

          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '32px',
              color: 'var(--text-main)',
              marginBottom: '24px'
            }}
          >
            {dishToEdit ? 'Редактировать блюдо' : 'Добавить позицию в меню'}
          </h2>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                marginBottom: '20px'
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Step 1: Video */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--accent-gold)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Видео блюда (9:16)
              </label>
              <VideoDropzone
                currentMediaId={formData.media_id}
                onMediaReady={(id) => setFormData((prev) => ({ ...prev, media_id: id }))}
              />
            </div>

            {/* Step 2: Names & Category */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--accent-gold)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                2. Название блюда & Категория
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Название (Русский) *"
                  required
                  value={formData.name_ru}
                  onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
                  style={{
                    backgroundColor: 'rgba(10, 10, 14, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Title (English)"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(10, 10, 14, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Ном (Тоҷикӣ)"
                    value={formData.name_tj}
                    onChange={(e) => setFormData({ ...formData, name_tj: e.target.value })}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(10, 10, 14, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  style={{
                    backgroundColor: 'rgba(10, 10, 14, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: '#121218' }}>
                      {c.name?.ru || c.name?.en || 'Категория'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 3: Pricing and Weight */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--accent-gold)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                3. Стоимость и характеристики
              </label>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Цена *"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(10, 10, 14, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />

                <input
                  type="text"
                  placeholder="Валюта (TJS)"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  style={{
                    width: '90px',
                    backgroundColor: 'rgba(10, 10, 14, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontSize: '14px',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />

                <input
                  type="text"
                  placeholder="Вес (напр. 350 г)"
                  value={formData.weight_info}
                  onChange={(e) => setFormData({ ...formData, weight_info: e.target.value })}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(10, 10, 14, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <textarea
                placeholder="Краткое описание / ингредиенты / подача..."
                rows={3}
                value={formData.desc_ru}
                onChange={(e) => setFormData({ ...formData, desc_ru: e.target.value })}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(10, 10, 14, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <GoldButton variant="ghost" onClick={onClose}>
                Отмена
              </GoldButton>
              <GoldButton type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Сохранение...' : (dishToEdit ? 'Обновить' : 'Опубликовать позицию')}
              </GoldButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
