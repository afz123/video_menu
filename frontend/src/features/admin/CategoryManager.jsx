import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { menuService } from '../../services/menuService';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Utensils,
  Eye,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  FolderPlus,
  Sparkles
} from 'lucide-react';

const ICON_PRESETS = [
  { id: 'utensils', label: '🍽️ Основное', emoji: '🍽️' },
  { id: 'flame', label: '🥩 Гриль & Стейки', emoji: '🥩' },
  { id: 'salad', label: '🥗 Закуски & Салаты', emoji: '🥗' },
  { id: 'soup', label: '🍲 Супы & Бульоны', emoji: '🍲' },
  { id: 'pizza', label: '🍕 Пицца & Паста', emoji: '🍕' },
  { id: 'fish', label: '🍣 Морепродукты', emoji: '🍣' },
  { id: 'cake', label: '🍰 Десерты & Выпечка', emoji: '🍰' },
  { id: 'wine', label: '🍸 Бар & Коктейли', emoji: '🍸' },
  { id: 'coffee', label: '☕ Кофе & Чай', emoji: '☕' },
  { id: 'sparkles', label: '✨ Шеф-меню', emoji: '✨' }
];

export const CategoryManager = ({
  restaurantId,
  categories = [],
  onCategoriesChanged,
  onAddDishToCategory,
  onViewDishesOfCategory
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const [formData, setFormData] = useState({
    name_ru: '',
    name_en: '',
    name_tj: '',
    icon: 'utensils',
    display_order: 0,
    is_active: true
  });

  const handleAutoTranslateCategory = async () => {
    if (!formData.name_ru.trim()) {
      setError('Сначала введите название раздела на русском');
      return;
    }
    setIsTranslating(true);
    setError(null);
    try {
      const res = await menuService.translateTexts({
        source_lang: 'ru',
        target_langs: ['en', 'tj'],
        fields: { name: formData.name_ru.trim() }
      });
      setFormData((prev) => ({
        ...prev,
        name_en: res.translations?.en?.name || prev.name_en,
        name_tj: res.translations?.tj?.name || prev.name_tj
      }));
    } catch (err) {
      console.error(err);
      setError('Ошибка автоперевода: ' + (err.message || 'Сбой сервиса'));
    } finally {
      setIsTranslating(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name_ru: '',
      name_en: '',
      name_tj: '',
      icon: 'utensils',
      display_order: categories.length + 1,
      is_active: true
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name_ru: cat.name?.ru || '',
      name_en: cat.name?.en || '',
      name_tj: cat.name?.tj || '',
      icon: cat.icon || 'utensils',
      display_order: cat.display_order ?? 0,
      is_active: cat.is_active ?? true
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name_ru.trim()) {
      setError('Укажите название раздела на русском языке');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      restaurant_id: restaurantId,
      name_translations: {
        ru: formData.name_ru.trim(),
        en: formData.name_en.trim() || formData.name_ru.trim(),
        tj: formData.name_tj.trim() || formData.name_ru.trim()
      },
      icon: formData.icon,
      display_order: parseInt(formData.display_order, 10) || 0,
      is_active: formData.is_active
    };

    try {
      if (editingCategory) {
        await menuService.updateCategory(editingCategory.id, payload);
      } else {
        await menuService.createCategory(payload);
      }
      setIsModalOpen(false);
      onCategoriesChanged();
    } catch (err) {
      console.error('Category save error:', err);
      setError(err.message || 'Ошибка сохранения раздела');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    const dishCount = category.dishes?.length || 0;
    const confirmMsg = dishCount > 0
      ? `В разделе «${category.name?.ru}» находится ${dishCount} блюд. При удалении раздела блюда также будут удалены. Вы уверены?`
      : `Удалить раздел «${category.name?.ru}»?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await menuService.deleteCategory(category.id);
      onCategoriesChanged();
    } catch (err) {
      alert('Ошибка при удалении: ' + err.message);
    }
  };

  const handleToggleActive = async (category) => {
    try {
      await menuService.updateCategory(category.id, {
        is_active: !category.is_active
      });
      onCategoriesChanged();
    } catch (err) {
      alert('Ошибка изменения статуса: ' + err.message);
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const newCategories = [...categories];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;

    // Swap
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    const reorderPayload = newCategories.map((c, idx) => ({
      id: c.id,
      display_order: idx + 1
    }));

    try {
      await menuService.reorderCategories(reorderPayload);
      onCategoriesChanged();
    } catch (err) {
      alert('Ошибка изменения порядка: ' + err.message);
    }
  };

  return (
    <div>
      {/* Top Banner & Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={22} style={{ color: 'var(--accent-gold)' }} />
            <span>Разделы меню ({categories.length})</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Сначала создайте структуру разделов (кухня, бар, десерты), затем добавляйте в них позиции с видео.
          </p>
        </div>

        <GoldButton
          variant="primary"
          size="sm"
          icon={FolderPlus}
          onClick={openCreateModal}
        >
          Создать новый раздел
        </GoldButton>
      </div>

      {/* Empty State */}
      {categories.length === 0 ? (
        <GlassCard
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)'
            }}
          >
            <FolderPlus size={32} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#fff' }}>
            В меню пока нет разделов
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', fontSize: '14px' }}>
            Чтобы добавить блюда, сначала создайте хотя бы один раздел (например: «Фирменные стейки», «Холодные закуски» или «Бар»).
          </p>
          <GoldButton
            variant="primary"
            size="md"
            icon={Plus}
            onClick={openCreateModal}
          >
            Создать первый раздел
          </GoldButton>
        </GlassCard>
      ) : (
        /* Categories Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px'
          }}
        >
          {categories.map((category, index) => {
            const dishCount = category.dishes?.length || 0;
            const preset = ICON_PRESETS.find((p) => p.id === category.icon);
            const emoji = preset ? preset.emoji : '🍽️';

            return (
              <GlassCard
                key={category.id}
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '20px',
                  border: category.is_active === false ? '1px dashed rgba(239, 68, 68, 0.4)' : undefined,
                  opacity: category.is_active === false ? 0.75 : 1,
                  position: 'relative'
                }}
              >
                {/* Header: Icon, Name, Reorder Buttons */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(212, 175, 55, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '22px'
                        }}
                      >
                        {emoji}
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: '#fff' }}>
                          {category.name?.ru || 'Без названия'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {category.name?.en || '—'} {category.name?.tj ? `• ${category.name.tj}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Order buttons */}
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '2px' }}>
                      <button
                        title="Поднять выше"
                        disabled={index === 0}
                        onClick={() => handleMoveOrder(index, -1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: index === 0 ? 'rgba(255,255,255,0.2)' : 'var(--text-main)',
                          padding: '6px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          borderRadius: '6px'
                        }}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        title="Опустить ниже"
                        disabled={index === categories.length - 1}
                        onClick={() => handleMoveOrder(index, 1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: index === categories.length - 1 ? 'rgba(255,255,255,0.2)' : 'var(--text-main)',
                          padding: '6px',
                          cursor: index === categories.length - 1 ? 'not-allowed' : 'pointer',
                          borderRadius: '6px'
                        }}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Status & Stats Pills */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        backgroundColor: dishCount > 0 ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                        color: dishCount > 0 ? 'var(--accent-gold)' : 'var(--text-muted)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Utensils size={12} />
                      {dishCount} {dishCount === 1 ? 'блюдо' : dishCount > 1 && dishCount < 5 ? 'блюда' : 'блюд'}
                    </span>

                    <button
                      onClick={() => handleToggleActive(category)}
                      title="Кликните, чтобы скрыть или показать раздел в меню"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: category.is_active !== false ? '#4ade80' : '#f87171',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      {category.is_active !== false ? (
                        <>
                          <ToggleRight size={18} />
                          <span>Активен в меню</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={18} />
                          <span>Скрыт</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions Footer */}
                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingTop: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Add Dish directly to this category */}
                    <button
                      onClick={() => onAddDishToCategory(category.id)}
                      style={{
                        backgroundColor: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: 'var(--accent-gold)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Plus size={14} />
                      <span>Добавить блюдо</span>
                    </button>

                    {/* View Dishes in this category */}
                    <button
                      onClick={() => onViewDishesOfCategory(category.id)}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Eye size={14} />
                      <span>Смотреть ({dishCount})</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      title="Редактировать раздел"
                      onClick={() => openEditModal(category)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        padding: '6px',
                        cursor: 'pointer',
                        borderRadius: '6px'
                      }}
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      title="Удалить раздел"
                      onClick={() => handleDelete(category)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f87171',
                        padding: '6px',
                        cursor: 'pointer',
                        borderRadius: '6px'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Category */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '520px' }}
          >
            <GlassCard style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={20} style={{ color: 'var(--accent-gold)' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#fff', margin: 0 }}>
                    {editingCategory ? 'Редактировать раздел' : 'Новый раздел меню'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#f87171',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Russian Name */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--accent-gold)', fontWeight: '600' }}>
                      Название раздела (Русский) *
                    </label>
                    <button
                      type="button"
                      disabled={isTranslating}
                      onClick={handleAutoTranslateCategory}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                        color: 'var(--accent-gold)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: isTranslating ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Sparkles size={11} />
                      <span>{isTranslating ? 'Перевожу...' : '✨ Автоперевод на EN & TJ'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Например: Фирменные стейки & Гриль"
                    value={formData.name_ru}
                    onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* English Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Название (English)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Signature Steaks & Grill"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Tajik Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Ном (Тоҷикӣ)
                  </label>
                  <input
                    type="text"
                    placeholder="Масалан: Стейкҳо ва Грилл"
                    value={formData.name_tj}
                    onChange={(e) => setFormData({ ...formData, name_tj: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Icon Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '8px', fontWeight: '600' }}>
                    Тематическая иконка раздела
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {ICON_PRESETS.map((p) => {
                      const isSelected = formData.icon === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: p.id })}
                          style={{
                            backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                            border: isSelected ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            padding: '10px 4px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ fontSize: '20px' }}>{p.emoji}</span>
                          <span style={{ fontSize: '10px', color: isSelected ? 'var(--accent-gold)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55px' }}>
                            {p.label.split(' ')[1] || p.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Display Order & Active */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Порядковый номер (сортировка)
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(10, 10, 14, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                    <input
                      type="checkbox"
                      id="cat_is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }}
                    />
                    <label htmlFor="cat_is_active" style={{ fontSize: '13px', color: '#fff', cursor: 'pointer' }}>
                      Активен в меню
                    </label>
                  </div>
                </div>

                {/* Submit & Cancel */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '10px 18px',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Отмена
                  </button>

                  <GoldButton
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isSubmitting}
                    icon={Check}
                  >
                    {isSubmitting ? 'Сохранение...' : editingCategory ? 'Обновить раздел' : 'Создать раздел'}
                  </GoldButton>
                </div>
              </form>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};
