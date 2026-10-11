import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { useTheme } from '../../context/ThemeContext';
import { menuService } from '../../services/menuService';
import { Palette, Check, RefreshCw } from 'lucide-react';

const PRESET_THEMES = [
  {
    id: 'luxury_dark_gold',
    name: 'Imperial Gold',
    bg: '#08080a',
    accent: '#d4af37',
    border: 'rgba(212, 175, 55, 0.3)'
  },
  {
    id: 'emerald_royale',
    name: 'Emerald Royale',
    bg: '#050f0c',
    accent: '#10b981',
    border: 'rgba(16, 185, 129, 0.3)'
  },
  {
    id: 'ruby_velvet',
    name: 'Ruby Velvet',
    bg: '#0f0508',
    accent: '#e11d48',
    border: 'rgba(225, 29, 72, 0.3)'
  },
  {
    id: 'platinum_noir',
    name: 'Platinum Noir',
    bg: '#0a0a0c',
    accent: '#e2e8f0',
    border: 'rgba(226, 232, 240, 0.3)'
  }
];

export const ThemeCustomizer = ({ restaurantSlug, initialTheme, onSaved }) => {
  const { setTheme } = useTheme();
  const [themeState, setThemeState] = useState(initialTheme || {});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const colors = themeState.colors || {
    background: '#09090b',
    primary_accent: '#d4af37',
    surface: 'rgba(18, 18, 22, 0.70)'
  };

  const kiosk = themeState.kiosk_settings || {
    inactivity_seconds: 45,
    headline: 'ASR Maison Royale',
    subheadline: 'Коснитесь экрана, чтобы открыть меню'
  };

  const applyPreset = (preset) => {
    const updated = {
      ...themeState,
      theme_id: preset.id,
      colors: {
        ...colors,
        background: preset.bg,
        primary_accent: preset.accent,
        border_glow: preset.border
      }
    };
    setThemeState(updated);
    setTheme(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await menuService.updateTheme(restaurantSlug, themeState);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      if (onSaved) onSaved(themeState);
    } catch (err) {
      alert('Ошибка при сохранении темы: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GlassCard style={{ padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ color: 'var(--accent-gold)' }}>
          <Palette size={24} />
        </div>
        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', color: 'var(--text-main)' }}>
            Брендинг и Стиль Ресторана
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Настройка цветовой палитры, шрифтов и уличного экрана Kiosk Display
          </p>
        </div>
      </div>

      {/* Preset Palettes */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          Готовые Люкс-Палитры
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          {PRESET_THEMES.map((p) => {
            const isSelected = colors.primary_accent === p.accent;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  background: p.bg,
                  border: isSelected ? `2px solid ${p.accent}` : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: p.accent, marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{p.name}</div>
                {isSelected && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', color: p.accent }}>
                    <Check size={16} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Color Pickers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Основной акцент (Gold / Accent)
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="color"
              value={colors.primary_accent}
              onChange={(e) => {
                const updated = {
                  ...themeState,
                  colors: { ...colors, primary_accent: e.target.value }
                };
                setThemeState(updated);
                setTheme(updated);
              }}
              style={{ width: '42px', height: '42px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent' }}
            />
            <input
              type="text"
              value={colors.primary_accent}
              onChange={(e) => {
                const updated = {
                  ...themeState,
                  colors: { ...colors, primary_accent: e.target.value }
                };
                setThemeState(updated);
                setTheme(updated);
              }}
              style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '13px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Фоновый оттенок (Dark Base)
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="color"
              value={colors.background}
              onChange={(e) => {
                const updated = {
                  ...themeState,
                  colors: { ...colors, background: e.target.value }
                };
                setThemeState(updated);
                setTheme(updated);
              }}
              style={{ width: '42px', height: '42px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent' }}
            />
            <input
              type="text"
              value={colors.background}
              onChange={(e) => {
                const updated = {
                  ...themeState,
                  colors: { ...colors, background: e.target.value }
                };
                setThemeState(updated);
                setTheme(updated);
              }}
              style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      {/* Kiosk Mode Settings */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px', marginBottom: '28px' }}>
        <h4 style={{ fontSize: '16px', color: 'var(--accent-gold)', marginBottom: '14px' }}>
          Настройки Уличного Киоска (Kiosk Mode)
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Заголовок заставки (Headline)
            </label>
            <input
              type="text"
              value={kiosk.headline || ''}
              onChange={(e) => setThemeState({
                ...themeState,
                kiosk_settings: { ...kiosk, headline: e.target.value }
              })}
              style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Таймаут сброса при бездействии (сек)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={kiosk.inactivity_seconds || 45}
              onChange={(e) => setThemeState({
                ...themeState,
                kiosk_settings: { ...kiosk, inactivity_seconds: parseInt(e.target.value, 10) || 45 }
              })}
              style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
        {savedSuccess && (
          <span style={{ color: '#10b981', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={16} /> Настройки темы сохранены
          </span>
        )}
        <GoldButton
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          icon={isSaving ? RefreshCw : Check}
        >
          {isSaving ? 'Сохранение...' : 'Применить стиль'}
        </GoldButton>
      </div>
    </GlassCard>
  );
};
