import React from 'react';
import { BossInstance } from '../types';

interface BossHpBarProps {
  boss: BossInstance;
}

export const BossHpBar: React.FC<BossHpBarProps> = ({ boss }) => {
  const hpPct = Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100));
  const danger = hpPct <= 25;
  const wounded = hpPct <= 55;

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-red-200 bg-stone-950 p-5 text-white shadow-2xl shadow-red-950/25">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.28),transparent_28%),radial-gradient(circle_at_78%_0%,rgba(248,113,113,0.22),transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-red-500 to-fuchsia-500" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 text-left">
          <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-[28px] border border-white/15 bg-white/10 text-5xl shadow-inner ${danger ? 'animate-pulse' : ''}`}>
            {boss.icon}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-200">Boss Raid Encounter</p>
            <h3 className="mt-1 text-3xl font-black uppercase tracking-wide">{boss.name}</h3>
            <p className="mt-2 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-100">
              {boss.tier} tier
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left sm:text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-red-200">HP Remaining</p>
          <p className="mt-1 text-2xl font-black">{boss.currentHp}/{boss.maxHp}</p>
          <p className={`mt-1 text-[10px] font-black uppercase tracking-wider ${danger ? 'text-red-200' : wounded ? 'text-amber-200' : 'text-emerald-200'}`}>
            {danger ? 'Critical' : wounded ? 'Wounded' : 'Threat Active'}
          </p>
        </div>
      </div>

      <div className="relative mt-5 h-5 overflow-hidden rounded-full border border-white/20 bg-black/40">
        <div
          className={`h-full rounded-full transition-all duration-700 ${danger ? 'bg-gradient-to-r from-red-700 via-red-500 to-orange-300' : wounded ? 'bg-gradient-to-r from-orange-600 via-amber-400 to-yellow-200' : 'bg-gradient-to-r from-emerald-500 via-amber-300 to-red-400'}`}
          style={{ width: `${hpPct}%` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0,rgba(255,255,255,0.28)_50%,transparent_100%)] opacity-30" />
      </div>
      <div className="relative mt-2 flex justify-between text-[9px] font-black uppercase tracking-[0.18em] text-red-100/80">
        <span>0</span>
        <span>{Math.round(hpPct)}%</span>
        <span>{boss.maxHp}</span>
      </div>
    </div>
  );
};
