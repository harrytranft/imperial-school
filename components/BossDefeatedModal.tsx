import React from 'react';
import { BossContribution, BossInstance, Student } from '../types';

interface BossDefeatedModalProps {
  boss: BossInstance;
  topContributors: BossContribution[];
  studentsById: Record<string, Student>;
  onClose: () => void;
}

export const BossDefeatedModal: React.FC<BossDefeatedModalProps> = ({ boss, topContributors, studentsById, onClose }) => {
  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-[36px] border-[6px] border-amber-300 bg-white p-7 text-center shadow-[0_30px_90px_rgba(245,158,11,0.45)]">
        <div className="text-6xl">{boss.icon}</div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.28em] text-amber-700">Boss Defeated</p>
        <h2 className="mt-2 text-3xl font-royal text-amber-950">{boss.name} đã bị đánh bại!</h2>

        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-left">
          <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.2em] text-amber-900">Top 5 Contributors</p>
          <div className="space-y-2">
            {topContributors.map((contribution, index) => (
              <div key={contribution.studentId} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-black text-amber-950">
                <span>{['🥇', '🥈', '🥉'][index] || `${index + 1}.`} {studentsById[contribution.studentId]?.name || 'Trainer'}</span>
                <span>{contribution.damageDealt} DMG</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-800">
          Mỗi Top 5 nhận +5 Hào Quang và 1 Legendary Egg trong inventory.
        </p>

        <button
          onClick={onClose}
          className="mt-5 rounded-2xl bg-amber-600 px-8 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:bg-amber-700"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
};
