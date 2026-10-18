import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { 
  QrCode, 
  Printer, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Plus, 
  Trash2, 
  Info, 
  Smartphone,
  UtensilsCrossed
} from 'lucide-react';

export const TableQrGenerator = ({ restaurant }) => {
  const [tableCount, setTableCount] = useState(15);
  const [mode, setMode] = useState('range'); // 'range' | 'custom'
  const [customTablesStr, setCustomTablesStr] = useState('1, 2, 3, 4, 5, 6, 7, 8, 9, 10, VIP-1, VIP-2, Терраса-1, Терраса-2');
  const [copiedTable, setCopiedTable] = useState(null);

  const slug = restaurant?.slug || 'menu';
  const restaurantName = restaurant?.name || 'ASR Maison Royale';

  // Base mobile menu URL with customizable public domain/IP
  const [customDomain, setCustomDomain] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`qr_custom_domain_${slug}`);
      if (saved) return saved;
      return window.location.origin;
    }
    return 'http://localhost:3033';
  });

  const handleDomainChange = (val) => {
    setCustomDomain(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`qr_custom_domain_${slug}`, val);
    }
  };

  const cleanBase = (customDomain || '').trim().replace(/\/+$/, '');
  const baseUrl = cleanBase ? `${cleanBase}/menu/${slug}` : `http://localhost:3033/menu/${slug}`;
  const isLocalhost = cleanBase.includes('localhost') || cleanBase.includes('127.0.0.1');

  // Compute table list
  const tables = useMemo(() => {
    if (mode === 'range') {
      const count = Math.max(1, Math.min(100, parseInt(tableCount, 10) || 1));
      return Array.from({ length: count }, (_, i) => String(i + 1));
    } else {
      return customTablesStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }, [mode, tableCount, customTablesStr]);

  const handleCopy = (tableNum) => {
    const url = `${baseUrl}?table=${encodeURIComponent(tableNum)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedTable(tableNum);
      setTimeout(() => setCopiedTable(null), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="table-qr-generator">
      {/* Print styles for physical table tents */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            color: #000000 !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
            padding: 20px !important;
          }
          .print-card {
            border: 2px dashed #333333 !important;
            border-radius: 16px !important;
            padding: 24px !important;
            text-align: center !important;
            page-break-inside: avoid !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen View Controls (Hidden when printing) */}
      <div className="no-print" style={{ marginBottom: '28px' }}>
        <GlassCard style={{ padding: '28px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)', marginBottom: '12px', fontSize: '13px', fontWeight: '700' }}>
                <QrCode size={16} />
                <span>Автоопределение столов для гостей</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', color: '#fff', margin: '0 0 8px 0' }}>
                Генератор QR-кодов для столов
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '680px', lineHeight: '1.5' }}>
                Каждый стол получает свой уникальный QR-код. Гость сканирует его — номер стола определяется автоматически! 
                При вызове официанта, заказе или запросе счёта гостю <b>больше не нужно искать и вводить свой стол</b>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <GoldButton 
                variant="primary" 
                size="md" 
                icon={Printer}
                onClick={handlePrint}
              >
                Распечатать все QR-коды ({tables.length} столов)
              </GoldButton>
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '22px 0' }} />

          {/* Configuration Form */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Режим генерации:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMode('range')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: mode === 'range' ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: mode === 'range' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: mode === 'range' ? 'var(--accent-gold)' : '#fff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Диапазон (1..N)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('custom')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: mode === 'custom' ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: mode === 'custom' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: mode === 'custom' ? 'var(--accent-gold)' : '#fff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Свои зоны и VIP
                </button>
              </div>
            </div>

            {mode === 'range' ? (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Количество столов:
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={tableCount}
                    onChange={(e) => setTableCount(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '700'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[10, 20, 30].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTableCount(num)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--text-muted)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Номера столов через запятую:
                </label>
                <input
                  type="text"
                  value={customTablesStr}
                  onChange={(e) => setCustomTablesStr(e.target.value)}
                  placeholder="1, 2, 3, VIP-1, VIP-2, Терраса-1"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Public Base URL / Network IP configuration */}
          <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={14} style={{ color: 'var(--accent-gold)' }} />
                <span>Публичный адрес меню (для QR-кодов столов):</span>
              </label>
              {typeof window !== 'undefined' && (
                <button
                  type="button"
                  onClick={() => handleDomainChange(window.location.origin)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-gold)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Сбросить на {window.location.origin}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => handleDomainChange(e.target.value)}
                placeholder="https://menu.myelegantrestaurant.com или http://192.168.1.50:3033"
                style={{
                  flex: '1 1 320px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: isLocalhost ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'monospace'
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Итоговая ссылка стола 1: <code style={{ color: 'var(--accent-gold)' }}>{baseUrl}?table=1</code>
              </span>
            </div>

            {isLocalhost && (
              <div
                style={{
                  marginTop: '10px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#fbbf24'
                }}
              >
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>
                  Внимание: указан <b>localhost</b>. Телефоны гостей не смогут открыть локалхост компьютера! 
                  Для печати в зале укажите IP-адрес сервера в Wi-Fi сети заведения (например, <code>http://192.168.1.50:3033</code>) или публичный домен.
                </span>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Grid of Table QR Cards (Visible on screen and styled for print) */}
      <div 
        className="print-area" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '24px' 
        }}
      >
        {tables.map((tableNum) => {
          const tableUrl = `${baseUrl}?table=${encodeURIComponent(tableNum)}`;
          const isCopied = copiedTable === tableNum;

          return (
            <div
              key={tableNum}
              className="print-card"
              style={{
                backgroundColor: 'rgba(20, 20, 26, 0.85)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderRadius: '20px',
                padding: '24px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease, border-color 0.2s ease'
              }}
            >
              {/* Header on tent */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--accent-gold)', marginBottom: '6px' }}>
                  <UtensilsCrossed size={16} />
                  <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {restaurantName}
                  </span>
                </div>

                <div 
                  style={{ 
                    fontFamily: 'var(--font-serif)', 
                    fontSize: '28px', 
                    fontWeight: '800', 
                    color: '#ffffff',
                    margin: '4px 0 14px 0',
                    letterSpacing: '0.02em'
                  }}
                >
                  СТОЛ <span style={{ color: 'var(--accent-gold)' }}>№{tableNum}</span>
                </div>

                {/* QR Code with white background for maximum contrast & scannability */}
                <div 
                  style={{ 
                    display: 'inline-block', 
                    background: '#ffffff', 
                    padding: '14px', 
                    borderRadius: '16px', 
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
                    marginBottom: '14px'
                  }}
                >
                  <QRCodeSVG 
                    value={tableUrl} 
                    size={160} 
                    level="H" 
                    includeMargin={false}
                  />
                </div>

                <div style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff', marginBottom: '4px' }}>
                  📱 Наведите камеру смартфона
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '16px' }}>
                  Меню с живым видео • Вызов официанта • Заказ & Счёт
                </div>
              </div>

              {/* Action buttons (Screen Only) */}
              <div className="no-print" style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <a 
                  href={tableUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ flex: 1, textDecoration: 'none' }}
                >
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      background: 'rgba(212, 175, 55, 0.15)',
                      border: '1px solid var(--accent-gold)',
                      color: 'var(--accent-gold)',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Открыть</span>
                  </button>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopy(tableNum)}
                  style={{
                    background: isCopied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    border: isCopied ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: isCopied ? '#10b981' : '#fff',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Скопировать ссылку для стола"
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
