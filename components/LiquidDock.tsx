import React, { useState } from 'react';

interface DockItem {
  id: string;
  label: string;
  icon: string;
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
  onGroup: () => void;
  onTimer: () => void;
  onSelectAll: () => void;
  isMultiSelectMode: boolean;
  onToggleMultiSelect: () => void;
  selectedCount: number;
  user: any;
  isSyncing: boolean;
  onBackup: () => void;
  onRestore: () => void;
  onOpenFeedback: () => void;
  onDeleteSelected: () => void;
}

export const LiquidDock: React.FC<LiquidDockProps> = ({
  onRandom,
  onLudo,
  onLuckyWheel,
  onGroup,
  onTimer,
  onSelectAll,
  isMultiSelectMode,
  onToggleMultiSelect,
  selectedCount,
  user,
  isSyncing,
  onBackup,
  onRestore,
  onOpenFeedback,
  onDeleteSelected,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Define dock items with cohesive Imperial Glass colors
  const mainItems: DockItem[] = [
    {
      id: 'random',
      label: 'Rút Thăm Ngẫu Nhiên',
      icon: '🎲',
      onClick: onRandom,
      color: 'from-amber-400 via-rose-500 to-red-600',
    },
    {
      id: 'ludo',
      label: 'Đua Cá Ngựa Triều Đình',
      icon: '🐴',
      onClick: onLudo,
      color: 'from-amber-300 via-amber-500 to-orange-600',
    },
    {
      id: 'lucky-wheel',
      label: 'Vòng quay may mắn',
      icon: '🎡',
      onClick: onLuckyWheel,
      color: 'from-rose-400 via-fuchsia-500 to-purple-700',
    },
    {
      id: 'group',
      label: 'Chia Nhóm Tự Động',
      icon: '👥',
      onClick: onGroup,
      color: 'from-sky-400 via-blue-500 to-indigo-600',
    },
    {
      id: 'timer',
      label: 'Đồng Hồ Bấm Giờ',
      icon: '⏲️',
      onClick: onTimer,
      color: 'from-purple-400 via-fuchsia-500 to-pink-600',
    },
    {
      id: 'select-all',
      label: 'Chọn Tất Cả Học Sĩ',
      icon: '☑️',
      onClick: onSelectAll,
      color: 'from-emerald-400 via-teal-500 to-emerald-700',
    },
    {
      id: 'multi-select',
      label: isMultiSelectMode ? 'Tắt Chế Độ Chọn' : 'Chọn Nhiều Học Sĩ',
      icon: '🖐️',
      onClick: onToggleMultiSelect,
      active: isMultiSelectMode,
      color: isMultiSelectMode 
        ? 'from-red-600 via-red-700 to-red-900' 
        : 'from-amber-100 via-amber-200 to-amber-300 text-amber-950',
    },
  ];

  const cloudItems: DockItem[] = user ? [
    {
      id: 'backup',
      label: 'Sao Lưu Đám Mây',
      icon: '☁️',
      onClick: onBackup,
      disabled: isSyncing,
      color: 'from-amber-200 via-yellow-400 to-amber-500',
    },
    {
      id: 'restore',
      label: 'Khôi Phục Dữ Liệu',
      icon: '🔄',
      onClick: onRestore,
      disabled: isSyncing,
      color: 'from-amber-200 via-orange-300 to-amber-500',
    },
  ] : [];

  const items = [...mainItems, ...cloudItems];

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
              {/* Divider before cloud items */}
              {user && idx === mainItems.length && (
                <div className="h-8 w-[1.5px] bg-gradient-to-b from-amber-400/20 via-amber-900/30 to-amber-400/20 mx-1 shrink-0" />
              )}

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
                  <span className={`${fontSize} transition-all duration-200 select-none drop-shadow-md z-10`}>
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
