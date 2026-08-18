import React, { useEffect, useState } from 'react';

interface DockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number | string;
  active?: boolean;
  disabled?: boolean;
  color: string; // Tailored gradient theme
}

interface LiquidDockProps {
  onRandom: () => void;
  onLudo: () => void;
  onLuckyWheel: () => void;
  onShop: () => void;
  onGroup: () => void;
  onTimer: () => void;
  onSelectAll: () => void;
  isMultiSelectMode: boolean;
  onToggleMultiSelect: () => void;
  onResetAura: () => void;
  selectedCount: number;
  isSyncing: boolean;
  lastSyncedTime: number | null;
  onOpenFeedback: () => void;
  onDeleteSelected: () => void;
}

const formatVietnamTime = (date: Date) => new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}).format(date);

const formatVietnamMinute = (date: Date) => new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).format(date);

const getVietnamClockParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value || 0);
  return {
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second')
  };
};

const AnalogClockIcon: React.FC<{ now: Date; size?: number }> = ({ now, size = 48 }) => {
  const { hour, minute, second } = getVietnamClockParts(now);
  const hourDeg = ((hour % 12) * 30) + (minute * 0.5);
  const minuteDeg = minute * 6;
  const secondDeg = second * 6;
  const handScale = size / 48;

  return (
    <div
      className="relative shrink-0 rounded-full bg-white shadow-inner ring-2 ring-stone-900/20"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[9px] font-black leading-none text-stone-950">12</span>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-black leading-none text-stone-950">3</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black leading-none text-stone-950">6</span>
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-black leading-none text-stone-950">9</span>
      {[...Array(12)].map((_, index) => (
        <span
          key={index}
          className="absolute left-1/2 top-1/2 h-1.5 w-0.5 rounded-full bg-stone-500"
          style={{ transform: `translate(-50%, -50%) rotate(${index * 30}deg) translateY(-${size * 0.39}px)` }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 origin-bottom rounded-full bg-stone-950" style={{ width: `${4 * handScale}px`, height: `${14 * handScale}px`, transform: `translate(-50%, -100%) rotate(${hourDeg}deg)` }} />
      <span className="absolute left-1/2 top-1/2 origin-bottom rounded-full bg-stone-950" style={{ width: `${2.5 * handScale}px`, height: `${19 * handScale}px`, transform: `translate(-50%, -100%) rotate(${minuteDeg}deg)` }} />
      <span className="absolute left-1/2 top-1/2 origin-bottom rounded-full bg-red-600" style={{ width: `${1.5 * handScale}px`, height: `${21 * handScale}px`, transform: `translate(-50%, -100%) rotate(${secondDeg}deg)` }} />
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 ring-2 ring-stone-950" />
    </div>
  );
};

const DockSvg: React.FC<{ name: string }> = ({ name }) => {
  const common = 'h-7 w-7 stroke-current';
  if (name === 'random') return <svg viewBox="0 0 24 24" fill="none" className={common}><path strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M4 4h5l6 16h5M4 20h5l2.2-5.9M15 4h5v5M20 4l-5.8 5.8M4 20l5.8-5.8" /></svg>;
  if (name === 'ludo') return <svg viewBox="0 0 24 24" fill="none" className={common}><path strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M6 19V6.5A2.5 2.5 0 0 1 8.5 4h7A2.5 2.5 0 0 1 18 6.5V19M5 19h14M9 8h6M9 12h6M9 16h6" /></svg>;
  if (name === 'wheel') return <svg viewBox="0 0 24 24" fill="none" className={common}><circle cx="12" cy="12" r="8" strokeWidth="2.4" /><path strokeWidth="2.4" strokeLinecap="round" d="M12 4v16M4 12h16M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6" /><circle cx="12" cy="12" r="2" fill="currentColor" /></svg>;
  if (name === 'shop') return <svg viewBox="0 0 24 24" fill="none" className={common}><path strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M6 8h12l-1 11H7L6 8ZM9 8a3 3 0 0 1 6 0M8 12h8" /></svg>;
  if (name === 'group') return <svg viewBox="0 0 24 24" fill="none" className={common}><path strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 20a4 4 0 0 1 8 0M12 20a4 4 0 0 1 8 0" /></svg>;
  if (name === 'timer') return <svg viewBox="0 0 24 24" fill="none" className={common}><path strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 2M9 2h6M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM18 5l1.5-1.5" /></svg>;
  if (name === 'select') return <svg viewBox="0 0 24 24" fill="none" className={common}><path strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6M4 4h16v16H4z" /></svg>;
  if (name === 'multi') return <svg viewBox="0 0 24 24" fill="none" className={common}><path strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M5 12h14M5 17h14M9 7l-2 2-1-1M9 12l-2 2-1-1M9 17l-2 2-1-1" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" className={common}><path strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M7 7l1 13h8l1-13M10 11v5M14 11v5M9 7l1-3h4l1 3" /></svg>;
};

export const LiquidDock: React.FC<LiquidDockProps> = ({
  onRandom,
  onLudo,
  onLuckyWheel,
  onShop,
  onGroup,
  onTimer,
  onSelectAll,
  isMultiSelectMode,
  onToggleMultiSelect,
  onResetAura,
  selectedCount,
  isSyncing,
  lastSyncedTime,
  onOpenFeedback,
  onDeleteSelected,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Define dock items with cohesive Imperial Glass colors
  const mainItems: DockItem[] = [
    {
      id: 'random',
      label: 'Rút Thăm Ngẫu Nhiên',
      icon: <DockSvg name="random" />,
      onClick: onRandom,
      color: 'from-amber-400 via-rose-500 to-red-600',
    },
    {
      id: 'ludo',
      label: 'Đua Cá Ngựa',
      icon: <DockSvg name="ludo" />,
      onClick: onLudo,
      color: 'from-amber-300 via-amber-500 to-orange-600',
    },
    {
      id: 'lucky-wheel',
      label: 'Vòng quay may mắn',
      icon: <DockSvg name="wheel" />,
      onClick: onLuckyWheel,
      color: 'from-rose-400 via-fuchsia-500 to-purple-700',
    },
    {
      id: 'shop',
      label: 'Shop',
      icon: <DockSvg name="shop" />,
      onClick: onShop,
      color: 'from-cyan-300 via-emerald-400 to-teal-700',
    },
    {
      id: 'group',
      label: 'Chia Nhóm Tự Động',
      icon: <DockSvg name="group" />,
      onClick: onGroup,
      color: 'from-sky-400 via-blue-500 to-indigo-600',
    },
    {
      id: 'timer',
      label: 'Đồng Hồ Bấm Giờ',
      icon: <DockSvg name="timer" />,
      onClick: onTimer,
      color: 'from-purple-400 via-fuchsia-500 to-pink-600',
    },
    {
      id: 'select-all',
      label: 'Chọn Tất Cả Trainer',
      icon: <DockSvg name="select" />,
      onClick: onSelectAll,
      color: 'from-emerald-400 via-teal-500 to-emerald-700',
    },
    {
      id: 'multi-select',
      label: isMultiSelectMode ? 'Tắt Chế Độ Chọn' : 'Chọn Nhiều Trainer',
      icon: <DockSvg name="multi" />,
      onClick: onToggleMultiSelect,
      active: isMultiSelectMode,
      color: isMultiSelectMode 
        ? 'from-red-600 via-red-700 to-red-900' 
        : 'from-amber-100 via-amber-200 to-amber-300 text-amber-950',
    },
    {
      id: 'reset-aura',
      label: selectedCount > 0 ? `Reset Hào Quang (${selectedCount})` : 'Reset Hào Quang',
      icon: <DockSvg name="reset" />,
      onClick: onResetAura,
      color: 'from-rose-100 via-red-200 to-red-400 text-red-950',
    },
  ];

  const items = mainItems;
  const clockIndex = items.length;
  const syncLabel = isSyncing
    ? 'Đang đồng bộ'
    : lastSyncedTime
      ? `Sync gần nhất: ${new Date(lastSyncedTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      : 'Chưa có lần sync';

  // Magnification curve calculation
  const getItemSize = (index: number) => {
    if (hoveredIndex === null) return 52; // Default size (px)
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 80;  // Center magnified item
    if (distance === 1) return 66;  // Immediate neighbor
    if (distance === 2) return 58;  // Secondary neighbor
    return 52;
  };

  const getFontSize = (index: number) => {
    if (hoveredIndex === null) return 'text-2xl';
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 'text-4xl';
    if (distance === 1) return 'text-3xl';
    return 'text-2xl';
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[98vw]">
      {/* Dynamic Glass Container that expands smoothly as icons grow */}
      <div 
        onMouseLeave={() => setHoveredIndex(null)}
        className="liquid-glass-dock relative px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-full shadow-[0_25px_60px_-10px_rgba(120,20,20,0.25)] border-2 border-white/90 backdrop-blur-2xl bg-white/75 flex items-center justify-center gap-2 sm:gap-3.5 transition-all duration-300 ease-out"
        style={{
          boxShadow: '0 20px 50px -10px rgba(120,20,20,0.22), 0 0 35px rgba(212,175,55,0.3), inset 0 2px 3px 0 rgba(255,255,255,1)',
        }}
      >
        {/* Dock Items */}
        {items.map((item, idx) => {
          const size = getItemSize(idx);
          const fontSize = getFontSize(idx);
          const isHovered = hoveredIndex === idx;

          return (
            <React.Fragment key={item.id}>
              <div 
                className="relative group flex flex-col items-center justify-end shrink-0 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
              >
                {/* FLOATING GLASS TOOLTIP LABEL */}
                {isHovered && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-950/90 text-amber-200 border border-amber-400/60 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-none z-50 flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                )}

                {/* MAGNIFIED DOCK BUTTON */}
                <button
                  onClick={item.onClick}
                  disabled={item.disabled}
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                  }}
                  className={`relative rounded-2xl flex items-center justify-center transition-all duration-200 ease-out shadow-lg border border-white/80 active:scale-90 ${
                    item.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-2xl'
                  } bg-gradient-to-br ${item.color} ${item.active ? 'ring-4 ring-red-500 shadow-red-500/50 scale-105' : ''}`}
                >
                  {/* Glass Glossy Overlay */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/30 to-white/60 pointer-events-none" />

                  {/* Icon */}
                  <span className={`${fontSize} transition-all duration-200 select-none drop-shadow-md z-10 text-white`}>
                    {item.icon}
                  </span>

                  {/* Active Indicator Dot */}
                  {item.active && (
                    <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-amber-300 ring-2 ring-red-900 shadow-sm" />
                  )}
                </button>
              </div>
            </React.Fragment>
          );
        })}

        <div className="h-8 w-[1.5px] bg-gradient-to-b from-red-400/20 via-red-900/30 to-red-400/20 mx-1 shrink-0" />

        <div
          className="relative group flex flex-col items-center justify-end shrink-0 cursor-default"
          onMouseEnter={() => setHoveredIndex(clockIndex)}
        >
          {hoveredIndex === clockIndex && (
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-950/90 text-amber-200 border border-amber-400/60 px-3 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-none z-50">
              <div>GMT+7: {formatVietnamTime(now)}</div>
              <div className="mt-1 font-mono text-lg text-white">{formatVietnamMinute(now)}</div>
              <div className="mt-0.5 text-[9px] text-amber-100/70 normal-case tracking-normal">{syncLabel}</div>
            </div>
          )}
          <button
            type="button"
            style={{ width: `${getItemSize(clockIndex)}px`, height: `${getItemSize(clockIndex)}px` }}
            className="relative rounded-2xl flex items-center justify-center transition-all duration-200 ease-out shadow-lg border border-white/80 bg-gradient-to-br from-stone-950 via-black to-stone-800 hover:shadow-2xl"
            title={`GMT+7: ${formatVietnamTime(now)} · ${syncLabel}`}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none" />
            <AnalogClockIcon now={now} size={hoveredIndex === clockIndex ? 56 : 46} />
          </button>
        </div>

        {/* MULTI-SELECT ACTIONS BADGE BUTTONS */}
        {isMultiSelectMode && selectedCount > 0 && (
          <>
            <div className="h-8 w-[1.5px] bg-gradient-to-b from-red-400/20 via-red-900/30 to-red-400/20 mx-1 shrink-0" />
            <div className="flex items-center gap-2 shrink-0 animate-in slide-in-from-bottom-2">
              <button 
                onClick={onOpenFeedback}
                className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-wider border border-emerald-300/40 flex items-center gap-1.5"
              >
                <span>✨</span>
                <span>Phản Hồi ({selectedCount})</span>
              </button>
              <button 
                onClick={onDeleteSelected}
                className="bg-gradient-to-r from-red-700 to-rose-900 text-white px-4 py-2.5 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-wider border border-red-400/40 flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span className="hidden sm:inline">Xóa</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
