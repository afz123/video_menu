import React from 'react';

export const GlassCard = ({ children, className = '', variant = 'elevated', style = {}, onClick }) => {
  const baseStyle = {
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    overflow: 'hidden',
    ...style
  };

  const variantClass = variant === 'subtle' ? 'glass-panel-subtle' : 'glass-panel';

  return (
    <div
      onClick={onClick}
      style={baseStyle}
      className={`${variantClass} ${className}`}
    >
      {children}
    </div>
  );
};
