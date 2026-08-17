import React from 'react';
import { getPassiveDefinition, getPassiveIcon } from '../pokemonPassives';

interface PokemonPassiveBadgeProps {
  passiveId?: string;
  compact?: boolean;
  className?: string;
}

export const PokemonPassiveBadge: React.FC<PokemonPassiveBadgeProps> = ({ passiveId, compact = false, className = '' }) => {
  const passive = getPassiveDefinition(passiveId);
  if (!passive) return null;

  return (
    <span
      className={`inline-flex items-center min-w-0 gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-indigo-800 ${className}`}
      title={passive.description}
    >
      <span className="shrink-0">{getPassiveIcon(passive.id)}</span>
      <span className="truncate">{compact ? passive.shortName : passive.name}</span>
    </span>
  );
};
