import React from 'react';
import { PokemonPet, StudentPokemonProgress } from '../types';
import { getPokemonArtworkUrl, getPokemonDisplayName, getPokemonNatureDefinition, handlePokemonArtworkError, xpNeededForNextLevel } from '../pokemonProgression';
import { PokemonPassiveBadge } from './PokemonPassiveBadge';

interface PokemonMiniStatusProps {
  pet?: PokemonPet;
  progress?: StudentPokemonProgress;
  tone?: 'amber' | 'purple' | 'emerald';
  showImage?: boolean;
  streakLabel?: string;
  streakValue?: number;
  className?: string;
}

const toneClasses = {
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  purple: 'border-purple-200 bg-purple-50 text-purple-950',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950'
};

const hpColor = (hp: number): string => {
  if (hp > 50) return 'bg-emerald-500';
  if (hp > 20) return 'bg-amber-500';
  return 'bg-red-500';
};

export const PokemonMiniStatus: React.FC<PokemonMiniStatusProps> = ({
  pet,
  progress,
  tone = 'amber',
  showImage = true,
  streakLabel = 'Streak',
  streakValue,
  className = ''
}) => {
  if (!pet) {
    return (
      <div className={`rounded-2xl border border-dashed p-3 text-center text-[10px] font-bold text-gray-400 ${className}`}>
        Chưa có Pokémon đồng hành
      </div>
    );
  }

  const hp = Math.min(100, Math.max(0, pet.hp ?? 100));
  const level = pet.level || 1;
  const xp = pet.xp || 0;
  const neededXp = xpNeededForNextLevel(level);
  const xpPct = Math.min(100, Math.max(0, (xp / neededXp) * 100));
  const charge = Math.min(5, Math.max(0, pet.charge || 0));
  const nature = getPokemonNatureDefinition(pet.natureId);
  const danger = hp <= 20;
  const masteryStars = pet.masteryStars || 0;

  return (
    <div className={`rounded-2xl border p-3 shadow-sm ${toneClasses[tone]} ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        {showImage && (
          <div className={`relative shrink-0 rounded-2xl ${danger ? 'ring-2 ring-red-500 animate-pulse' : masteryStars >= 5 ? 'ring-2 ring-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.55)]' : masteryStars >= 3 ? 'ring-2 ring-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.45)]' : ''}`}>
            <img
              referrerPolicy="no-referrer"
              src={getPokemonArtworkUrl(pet)}
              onError={event => handlePokemonArtworkError(event, pet)}
              className={`h-14 w-14 object-contain drop-shadow ${pet.isShiny ? 'rounded-2xl bg-amber-100 ring-2 ring-amber-300' : ''}`}
              alt={getPokemonDisplayName(pet)}
            />
          </div>
        )}

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-black">{pet.isShiny ? '✨ ' : ''}{getPokemonDisplayName(pet)}</p>
              <p className="truncate text-[9px] font-bold opacity-60">{nature.icon} {nature.name} · {pet.speciesName || pet.name} · Lv.{level}</p>
            </div>
            <PokemonPassiveBadge passiveId={pet.passiveId} compact className="shrink-0" />
          </div>

          <div className="mt-2 space-y-1.5">
            <div>
              <div className="mb-0.5 flex justify-between text-[9px] font-black">
                <span>HP</span>
                <span>{hp}/100</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/80">
                <div className={`h-full rounded-full ${hpColor(hp)}`} style={{ width: `${hp}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-0.5 flex justify-between text-[9px] font-black">
                <span>XP</span>
                <span>{xp}/{neededXp}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/80">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[9px] font-black">
        <div className="rounded-xl bg-white/80 px-1.5 py-1">
          <span className="block opacity-50">Bond</span>
          <span>{pet.bond || 0}</span>
        </div>
        <div className="rounded-xl bg-white/80 px-1.5 py-1">
          <span className="block opacity-50">{streakLabel}</span>
          <span>x{streakValue ?? progress?.answerStreak ?? 0}</span>
        </div>
        <div className="rounded-xl bg-white/80 px-1.5 py-1">
          <span className="block opacity-50">Charge</span>
          <span>{'●'.repeat(charge)}{'○'.repeat(5 - charge)}</span>
        </div>
      </div>
    </div>
  );
};
