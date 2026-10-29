import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { menuService } from '../../services/menuService';
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';

export const AdminLogin = ({ onAuthenticated, restaurantSlug = 'asr-royale' }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError('Введите пароль администратора');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await menuService.loginAdmin(password.trim(), restaurantSlug);
      if (res && res.token) {
        sessionStorage.setItem('admin_session_token', res.token);
        sessionStorage.setItem('admin_session_role', res.role || 'manager');
        onAuthenticated(res.token);
      } else {
        setError('Неверный пароль администратора');
      }
    } catch (err) {
      setError(err.message || 'Неверный пароль администратора');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background ambient luxury glow */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
        <GlassCard style={{ padding: '44px 36px', textAlign: 'center' }}>
          {/* Lock Icon Badge */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--accent-gold)',
              boxShadow: '0 0 25px rgba(212, 175, 55, 0.2)'
            }}
          >
            <Lock size={30} />
          </div>

          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: '6px' }}>
            Безопасный доступ
          </div>

          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', color: '#fff', margin: '0 0 8px', fontWeight: '600' }}>
            Панель Управления
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 28px', lineHeight: '1.5' }}>
            Введите пароль администратора для входа в панель управления рестораном
          </p>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                marginBottom: '20px',
                fontWeight: '500'
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Password input with show/hide */}
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                placeholder="Введите пароль..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(15, 15, 20, 0.85)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  borderRadius: '14px',
                  padding: '14px 44px 14px 18px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent-gold)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(212, 175, 55, 0.35)')}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Login button */}
            <GoldButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              icon={ArrowRight}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isLoading ? 'Проверка...' : 'Войти в панель'}
            </GoldButton>
          </form>

          {/* Return link */}
          <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <a
              href={`/menu/${restaurantSlug}`}
              style={{
                textDecoration: 'none',
                color: 'var(--text-muted)',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <ArrowLeft size={14} />
              <span>Вернуться в меню гостя</span>
            </a>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
