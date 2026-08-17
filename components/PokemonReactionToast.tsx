import React from 'react';
import { PokemonUiEvent } from '../gameEvents';

interface PokemonReactionToastProps {
  events: PokemonUiEvent[];
  title?: string;
}

const labelForType = (type: PokemonUiEvent['type']): string => {
  switch (type) {
    case 'xp':
      return 'XP';
    case 'bond':
      return 'Bond';
    case 'streak':
      return 'Streak';
    case 'passive':
      return 'Passive';
    case 'charge-ready':
      return 'Power';
    case 'level-up':
      return 'Level Up';
    case 'evolution':
      return 'Evolution';
    case 'hp':
      return 'HP';
    case 'random-drop':
      return 'Drop';
    case 'mastery':
      return 'Mastery';
    default:
      return 'Event';
  }
};

export const PokemonReactionToast: React.FC<PokemonReactionToastProps> = ({ events, title = 'Tiến triển Pokémon' }) => {
  if (events.length === 0) return null;
  const visibleEvents = [...events].sort((a, b) => Number(b.type === 'random-drop') - Number(a.type === 'random-drop')).slice(0, 4);

  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-[320] w-[min(92vw,420px)] -translate-x-1/2 animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-200">
      <div className="rounded-3xl border-4 border-amber-300 bg-white/95 p-4 text-left shadow-[0_18px_50px_rgba(120,53,15,0.25)] backdrop-blur">
        <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">{title}</p>
        <div className="space-y-1.5">
          {visibleEvents.map((event, index) => (
            <div key={`${event.type}-${index}-${event.message}`} className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2">
              <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-white">
                {labelForType(event.type)}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-black text-amber-950">{event.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
