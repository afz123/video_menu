import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { menuService } from '../../services/menuService';
import {
  Building2,
  X,
  Sparkles,
  Copy,
  Lock,
  Percent,
  Coins,
  Check,
  AlertCircle
} from 'lucide-react';

const CURRENCIES = [
  { code: 'TJS', label: 'TJS (Сомони)', symbol: 'смн' },
  { code: 'RUB', label: 'RUB (Рубли)', symbol: '₽' },
  { code: 'USD', label: 'USD (Доллары)', symbol: '$' },
  { code: 'EUR', label: 'EUR (Евро)', symbol: '€' },
  { code: 'KZT', label: 'KZT (Тенге)', symbol: '₸' },
  { code: 'UZS', label: 'UZS (Сум)', symbol: 'сум' },
  { code: 'AED', label: 'AED (Дирхамы)', symbol: 'د.إ' }
];

export const CreateRestaurantModal = ({
  existingRestaurants = [],
  onClose,
  onCreated
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [currency, setCurrency] = useState('TJS');
  const [serviceCharge, setServiceCharge] = useState('10.0');
  const [donorSlug, setDonorSlug] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Auto-generate URL slug from restaurant name if user hasn't edited slug manually
  const [isSlugManual, setIsSlugManual] = useState(false);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugManual) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Введите название заведения');
      return;
    }
    if (!slug.trim()) {
      setError('Введите URL-идентификатор (slug)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        tagline: tagline.trim() || undefined,
        currency: currency,
        service_charge_percent: parseFloat(serviceCharge) || 10.0,
        admin_password: adminPassword.trim() || undefined
      };

      const newRest = await menuService.createRestaurant(payload);

      // If a donor restaurant was selected, clone its menu into the new branch!
      if (donorSlug && donorSlug !== newRest.slug) {
        try {
          await menuService.cloneMenu(newRest.slug, donorSlug);
        } catch (cloneErr) {
          console.error('Menu clone warning:', cloneErr);
        }
      }

      onCreated(newRest);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ошибка создания заведения');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          pointerEvents: isSubmitting ? 'none' : 'auto',
          opacity: isSubmitting ? 0.7 : 1,
          transition: 'opacity 0.2s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard style={{ padding: '36px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>
                <Building2 size={16} />
                <span>Мультитенантность & Сеть заведений</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: '#fff', margin: 0 }}>
                Добавить новое заведение / филиал
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: 'var(--text-muted)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#ef4444', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* 1. Name & Slug */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Название ресторана *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Grand Steakhouse"
                  value={name}
                  onChange={handleNameChange}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  URL Slug (идентификатор) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="grand-steakhouse"
                  value={slug}
                  onChange={(e) => {
                    setIsSlugManual(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: 'var(--accent-gold)',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Tagline */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Концепция / Подзаголовок
              </label>
              <input
                type="text"
                placeholder="Премиальный стейкхаус и сухая выдержка Black Angus"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Currency & Service Charge */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <Coins size={14} color="var(--accent-gold)" />
                  <span>Валюта заведения</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#121216',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <Percent size={14} color="var(--accent-gold)" />
                  <span>Обслуживание (%)</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* 3. Donor Menu Cloning Option (Instant Rollout) */}
            {existingRestaurants.length > 0 && (
              <div style={{ background: 'rgba(212, 175, 55, 0.06)', border: '1px dashed rgba(212, 175, 55, 0.35)', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--accent-gold)', marginBottom: '8px' }}>
                  <Copy size={16} />
                  <span>Клонировать меню из донора (1-Click Франшиза)</span>
                </label>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  Все разделы, блюда, модификаторы и видео будут автоматически скопированы в новый филиал.
                </p>
                <select
                  value={donorSlug}
                  onChange={(e) => setDonorSlug(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#121216',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="">Не клонировать (чистое меню)</option>
                  {existingRestaurants.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      📋 Скопировать меню из: {r.name} ({r.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Branch Manager Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <Lock size={14} color="var(--accent-gold)" />
                <span>Пароль управляющего филиала (опционально)</span>
              </label>
              <input
                type="text"
                placeholder="Если оставить пустым, действует мастер-пароль сети"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <GoldButton
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                icon={Sparkles}
              >
                {isSubmitting ? 'Создание филиала...' : 'Создать заведение'}
              </GoldButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
