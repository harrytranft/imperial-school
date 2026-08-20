import React from 'react';
import { BossContribution, BossInstance, Student } from '../types';
import { getPokemonDisplayName } from '../pokemonProgression';
import { BossHpBar } from './BossHpBar';
import { PokemonMiniStatus } from './PokemonMiniStatus';
import { StudentAvatar } from './StudentAvatar';

interface BossContributorView {
  contribution: BossContribution;
  student?: Student;
}

interface BossBattlePanelProps {
  boss: BossInstance;
  party: Student[];
  topContributors: BossContributorView[];
  randomsSinceLastEncounter: number;
  nextEncounterAt?: number;
  frequencyLabel?: string;
  onSuccess: () => void;
  onFailure: () => void;
  resolving?: boolean;
  visualResult?: 'success' | 'failure' | null;
}

export const BossBattlePanel: React.FC<BossBattlePanelProps> = ({
  boss,
  party,
  topContributors,
  randomsSinceLastEncounter,
  nextEncounterAt,
  frequencyLabel,
  onSuccess,
  onFailure,
  resolving = false,
  visualResult = null
}) => {
  const successDamage = party.length * boss.damagePerSuccessfulStudent;

  return (
    <div className={`space-y-5 text-left transition-all duration-300 ${visualResult === 'success' ? 'scale-[1.01] drop-shadow-[0_0_24px_rgba(16,185,129,0.45)]' : visualResult === 'failure' ? 'animate-pulse drop-shadow-[0_0_24px_rgba(220,38,38,0.55)]' : ''}`}>
      <BossHpBar boss={boss} />
      {visualResult && (
        <div className={`rounded-3xl border p-3 text-center text-xs font-black uppercase tracking-[0.18em] ${visualResult === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {visualResult === 'success' ? `Perfect Team Attack! Boss -${successDamage} HP` : `Boss phản công! Pokémon -${boss.failDamage} HP`}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Team Attack', `-${successDamage} HP`],
          ['Reward', '+5 Aura'],
          ['Counter', `-${boss.failDamage} HP`],
          ['Frequency', frequencyLabel || 'Boss']
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-4 text-center shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">{label}</p>
            <p className="mt-1 text-lg font-black text-red-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-red-100 bg-gradient-to-r from-red-50 via-white to-amber-50 p-4 text-center shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-900">Cả 5 trainer phải trả lời đúng</p>
        <p className="mt-1 text-xs font-bold leading-relaxed text-red-800">
          Thắng: Boss -{successDamage} HP, mỗi trainer +5 Hào Quang. Sai một bạn: toàn đội bị Boss phản công -{boss.failDamage} HP Pokémon.
        </p>
        <p className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider text-red-700 shadow-sm">
          Normal Random: {randomsSinceLastEncounter}{nextEncounterAt ? `/${nextEncounterAt}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {party.map((student, index) => (
          <div key={student.id} className={`relative overflow-hidden rounded-[26px] border-2 border-amber-200 bg-white p-3 text-center shadow-sm transition-all duration-300 ${visualResult === 'failure' ? 'border-red-300 bg-red-50' : visualResult === 'success' ? 'border-emerald-300 bg-emerald-50' : ''}`}>
            <div className="absolute left-2 top-2 rounded-full bg-stone-950 px-2 py-1 text-[9px] font-black text-white">#{index + 1}</div>
            <StudentAvatar student={student} className="mx-auto h-16 w-16 rounded-[22px] border-2 border-amber-400 object-cover shadow-md" />
            <p className="mt-2 truncate text-xs font-black text-stone-900">{student.name}</p>
            <p className="text-[9px] font-bold text-stone-400">{student.points} Hào Quang</p>
            <PokemonMiniStatus
              pet={student.pet}
              progress={student.pokemonProgress}
              tone="amber"
              showImage={false}
              className="mt-2"
            />
            {student.pet && (
              <p className="mt-1 truncate text-[9px] font-black text-amber-800">
                {getPokemonDisplayName(student.pet)}
              </p>
            )}
          </div>
        ))}
      </div>

      {topContributors.length > 0 && (
        <div className="rounded-[28px] border border-amber-200 bg-stone-950 p-4 text-white shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Top Contributors</p>
            <p className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-red-100">Damage Board</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {topContributors.slice(0, 5).map((item, index) => (
              <div key={item.contribution.studentId} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-center text-xs font-black">
                <p className="text-[9px] uppercase tracking-wider text-amber-200">Rank {index + 1}</p>
                <p className="mt-1 truncate text-white">{item.student?.name || 'Trainer'}</p>
                <p className="mt-1 text-amber-300">{item.contribution.damageDealt} DMG</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          disabled={resolving}
          onClick={onSuccess}
          className="rounded-[26px] bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.01] hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
        >
          ✅ Cả 5 đều đúng
        </button>
        <button
          disabled={resolving}
          onClick={onFailure}
          className="rounded-[26px] bg-gradient-to-r from-red-800 to-stone-900 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-950/25 transition-all hover:scale-[1.01] hover:from-red-900 hover:to-stone-950 disabled:opacity-50"
        >
          ❌ Có ít nhất 1 bạn sai
        </button>
      </div>
    </div>
  );
};
