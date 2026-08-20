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
  onSuccess: () => void;
  onFailure: () => void;
  resolving?: boolean;
}

export const BossBattlePanel: React.FC<BossBattlePanelProps> = ({
  boss,
  party,
  topContributors,
  randomsSinceLastEncounter,
  onSuccess,
  onFailure,
  resolving = false
}) => {
  const successDamage = party.length * boss.damagePerSuccessfulStudent;

  return (
    <div className="space-y-5 text-left">
      <BossHpBar boss={boss} />

      <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-900">Cả 5 trainer phải trả lời đúng</p>
        <p className="mt-1 text-xs font-bold text-red-800">
          Thắng: Boss -{successDamage} HP, mỗi trainer +5 Hào Quang. Sai một bạn: toàn đội bị Boss phản công -{boss.failDamage} HP Pokémon.
        </p>
        <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-red-700">
          Normal Random since last encounter: {randomsSinceLastEncounter}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {party.map(student => (
          <div key={student.id} className="rounded-2xl border-2 border-amber-200 bg-white p-3 text-center shadow-sm">
            <StudentAvatar student={student} className="mx-auto h-14 w-14 rounded-full border-2 border-amber-400 object-cover" />
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
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-900">Top Contributors</p>
          <div className="space-y-2">
            {topContributors.slice(0, 5).map((item, index) => (
              <div key={item.contribution.studentId} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-xs font-black text-amber-950">
                <span>{index + 1}. {item.student?.name || 'Trainer'}</span>
                <span>{item.contribution.damageDealt} DMG</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          disabled={resolving}
          onClick={onSuccess}
          className="rounded-2xl bg-emerald-600 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg transition-all hover:bg-emerald-700 disabled:opacity-50"
        >
          ✅ Cả 5 đều đúng
        </button>
        <button
          disabled={resolving}
          onClick={onFailure}
          className="rounded-2xl bg-red-700 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg transition-all hover:bg-red-800 disabled:opacity-50"
        >
          ❌ Có ít nhất 1 bạn sai
        </button>
      </div>
    </div>
  );
};
