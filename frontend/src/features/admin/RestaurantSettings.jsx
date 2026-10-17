import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { menuService } from '../../services/menuService';
import { AVAILABLE_LANGUAGES } from '../../context/LanguageContext';
import {
  Building2,
  Save,
  Globe,
  Sparkles,
  Phone,
  MapPin,
  Clock,
  Link,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Bell,
  Percent,
  Send
} from 'lucide-react';

export const RestaurantSettings = ({
  restaurant,
  onRestaurantUpdated
}) => {
  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    tagline: restaurant?.tagline || '',
    description: restaurant?.description || '',
    slug: restaurant?.slug || '',
    default_locale: restaurant?.default_locale || 'ru',
    supported_locales: restaurant?.supported_locales || ['ru', 'tj', 'en'],
    phone: restaurant?.theme?.contact_info?.phone || '+992 900 00 00 00',
    address: restaurant?.theme?.contact_info?.address || 'ул. Рудаки, 12',
    hours: restaurant?.theme?.contact_info?.hours || '11:00 — 23:00',
    service_charge_percent: restaurant?.service_charge_percent ?? 10.0,
    telegram_enabled: Boolean(restaurant?.telegram_enabled),
    telegram_bot_token: restaurant?.telegram_bot_token || '',
    telegram_chat_id: restaurant?.telegram_chat_id || ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Telegram test status
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestFeedback, setTelegramTestFeedback] = useState(null);

  // Admin password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  const handlePasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', text: 'Введите текущий пароль администратора' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordFeedback({ type: 'error', text: 'Новый пароль должен содержать минимум 4 символа' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'Новые пароли не совпадают' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordFeedback(null);

    try {
      await menuService.changeAdminPassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordFeedback({ type: 'success', text: 'Пароль администратора успешно изменен!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordFeedback({ type: 'error', text: err.message || 'Ошибка смены пароля' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        tagline: restaurant.tagline || '',
        description: restaurant.description || '',
        slug: restaurant.slug || '',
        default_locale: restaurant.default_locale || 'ru',
        supported_locales: restaurant.supported_locales || ['ru', 'tj', 'en'],
        phone: restaurant.theme?.contact_info?.phone || '+992 900 00 00 00',
        address: restaurant.theme?.contact_info?.address || 'ул. Рудаки, 12',
        hours: restaurant.theme?.contact_info?.hours || '11:00 — 23:00',
        service_charge_percent: restaurant.service_charge_percent ?? 10.0,
        telegram_enabled: Boolean(restaurant.telegram_enabled),
        telegram_bot_token: restaurant.telegram_bot_token || '',
        telegram_chat_id: restaurant.telegram_chat_id || ''
      });
    }
  }, [restaurant]);

  const handleToggleLocale = (code) => {
    setFormData((prev) => {
      const current = prev.supported_locales || [];
      if (current.includes(code)) {
        // Prevent removing all locales
        if (current.length <= 1) return prev;
        return {
          ...prev,
          supported_locales: current.filter((c) => c !== code)
        };
      } else {
        return {
          ...prev,
          supported_locales: [...current, code]
        };
      }
    });
  };

  const handleTestTelegram = async () => {
    if (!formData.telegram_bot_token.trim() || !formData.telegram_chat_id.trim()) {
      setTelegramTestFeedback({
        type: 'error',
        text: 'Пожалуйста, заполните Telegram Bot Token и Chat ID перед отправкой теста'
      });
      return;
    }

    setIsTestingTelegram(true);
    setTelegramTestFeedback(null);

    try {
      // First persist settings so the test endpoint uses latest credentials
      const currentSlug = restaurant?.slug || formData.slug;
      await menuService.updateRestaurant(currentSlug, {
        telegram_enabled: formData.telegram_enabled,
        telegram_bot_token: formData.telegram_bot_token.trim(),
        telegram_chat_id: formData.telegram_chat_id.trim()
      });

      const res = await menuService.testTelegram(currentSlug);
      setTelegramTestFeedback({
        type: 'success',
        text: res.message || 'Тестовое уведомление успешно доставлено в Telegram!'
      });
    } catch (err) {
      setTelegramTestFeedback({
        type: 'error',
        text: err.message || 'Не удалось отправить сообщение в Telegram. Проверьте правильность токена и ID группы.'
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      setNotification({ type: 'error', text: 'Название ресторана не может быть пустым' });
      return;
    }

    setIsSaving(true);
    setNotification(null);

    try {
      const payload = {
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),
        slug: formData.slug.trim(),
        default_locale: formData.default_locale,
        supported_locales: formData.supported_locales,
        service_charge_percent: Number(formData.service_charge_percent) || 0,
        telegram_enabled: formData.telegram_enabled,
        telegram_bot_token: formData.telegram_bot_token.trim(),
        telegram_chat_id: formData.telegram_chat_id.trim(),
        theme_config: {
          ...(restaurant?.theme || {}),
          contact_info: {
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            hours: formData.hours.trim()
          }
        }
      };

      const currentSlug = restaurant?.slug || formData.slug;
      const res = await menuService.updateRestaurant(currentSlug, payload);

      setNotification({
        type: 'success',
        text: 'Настройки ресторана успешно сохранены!'
      });

      if (onRestaurantUpdated) {
        onRestaurantUpdated(res);
      }

      // If slug changed, reload to new slug
      if (formData.slug !== currentSlug) {
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Ошибка при сохранении настроек'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const menuUrl = `${window.location.origin}/menu/${formData.slug || 'asr-royale'}`;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            <Building2 size={16} />
            <span>Профиль & Брендинг</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: '#fff', margin: 0 }}>
            Настройки заведения
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0' }}>
            Измените название, слоган, языки меню и контактные данные вашего ресторана
          </p>
        </div>

        <GoldButton
          variant="primary"
          size="md"
          icon={Save}
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
        </GoldButton>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: notification.type === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            color: notification.type === 'success' ? '#34d399' : '#f87171'
          }}
        >
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* SECTION 1: Brand & Identity */}
      <GlassCard style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
          <Sparkles size={20} style={{ color: 'var(--accent-gold)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
            Основная информация о заведении
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Restaurant Name */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              Название ресторана *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: ASR Maison Royale, Ресторан Памир, Steakhouse..."
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                outline: 'none'
              }}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Отображается в шапке мобильного меню гостя и на главной странице панели
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              Слоган / Подзаголовок
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="Например: Haute Cuisine & Dry-Aged Steaks"
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Slug */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              URL-идентификатор (Slug)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
              placeholder="asr-royale"
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'var(--accent-gold)',
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              Описание и концепция ресторана
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Расскажите о концепции, шеф-поваре или ключевых особенностях заведения..."
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Live URL Link */}
        <div
          style={{
            marginTop: '20px',
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: 'rgba(212, 175, 55, 0.06)',
            border: '1px dashed rgba(212, 175, 55, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <Link size={15} style={{ color: 'var(--accent-gold)' }} />
            <span>Ссылка на меню гостя:</span>
            <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{menuUrl}</span>
          </div>

          <a href={menuUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <GoldButton variant="outline" size="sm" icon={ExternalLink}>
              Проверить меню
            </GoldButton>
          </a>
        </div>
      </GlassCard>

      {/* SECTION 2: Languages & Localization */}
      <GlassCard style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
          <Globe size={20} style={{ color: 'var(--accent-gold)' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
              Языки меню для гостей
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Выберите языки, которые будут отображаться в мобильном переключателе гостя
            </p>
          </div>
        </div>

        {/* Default language selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600' }}>
            Основной язык по умолчанию:
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {formData.supported_locales.map((code) => {
              const langInfo = AVAILABLE_LANGUAGES.find((l) => l.code === code) || { flag: '🌐', label: code };
              const isDefault = formData.default_locale === code;

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setFormData({ ...formData, default_locale: code })}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: isDefault ? '700' : '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: isDefault ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: isDefault ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: isDefault ? 'var(--accent-gold-light)' : 'var(--text-main)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontWeight: '800', fontSize: '11px', color: isDefault ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{langInfo.short}</span>
                  <span>{langInfo.label}</span>
                  {isDefault && <span style={{ fontSize: '10px', color: 'var(--accent-gold)', marginLeft: '4px' }}>★ По умолчанию</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Supported Languages Toggles */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '600' }}>
            Доступные языки в меню (нажмите для включения/выключения):
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isEnabled = formData.supported_locales.includes(lang.code);

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleToggleLocale(lang.code)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: isEnabled ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: isEnabled ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    color: isEnabled ? '#fff' : 'var(--text-dim)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    fontWeight: isEnabled ? '600' : '400',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '12px', color: 'var(--accent-gold)', width: '26px' }}>{lang.short}</span>
                    <span>{lang.label}</span>
                  </div>
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: isEnabled ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.1)',
                      color: '#09090b',
                      fontSize: '11px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isEnabled ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* SECTION 3: Contacts & Operations */}
      <GlassCard style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
          <Clock size={20} style={{ color: 'var(--accent-gold)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
            Контакты и режим работы
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {/* Phone */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              <Phone size={14} style={{ color: 'var(--accent-gold)' }} />
              <span>Телефон резерва столов</span>
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+992 900 00 00 00"
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Address */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              <MapPin size={14} style={{ color: 'var(--accent-gold)' }} />
              <span>Адрес ресторана</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="пр. Рудаки, 12"
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Working hours */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              <Clock size={14} style={{ color: 'var(--accent-gold)' }} />
              <span>Время работы</span>
            </label>
            <input
              type="text"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              placeholder="11:00 — 23:00 ежедневно"
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </GlassCard>

      {/* SECTION 4: Restaurant Economics & Service Charge */}
      <GlassCard style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(212, 175, 55, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
            <Percent size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
              Процент за обслуживание (Service Charge)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Автоматически рассчитывается в корзине гостя и на экране официанта (обычно 10–15%)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '160px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                Процент в чеке (%):
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={formData.service_charge_percent}
                  onChange={(e) => setFormData({ ...formData, service_charge_percent: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    borderRadius: '12px',
                    padding: '12px 36px 12px 16px',
                    color: 'var(--accent-gold)',
                    fontSize: '18px',
                    fontWeight: '700',
                    outline: 'none'
                  }}
                />
                <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-gold)', fontWeight: '700' }}>
                  %
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                Быстрый выбор стандарта заведения:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[0, 10, 12, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setFormData({ ...formData, service_charge_percent: pct })}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: Number(formData.service_charge_percent) === pct ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: Number(formData.service_charge_percent) === pct ? 'rgba(212, 175, 55, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      color: Number(formData.service_charge_percent) === pct ? 'var(--accent-gold-light)' : 'var(--text-main)',
                      fontWeight: Number(formData.service_charge_percent) === pct ? '700' : '500',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {pct === 0 ? 'Без наценки (0%)' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>
            💡 Пример: при заказе стейка за 300 TJS с обслуживанием {formData.service_charge_percent}% гость увидит: блюда 300 TJS + обслуживание {(300 * (Number(formData.service_charge_percent) / 100)).toFixed(1)} TJS = Итого к оплате {(300 * (1 + Number(formData.service_charge_percent) / 100)).toFixed(1)} TJS.
          </p>
        </div>
      </GlassCard>

      {/* SECTION 5: Telegram Bot Live Dispatch Notifications */}
      <GlassCard style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Send size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                Telegram-оповещения персонала (Смена официантов)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Мгновенная доставка вызовов официанта, запросов счёта и заказов прямо в Telegram-чат смены
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: formData.telegram_enabled ? '#38bdf8' : 'var(--text-muted)' }}>
              {formData.telegram_enabled ? 'Включено' : 'Выключено'}
            </span>
            <input
              type="checkbox"
              checked={formData.telegram_enabled}
              onChange={(e) => setFormData({ ...formData, telegram_enabled: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            {/* Bot Token */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                Telegram Bot Token:
              </label>
              <input
                type="text"
                value={formData.telegram_bot_token}
                onChange={(e) => setFormData({ ...formData, telegram_bot_token: e.target.value })}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Создайте бота через @BotFather в Telegram и скопируйте API токен
              </span>
            </div>

            {/* Chat ID */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                Telegram Chat ID (Группа или Канал смены):
              </label>
              <input
                type="text"
                value={formData.telegram_chat_id}
                onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                placeholder="-1001234567890 или @restaurant_staff_chat"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Добавьте созданного бота в группу смены администратором и укажите Chat ID
              </span>
            </div>
          </div>

          {/* Test Telegram Dispatch Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', paddingTop: '6px' }}>
            <button
              type="button"
              disabled={isTestingTelegram || !formData.telegram_bot_token || !formData.telegram_chat_id}
              onClick={handleTestTelegram}
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.14)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '12px',
                padding: '10px 18px',
                color: '#38bdf8',
                fontWeight: '600',
                fontSize: '13px',
                cursor: isTestingTelegram ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Send size={15} />
              <span>{isTestingTelegram ? 'Отправка тестового пуша...' : '⚡ Проверить доставку в Telegram'}</span>
            </button>

            {telegramTestFeedback && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: telegramTestFeedback.type === 'success' ? '#10b981' : '#ef4444'
                }}
              >
                {telegramTestFeedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{telegramTestFeedback.text}</span>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* SECTION 6: Admin Security & Password Change */}
      <GlassCard style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(212, 175, 55, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                Безопасность & Пароль Администратора
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Измените пароль для входа в панель управления рестораном
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-gold)',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{showPasswords ? 'Скрыть символы' : 'Показать символы'}</span>
          </button>
        </div>

        {passwordFeedback && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '20px',
              backgroundColor: passwordFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: passwordFeedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
              color: passwordFeedback.type === 'success' ? '#34d399' : '#f87171'
            }}
          >
            {passwordFeedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{passwordFeedback.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '22px' }}>
            {/* Current Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                Текущий пароль *
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Введите старый пароль..."
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                Новый пароль *
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Новый пароль (мин. 4 симв.)..."
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(212, 175, 55, 0.28)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                Повторите новый пароль *
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите новый пароль..."
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(212, 175, 55, 0.28)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <GoldButton
              type="submit"
              variant="outline"
              size="md"
              icon={KeyRound}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Проверка...' : 'Обновить пароль админа'}
            </GoldButton>
          </div>
        </form>
      </GlassCard>

      {/* Bottom Save bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
        <GoldButton
          variant="primary"
          size="lg"
          icon={Save}
          disabled={isSaving}
          onClick={handleSave}
          style={{ minWidth: '220px', justifyContent: 'center' }}
        >
          {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
        </GoldButton>
      </div>
    </div>
  );
};
