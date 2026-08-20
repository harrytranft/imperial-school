import React from 'react';
import { BossInstance } from '../types';

interface BossHpBarProps {
  boss: BossInstance;
}

export const BossHpBar: React.FC<BossHpBarProps> = ({ boss }) => {
  const hpPct = Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100));
  const danger = hpPct <= 25;

  return (
    <div className="rounded-3xl border-2 border-red-900 bg-gradient-to-br from-red-950 to-stone-950 p-5 text-white shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <span className={`text-5xl drop-shadow ${danger ? 'animate-pulse' : ''}`}>{boss.icon}</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200">Boss Raid</p>
            <h3 className="text-2xl font-black uppercase tracking-wide">{boss.name}</h3>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-red-200">HP</p>
          <p className="text-xl font-black">{boss.currentHp}/{boss.maxHp}</p>
        </div>
      </div>

      <div className="mt-4 h-4 overflow-hidden rounded-full border border-white/20 bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-700 ${danger ? 'bg-red-500' : 'bg-amber-400'}`}
          style={{ width: `${hpPct}%` }}
        />
      </div>
    </div>
  );
};
