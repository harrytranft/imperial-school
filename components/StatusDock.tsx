import React from 'react';

interface StatusDockProps {
  user: any;
  isSyncing: boolean;
  lastSyncedTime: number | null;
  onBackup: () => void;
  onRestore: () => void;
}

const formatSyncTime = (timestamp: number | null) => {
  if (!timestamp) return 'Chưa có lần sync';
  return new Date(timestamp).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const StatusDock: React.FC<StatusDockProps> = ({
  user,
  isSyncing,
  lastSyncedTime,
  onBackup,
  onRestore
}) => {
  const syncLabel = isSyncing ? 'Đang đồng bộ dữ liệu' : formatSyncTime(lastSyncedTime);
  const items = [
    {
      id: 'backup',
      label: 'Sao lưu đám mây',
      icon: '☁️',
      onClick: onBackup,
      disabled: !user || isSyncing,
      color: 'from-sky-300 via-blue-500 to-indigo-700'
    },
    {
      id: 'restore',
      label: 'Khôi phục dữ liệu',
      icon: '🔄',
      onClick: onRestore,
      disabled: !user || isSyncing,
      color: 'from-amber-200 via-orange-400 to-red-600'
    },
    {
      id: 'sync',
      label: isSyncing ? 'Đang sync' : 'Trạng thái sync',
      icon: isSyncing ? '⏳' : '✅',
      onClick: () => alert(syncLabel),
      disabled: false,
      color: isSyncing ? 'from-amber-200 via-yellow-400 to-amber-600' : 'from-emerald-300 via-teal-500 to-emerald-800'
    }
  ];

  return (
    <div className="fixed right-0 top-1/2 z-50 h-28 w-5 -translate-y-1/2 group/status">
      <div
        className="absolute right-0 top-1/2 flex -translate-y-1/2 translate-x-[calc(100%-18px)] flex-col items-center justify-center gap-3 rounded-l-[28px] border-2 border-white/90 bg-white/75 px-3 py-4 shadow-[0_25px_60px_-10px_rgba(20,50,120,0.22)] backdrop-blur-2xl transition-transform duration-300 ease-out group-hover/status:translate-x-0 focus-within:translate-x-0"
        style={{
          boxShadow: '0 20px 50px -10px rgba(20,50,120,0.22), 0 0 35px rgba(59,130,246,0.24), inset 0 2px 3px 0 rgba(255,255,255,1)'
        }}
      >
        {items.map(item => (
          <div key={item.id} className="relative group/item">
            <button
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              title={`${item.label}: ${item.id === 'sync' ? syncLabel : user ? syncLabel : 'Cần đăng nhập để dùng đám mây'}`}
              className={`grid h-14 w-14 place-items-center rounded-2xl border border-white/80 bg-gradient-to-br text-2xl shadow-lg transition-all active:scale-95 ${item.color} ${item.disabled ? 'cursor-not-allowed opacity-45' : 'hover:scale-110 hover:shadow-2xl'}`}
            >
              <span className="drop-shadow-md">{item.icon}</span>
              {item.id === 'sync' && (
                <span className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ${isSyncing ? 'bg-amber-300 animate-ping' : 'bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.9)]'}`} />
              )}
            </button>
            <div className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-2xl border border-blue-200/60 bg-slate-950/90 px-3 py-2 text-[11px] font-black text-sky-100 shadow-xl backdrop-blur-md group-hover/item:block">
              <div className="uppercase tracking-wider">{item.label}</div>
              <div className="mt-0.5 text-[9px] font-bold normal-case tracking-normal text-sky-100/70">{item.id === 'sync' ? syncLabel : user ? syncLabel : 'Cần đăng nhập Google/Supabase'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
