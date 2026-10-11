import React from 'react';

export const GoldButton = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon
}) => {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '13px' },
    md: { padding: '12px 24px', fontSize: '15px' },
    lg: { padding: '16px 32px', fontSize: '17px' }
  }[size] || { padding: '12px 24px', fontSize: '15px' };

  let bg = 'var(--accent-gold-gradient)';
  let color = '#09090b';
  let border = 'none';
  let shadow = '0 8px 24px rgba(212, 175, 55, 0.3)';

  if (isOutline) {
    bg = 'rgba(212, 175, 55, 0.08)';
    color = 'var(--accent-gold)';
    border = '1px solid var(--accent-gold)';
    shadow = 'none';
  } else if (isGhost) {
    bg = 'transparent';
    color = 'var(--text-main)';
    border = '1px solid rgba(255, 255, 255, 0.1)';
    shadow = 'none';
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        ...sizeStyles,
        background: bg,
        color,
        border,
        boxShadow: shadow,
        borderRadius: 'var(--radius-md)',
        fontWeight: '600',
        letterSpacing: '0.04em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.25s ease',
        transform: disabled ? 'none' : undefined
      }}
      onMouseEnter={(e) => {
        if (!disabled && isPrimary) e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        if (!disabled && isPrimary) e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {Icon && <Icon size={size === 'sm' ? 15 : 18} />}
      {children}
    </button>
  );
};
