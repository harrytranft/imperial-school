import React, { useMemo } from 'react';
import { Gender, RankInfo, Student } from '../types';
import { LIST_POKEMONS, POKEMON_EVOLUTION_CHAINS } from '../pokemonData';
import { getPokemonArtworkUrl, getPokemonDisplayName, getSpeciesForDexId } from '../pokemonProgression';

interface GlobalPokedexModalProps {
  students: Student[];
  getRank: (pts: number, gender: Gender) => RankInfo;
  onClose: () => void;
}

interface PokedexSpecies {
  dexId: number;
  name: string;
  types: string[];
  baseDexId?: number;
}

const buildCatalog = (): PokedexSpecies[] => {
  const byDexId = new Map<number, PokedexSpecies>();

  LIST_POKEMONS.forEach(pokemon => {
    byDexId.set(pokemon.dexId, {
      dexId: pokemon.dexId,
      name: pokemon.name,
      types: pokemon.types,
      baseDexId: pokemon.dexId
    });
  });

  Object.entries(POKEMON_EVOLUTION_CHAINS).forEach(([baseDexId, stages]) => {
    stages.flat().forEach(species => {
      byDexId.set(species.dexId, {
        dexId: species.dexId,
        name: species.name,
        types: species.types,
        baseDexId: Number(baseDexId)
      });
    });
  });

  return Array.from(byDexId.values()).sort((a, b) => a.dexId - b.dexId);
};

const CATALOG = buildCatalog();

export const GlobalPokedexModal: React.FC<GlobalPokedexModalProps> = ({ students, getRank, onClose }) => {
  const ownership = useMemo(() => {
    const ownerMap = new Map<number, { owners: Student[]; shiny: boolean }>();

    students.forEach(student => {
      Object.values(student.pokedex || {}).forEach(entry => {
        if (!entry.discovered) return;
        const current = ownerMap.get(entry.dexId) || { owners: [], shiny: false };
        if (!current.owners.some(owner => owner.id === student.id)) current.owners.push(student);
        current.shiny = current.shiny || !!entry.shinyDiscovered;
        ownerMap.set(entry.dexId, current);
      });

      const pets = [...(student.pet ? [student.pet] : []), ...(student.pets || [])];
      pets.forEach(pet => {
        const current = ownerMap.get(pet.dexId) || { owners: [], shiny: false };
        if (!current.owners.some(owner => owner.id === student.id)) current.owners.push(student);
        current.shiny = current.shiny || !!pet.isShiny;
        ownerMap.set(pet.dexId, current);
      });
    });

    return ownerMap;
  }, [students]);

  const discoveredCount = CATALOG.filter(species => ownership.has(species.dexId)).length;

  return (
    <div className="fixed inset-0 z-[165] overflow-y-auto bg-[radial-gradient(circle_at_20%_0%,rgba(244,114,182,0.30),transparent_36%),radial-gradient(circle_at_90%_20%,rgba(56,189,248,0.28),transparent_32%),linear-gradient(135deg,#fff7ed,#fdf2f8_45%,#f8fafc)] p-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col py-6">
        <div className="mb-5 flex flex-col gap-3 rounded-[28px] border border-white/80 bg-white/65 p-5 shadow-[0_25px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-fuchsia-700">Imperial Global Pokédex</p>
            <h2 className="font-royal text-3xl uppercase text-gray-950">Pokédex toàn trường</h2>
            <p className="text-xs font-bold text-gray-500">{discoveredCount}/{CATALOG.length} Pokemon đã có học sinh nhận được</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl bg-gray-950 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:bg-gray-800"
          >
            Đóng
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {CATALOG.map(species => {
            const owned = ownership.get(species.dexId);
            const owner = owned?.owners[0];
            const ownerRank = owner ? getRank(owner.points, owner.gender) : null;
            const displaySpecies = getSpeciesForDexId(species.dexId, species.baseDexId);

            return (
              <div
                key={`${species.dexId}-${species.name}`}
                className="group relative min-h-[250px] rounded-[30px] border border-white/85 bg-white/62 p-4 text-center shadow-[0_24px_58px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-1 hover:bg-white/78 hover:shadow-[0_32px_76px_rgba(15,23,42,0.22)]"
              >
                {owner && (
                  <div className="absolute right-3 top-3 z-10">
                    <img
                      referrerPolicy="no-referrer"
                      src={owner.customAvatar || ownerRank?.avatar || 'https://api.dicebear.com/7.x/bottts/svg'}
                      className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-lg ring-2 ring-fuchsia-300"
                      title={`${owner.name}${(owned?.owners.length || 0) > 1 ? ` và ${owned!.owners.length - 1} học sinh khác` : ''}`}
                      alt={owner.name}
                    />
                    {(owned?.owners.length || 0) > 1 && (
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-fuchsia-700 px-1.5 py-0.5 text-[8px] font-black text-white">
                        +{owned!.owners.length - 1}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex h-36 items-center justify-center rounded-[24px] bg-white/55">
                  {owned ? (
                    <img
                      referrerPolicy="no-referrer"
                      src={getPokemonArtworkUrl({
                        dexId: species.dexId,
                        name: displaySpecies.name,
                        speciesName: displaySpecies.name,
                        types: displaySpecies.types,
                        accessories: [],
                        skills: [],
                        isShiny: owned.shiny
                      })}
                      onError={event => {
                        if (owned.shiny) {
                          event.currentTarget.src = getPokemonArtworkUrl({
                            dexId: species.dexId,
                            name: displaySpecies.name,
                            speciesName: displaySpecies.name,
                            types: displaySpecies.types,
                            accessories: [],
                            skills: []
                          }, true);
                        }
                      }}
                      className={`h-32 w-32 object-contain drop-shadow-xl ${owned.shiny ? 'rounded-3xl bg-amber-100 ring-4 ring-amber-300' : ''}`}
                      alt={getPokemonDisplayName({
                        dexId: species.dexId,
                        name: displaySpecies.name,
                        types: displaySpecies.types,
                        accessories: [],
                        skills: []
                      })}
                    />
                  ) : (
                    <div className="grid h-28 w-28 place-items-center rounded-full bg-slate-200 text-5xl font-black text-slate-400">?</div>
                  )}
                </div>

                <p className="mt-3 text-3xl font-black tracking-tight text-gray-950">
                  {owned ? `${owned.shiny ? '✨ ' : ''}#${String(species.dexId).padStart(3, '0')}` : '#???'}
                </p>
                <p className="mt-1 truncate text-xs font-black uppercase tracking-wider text-gray-400">
                  {owned ? displaySpecies.name : '???'}
                </p>

                <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 hidden rounded-[24px] border border-gray-900/10 bg-gray-950/95 p-3 text-left text-white shadow-2xl backdrop-blur-xl group-hover:block">
                  <p className="truncate text-sm font-black">{owned ? displaySpecies.name : 'Pokemon chưa khám phá'}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(owned ? displaySpecies.types : species.types).map(type => (
                      <span key={type} className="rounded-full bg-white/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-cyan-100">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
