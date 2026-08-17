import React from 'react';
import { Student } from '../types';
import { LIST_POKEMONS, POKEMON_EVOLUTION_CHAINS } from '../pokemonData';
import { getPokemonArtworkUrl, getSpeciesForDexId } from '../pokemonProgression';

interface PokedexSpecies {
  dexId: number;
  name: string;
  types: string[];
}

const buildPokedexCatalog = (): PokedexSpecies[] => {
  const byDexId = new Map<number, PokedexSpecies>();
  LIST_POKEMONS.forEach(pokemon => {
    byDexId.set(pokemon.dexId, { dexId: pokemon.dexId, name: pokemon.name, types: pokemon.types });
  });
  Object.values(POKEMON_EVOLUTION_CHAINS).forEach(stages => {
    stages.flat().forEach(option => {
      if (!byDexId.has(option.dexId)) {
        byDexId.set(option.dexId, { dexId: option.dexId, name: option.name, types: option.types });
      }
    });
  });
  return Array.from(byDexId.values()).sort((a, b) => a.dexId - b.dexId);
};

const CATALOG = buildPokedexCatalog();

export const PokemonPokedexPanel: React.FC<{ student: Student }> = ({ student }) => {
  const pokedex = student.pokedex || {};
  const discoveredCount = CATALOG.filter(species => pokedex[species.dexId]?.discovered).length;

  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50/40 p-6 space-y-4">
      <div className="flex flex-col gap-2 border-b border-sky-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-royal text-xl text-sky-900 flex items-center gap-2">
            <span>📕</span>
            <span>My Pokédex</span>
          </h4>
          <p className="text-xs font-bold text-sky-900/60">{discoveredCount}/{CATALOG.length} discovered</p>
        </div>
        <span className="w-max rounded-full border border-sky-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-800">
          Permanent collection
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
        {CATALOG.map(species => {
          const entry = pokedex[species.dexId];
          const discovered = !!entry?.discovered;
          const shinyDiscovered = !!entry?.shinyDiscovered;
          const displaySpecies = discovered ? getSpeciesForDexId(species.dexId) : species;

          return (
            <div
              key={species.dexId}
              className={`relative rounded-2xl border p-2 text-center min-w-0 ${
                discovered
                  ? 'border-sky-200 bg-white shadow-sm'
                  : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
              title={discovered ? displaySpecies.name : 'Undiscovered'}
            >
              <div className="aspect-square rounded-xl bg-sky-50/70 p-1 flex items-center justify-center overflow-hidden">
                {discovered ? (
                  <img
                    referrerPolicy="no-referrer"
                    src={getPokemonArtworkUrl({
                      dexId: species.dexId,
                      name: displaySpecies.name,
                      speciesName: displaySpecies.name,
                      types: displaySpecies.types,
                      accessories: [],
                      skills: [],
                      isShiny: shinyDiscovered
                    })}
                    onError={event => {
                      if (shinyDiscovered) {
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
                    className={`h-full w-full object-contain ${shinyDiscovered ? 'rounded-xl bg-amber-100 ring-2 ring-amber-300' : ''}`}
                    alt={displaySpecies.name}
                  />
                ) : (
                  <div className="text-3xl font-black text-gray-300">?</div>
                )}
              </div>
              <p className="mt-1 truncate text-[10px] font-black text-gray-800">
                {discovered ? `${shinyDiscovered ? '✨ ' : ''}${displaySpecies.name}` : '???'}
              </p>
              <p className="text-[8px] font-bold text-gray-400">#{species.dexId}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
