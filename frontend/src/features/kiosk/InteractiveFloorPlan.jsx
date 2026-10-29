import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Sparkles, Check, ZoomIn, ZoomOut, 
  RotateCcw, Move, List, DoorClosed, 
  ChevronRight, CheckCircle2, SlidersHorizontal,
  Building2, Layers
} from 'lucide-react';

export const InteractiveFloorPlan = ({
  zones = [],
  selectedZoneId,
  onSelectZone,
  tables = [],
  selectedTableId,
  onSelectTable,
  guestsCount = 2,
  availableTableIds = [],
  selectedTime = '',
  isEditor = false,
  onUpdateTablePosition = null,
  onEditTableDetails = null
}) => {
  const [displayMode, setDisplayMode] = useState('MAP'); // 'MAP' | 'LIST'
  const [hoveredTable, setHoveredTable] = useState(null);
  const [previewTable, setPreviewTable] = useState(null);

  // Pan & Zoom Engine State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const touchStartDistRef = useRef(0);
  const containerRef = useRef(null);

  // 1. Группировка зон по этажам (Multi-Floor Engine)
  const floorMap = useMemo(() => {
    const map = {};
    zones.forEach((z) => {
      const fNum = z.floor || (z.name?.toLowerCase().includes('2') ? 2 : 1);
      if (!map[fNum]) map[fNum] = [];
      map[fNum].push(z);
    });
    return map;
  }, [zones]);

  const availableFloors = useMemo(() => {
    const fNums = Object.keys(floorMap).map(Number);
    return fNums.length > 0 ? fNums.sort((a, b) => b - a) : [1]; // 2F сверху, 1F снизу
  }, [floorMap]);

  // Выбранный текущий этаж
  const currentZone = zones.find((z) => Number(z.id) === Number(selectedZoneId)) || zones[0];
  const activeFloor = currentZone?.floor || (currentZone?.name?.toLowerCase().includes('2') ? 2 : 1);

  // Зоны текущего активного этажа
  const floorZones = floorMap[activeFloor] || (zones.length > 0 ? [zones[0]] : []);

  // Переключение этажа
  const handleFloorChange = (targetFloor) => {
    const targetZones = floorMap[targetFloor];
    if (targetZones && targetZones.length > 0) {
      if (onSelectZone) onSelectZone(targetZones[0].id);
      setPreviewTable(null);
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Все столы текущей выбранной зоны
  const allTables = tables.length > 0 ? tables : zones.flatMap((z) => z.tables || []);
  const zoneTables = currentZone 
    ? allTables.filter((t) => Number(t.zone_id) === Number(currentZone.id))
    : allTables;

  // Синхронизация превью с выбранным столом
  useEffect(() => {
    if (selectedTableId) {
      const found = allTables.find((t) => Number(t.id) === Number(selectedTableId));
      if (found) setPreviewTable(found);
    } else if (zoneTables.length > 0 && !previewTable && !isEditor) {
      const match = zoneTables.find(
        (t) => t.is_active && t.min_capacity <= guestsCount && t.max_capacity >= guestsCount
      );
      if (match) setPreviewTable(match);
    }
  }, [selectedTableId, allTables, zoneTables, guestsCount, isEditor]);

  // Сброс зума при смене зоны
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [selectedZoneId]);

  // Изображение плана/фотографии выбранного этажа
  const masterFloorPlanUrl =
    currentZone?.image_url ||
    (activeFloor === 2
      ? 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1920&q=85'
      : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=85');

  // Zoom Controls
  const handleZoomIn = () => setScale((s) => Math.min(3.0, Number((s + 0.3).toFixed(1))));
  const handleZoomOut = () => {
    setScale((s) => {
      const next = Math.max(1.0, Number((s - 0.3).toFixed(1)));
      if (next === 1.0) setPan({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse Drag (Pan)
  const handleMouseDown = (e) => {
    if (isEditor && selectedTableId) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const maxPanX = (scale - 1) * 320;
    const maxPanY = (scale - 1) * 220;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    setPan({
      x: Math.max(-maxPanX - 100, Math.min(maxPanX + 100, newX)),
      y: Math.max(-maxPanY - 80, Math.min(maxPanY + 80, newY))
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((s) => {
      const next = Math.max(1.0, Math.min(3.0, Number((s + delta).toFixed(2))));
      if (next === 1.0) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  // Touch Pan & Pinch Zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      if (isEditor && selectedTableId) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      const maxPanX = (scale - 1) * 320;
      const maxPanY = (scale - 1) * 220;
      const newX = e.touches[0].clientX - dragStartRef.current.x;
      const newY = e.touches[0].clientY - dragStartRef.current.y;
      setPan({
        x: Math.max(-maxPanX - 100, Math.min(maxPanX + 100, newX)),
        y: Math.max(-maxPanY - 80, Math.min(maxPanY + 80, newY))
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartDistRef.current > 0) {
        const factor = dist / touchStartDistRef.current;
        setScale((s) => Math.max(1.0, Math.min(3.0, Number((s * factor).toFixed(2)))));
        touchStartDistRef.current = dist;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDistRef.current = 0;
  };

  // Editor Click Repositioning
  const handleMapClick = (e) => {
    if (!isEditor || !onUpdateTablePosition || !selectedTableId) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / scale;
    const clickY = (e.clientY - rect.top - pan.y) / scale;

    const posXPercent = Math.max(2, Math.min(98, Math.round((clickX / rect.width) * 1000) / 10));
    const posYPercent = Math.max(2, Math.min(98, Math.round((clickY / rect.height) * 1000) / 10));

    onUpdateTablePosition(selectedTableId, posXPercent, posYPercent);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Верхняя панель: Переключатель режимов (Карта / Список) + Автоподбор */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => setDisplayMode('MAP')}
            style={{
              background: displayMode === 'MAP' ? 'var(--accent-gold-gradient)' : 'transparent',
              color: displayMode === 'MAP' ? '#09090b' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🗺️ 3D-План этажа</span>
          </button>

          <button
            type="button"
            onClick={() => setDisplayMode('LIST')}
            style={{
              background: displayMode === 'LIST' ? 'var(--accent-gold-gradient)' : 'transparent',
              color: displayMode === 'LIST' ? '#09090b' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <List size={14} />
            <span>📋 Списком</span>
          </button>
        </div>

        {/* Быстрая кнопка «Выбрать лучший автоматически» */}
        {!isEditor && (
          <button
            type="button"
            onClick={() => {
              const firstFit = allTables.find(
                (t) => t.is_active && t.min_capacity <= guestsCount && t.max_capacity >= guestsCount &&
                (availableTableIds.length === 0 || availableTableIds.includes(t.id))
              );
              if (firstFit) {
                if (onSelectTable) onSelectTable(firstFit.id);
                setPreviewTable(firstFit);
                if (onSelectZone && firstFit.zone_id) {
                  onSelectZone(firstFit.zone_id);
                }
              }
            }}
            style={{
              background: 'rgba(212, 175, 55, 0.14)',
              border: '1px solid var(--accent-gold)',
              borderRadius: '12px',
              padding: '7px 14px',
              color: 'var(--accent-gold)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <Sparkles size={13} />
            <span>✨ Подобрать лучший стол</span>
          </button>
        )}
      </div>

      {/* 2. Под-зоны выбранного этажа (например: Зал и Терраса на 1-м этаже) */}
      {floorZones.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          {floorZones.map((zone) => {
            const isActive = Number(zone.id) === Number(currentZone?.id);
            const zTables = allTables.filter((t) => Number(t.zone_id) === Number(zone.id));
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => {
                  if (onSelectZone) onSelectZone(zone.id);
                  setPreviewTable(null);
                }}
                style={{
                  background: isActive ? 'var(--accent-gold-gradient)' : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#09090b' : '#fff',
                  border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{zone.name}</span>
                <span style={{ backgroundColor: isActive ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '6px', fontSize: '10px' }}>
                  {zTables.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. РЕЖИМ 1: ИНТЕРАКТИВНЫЙ 3D-ПЛАН С ЛИФТОМ ЭТАЖЕЙ */}
      {displayMode === 'MAP' && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '390px',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid var(--glass-border, rgba(212, 175, 55, 0.35))',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85), inset 0 0 60px rgba(0,0,0,0.8)',
            backgroundColor: '#09090b',
            userSelect: 'none',
            touchAction: 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {/* ======================================================== */}
          {/* ЛИФТОВЫЙ СЕЛЕКТОР ЭТАЖЕЙ (FLOOR ELEVATOR CONTROLLER) */}
          {/* ======================================================== */}
          {availableFloors.length > 1 && (
            <div
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 35,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'rgba(10, 10, 15, 0.92)',
                backdropFilter: 'blur(16px)',
                border: '1.5px solid var(--accent-gold)',
                borderRadius: '18px',
                padding: '8px 6px',
                boxShadow: '0 12px 36px rgba(0,0,0,0.85), 0 0 20px rgba(212, 175, 55, 0.25)'
              }}
            >
              <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--accent-gold)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Этаж
              </div>
              {availableFloors.map((fNum) => {
                const isSelectedFloor = activeFloor === fNum;
                return (
                  <button
                    key={fNum}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFloorChange(fNum);
                    }}
                    title={`Перейти на ${fNum}-й этаж`}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: isSelectedFloor ? 'var(--accent-gold-gradient)' : 'rgba(255, 255, 255, 0.06)',
                      color: isSelectedFloor ? '#09090b' : '#fff',
                      border: isSelectedFloor ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                      fontWeight: '800',
                      fontSize: '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isSelectedFloor ? '0 4px 16px rgba(212, 175, 55, 0.6)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <span>{fNum}F</span>
                    <span style={{ fontSize: '8px', opacity: isSelectedFloor ? 0.9 : 0.6, marginTop: '-2px', maxWidth: '40px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {floorMap[fNum]?.[0]?.name?.replace(/^(.*?:|\d+F\s*)/i, '').trim() || (fNum === 1 ? 'Зал' : fNum === 2 ? 'Лаунж' : 'Крыша')}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Интерактивный масштабируемый контейнер */}
          <div
            ref={containerRef}
            onClick={handleMapClick}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              cursor: isEditor && selectedTableId ? 'crosshair' : isDragging ? 'grabbing' : 'grab'
            }}
          >
            {/* Реалистичный архитектурный 3D-план выбранного этажа */}
            <img
              key={masterFloorPlanUrl}
              src={masterFloorPlanUrl}
              alt={`План ${activeFloor}-го этажа`}
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'brightness(0.74) contrast(1.1) saturate(1.1)',
                pointerEvents: 'none',
                animation: 'fadeIn 0.35s ease'
              }}
            />

            {/* Виньетка глубины */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, transparent 35%, rgba(5,5,8,0.75) 100%)',
                pointerEvents: 'none'
              }}
            />

            {/* Маркеры Столов и VIP-Кабин активного зала */}
            {zoneTables.map((tbl) => {
              const isSelected = Number(selectedTableId) === Number(tbl.id);
              const isAvailable = availableTableIds.length === 0 || availableTableIds.includes(tbl.id);
              const fitsCapacity = tbl.min_capacity <= guestsCount && tbl.max_capacity >= guestsCount;
              const isCabin = tbl.shape === 'cabin' || (tbl.table_number || '').toLowerCase().includes('vip');

              return (
                <div
                  key={tbl.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isEditor && !isAvailable) return;
                    if (onSelectTable) onSelectTable(tbl.id);
                    setPreviewTable(tbl);
                  }}
                  onMouseEnter={() => setHoveredTable(tbl)}
                  onMouseLeave={() => setHoveredTable(null)}
                  style={{
                    position: 'absolute',
                    left: `${tbl.pos_x || 50}%`,
                    top: `${tbl.pos_y || 50}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isSelected ? 40 : 20,
                    cursor: !isEditor && !isAvailable ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  {/* Световой ореол для выбранного стола */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(212, 175, 55, 0.45)',
                        boxShadow: '0 0 30px rgba(212, 175, 55, 0.95)',
                        animation: 'pulseGlow 2s infinite',
                        pointerEvents: 'none'
                      }}
                    />
                  )}

                  {/* Маркер: VIP-Кабина или Столик */}
                  <div
                    style={{
                      width: isCabin ? '58px' : '44px',
                      height: isCabin ? '46px' : '44px',
                      borderRadius: isCabin ? '14px' : tbl.shape === 'round' ? '50%' : '12px',
                      backgroundColor: isSelected
                        ? 'var(--accent-gold, #d4af37)'
                        : !isAvailable
                        ? 'rgba(239, 68, 68, 0.88)'
                        : !fitsCapacity && !isEditor
                        ? 'rgba(35, 35, 45, 0.92)'
                        : isCabin
                        ? 'rgba(18, 14, 28, 0.95)'
                        : 'rgba(14, 14, 18, 0.94)',
                      color: isSelected ? '#000' : '#fff',
                      border: isSelected
                        ? '2px solid #fff'
                        : isCabin
                        ? '1.5px solid #a855f7'
                        : isAvailable && (fitsCapacity || isEditor)
                        ? '1.5px solid var(--accent-gold, #d4af37)'
                        : '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: isSelected
                        ? '0 0 24px rgba(212, 175, 55, 0.95), 0 8px 16px rgba(0,0,0,0.8)'
                        : '0 4px 14px rgba(0,0,0,0.7)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s ease',
                      transform: isSelected || hoveredTable?.id === tbl.id ? 'scale(1.15)' : 'scale(1)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', lineHeight: 1 }}>
                      {isCabin && <DoorClosed size={10} color={isSelected ? '#000' : '#c084fc'} />}
                      <span style={{ fontSize: '11px', fontWeight: '800' }}>
                        №{tbl.table_number}
                      </span>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: '700', opacity: isSelected ? 0.9 : 0.75, marginTop: '2px' }}>
                      {tbl.max_capacity} чел
                    </span>
                  </div>

                  {tbl.features && tbl.features[0] && (
                    <div
                      style={{
                        marginTop: '3px',
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        padding: '1px 5px',
                        borderRadius: '5px',
                        fontSize: '8px',
                        fontWeight: '600',
                        color: isSelected ? 'var(--accent-gold)' : 'rgba(255,255,255,0.8)',
                        whiteSpace: 'nowrap',
                        border: '1px solid rgba(255,255,255,0.1)',
                        pointerEvents: 'none'
                      }}
                    >
                      {tbl.features[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Плавающий блок управления Zoom & Pan (справа внизу) */}
          <div
            style={{
              position: 'absolute',
              right: '12px',
              bottom: '12px',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'rgba(10, 10, 14, 0.85)',
              backdropFilter: 'blur(12px)',
              padding: '6px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <button
              type="button"
              onClick={handleZoomIn}
              style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.3)', color: 'var(--accent-gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Бейдж этажа и зала сверху справа */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 30,
              background: 'rgba(10, 10, 14, 0.88)',
              backdropFilter: 'blur(10px)',
              padding: '5px 12px',
              borderRadius: '14px',
              border: '1px solid var(--accent-gold)',
              fontSize: '12px',
              color: '#fff',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ color: 'var(--accent-gold)' }}>{activeFloor}F</span>
            <span>•</span>
            <span>{currentZone?.name || 'Зал'}</span>
          </div>
        </div>
      )}

      {/* 4. РЕЖИМ 2: СТАНДАРТНАЯ ТАБЛИЦА СТОЛОВ ПО ЭТАЖАМ */}
      {displayMode === 'LIST' && (
        <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {zoneTables.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              На этом этаже пока нет столов
            </div>
          ) : (
            zoneTables.map((tbl) => {
              const isSelected = Number(selectedTableId) === Number(tbl.id);
              const isAvailable = availableTableIds.length === 0 || availableTableIds.includes(tbl.id);
              const isCabin = tbl.shape === 'cabin' || (tbl.table_number || '').toLowerCase().includes('vip');

              return (
                <div
                  key={tbl.id}
                  onClick={() => {
                    if (!isEditor && !isAvailable) return;
                    if (onSelectTable) onSelectTable(tbl.id);
                    setPreviewTable(tbl);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    background: isSelected ? 'rgba(212, 175, 55, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1.5px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: isAvailable || isEditor ? 'pointer' : 'not-allowed'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: isCabin ? '12px' : '50%',
                        background: isSelected ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.06)',
                        color: isSelected ? '#000' : 'var(--accent-gold)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800'
                      }}
                    >
                      №{tbl.table_number}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                        {isCabin ? `Закрытая VIP-кабина №${tbl.table_number}` : `Стол №${tbl.table_number}`}
                        <span style={{ color: 'var(--accent-gold)', fontSize: '11px', marginLeft: '6px' }}>
                          ({activeFloor}-й этаж)
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Вместимость: {tbl.min_capacity}–{tbl.max_capacity} чел
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check size={16} color="var(--accent-gold)" />}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. Карточка выбранного столика с фото интерьера */}
      {previewTable && (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--accent-gold)',
            borderRadius: '16px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {previewTable.photo_url ? (
              <img
                src={previewTable.photo_url}
                alt={`Стол №${previewTable.table_number}`}
                style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--accent-gold)' }}
              />
            ) : (
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  color: 'var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800'
                }}
              >
                №{previewTable.table_number}
              </div>
            )}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                Стол №{previewTable.table_number} • {activeFloor}-й этаж ({currentZone?.name || 'Зал'})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Вместимость: {previewTable.min_capacity}–{previewTable.max_capacity} чел
                {previewTable.features?.length > 0 && ` • ✨ ${previewTable.features.join(', ')}`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditor && onEditTableDetails && (
              <button
                type="button"
                onClick={() => onEditTableDetails(previewTable)}
                style={{
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid var(--accent-gold)',
                  color: 'var(--accent-gold)',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Настройки стола №{previewTable.table_number}
              </button>
            )}
            {!isEditor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '12px', fontWeight: '700' }}>
                <CheckCircle2 size={15} />
                <span>Свободен на {selectedTime || 'выбранное время'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
