import { PokemonPet, Student, StudentPokemonProgress } from './types';
import { LIST_POKEMONS, POKEMON_EVOLUTION_CHAINS } from './pokemonData';
import { getPassiveIdForBaseDexId } from './pokemonPassives';

const MAX_NORMAL_LEVEL = 30;
const STAGE_MIN_LEVELS = [1, 5, 12, 20, 30];
const MASTERY_STAR_THRESHOLDS = [300, 700, 1200, 1800, 2600];

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export const stableHash = (input: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createPokemonInstanceId = (): string => {
  return globalThis.crypto?.randomUUID?.() || `pet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getPokemonDisplayName = (pet?: PokemonPet): string => {
  if (!pet) return '';
  return pet.nickname || pet.speciesName || pet.name;
};

const officialArtworkUrl = (dexId: number, shiny = false, cdn: 'jsdelivr' | 'raw' = 'jsdelivr'): string => {
  const shinyPath = shiny ? 'shiny/' : '';
  const prefix = cdn === 'jsdelivr'
    ? 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master'
    : 'https://raw.githubusercontent.com/PokeAPI/sprites/master';
  return `${prefix}/sprites/pokemon/other/official-artwork/${shinyPath}${dexId}.png`;
};

const spriteUrl = (dexId: number, cdn: 'jsdelivr' | 'raw' = 'jsdelivr'): string => {
  const prefix = cdn === 'jsdelivr'
    ? 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master'
    : 'https://raw.githubusercontent.com/PokeAPI/sprites/master';
  return `${prefix}/sprites/pokemon/${dexId}.png`;
};

const normalizePokemonNameForArtwork = (name?: string): string => {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const findStandardArtworkDexId = (pet?: PokemonPet): number | undefined => {
  const sourceName = normalizePokemonNameForArtwork(pet?.speciesName || pet?.name);
  if (!sourceName) return undefined;

  const exactMatch = LIST_POKEMONS.find(pokemon => normalizePokemonNameForArtwork(pokemon.name) === sourceName);
  if (exactMatch) return exactMatch.dexId;

  const nameMatch = [...LIST_POKEMONS]
    .sort((a, b) => b.name.length - a.name.length)
    .find(pokemon => sourceName.includes(normalizePokemonNameForArtwork(pokemon.name)));

  return nameMatch?.dexId;
};

export const getPokemonArtworkCandidates = (pet?: PokemonPet, forceNormal = false): string[] => {
  const requestedDexId = pet?.dexId || 25;
  const standardArtworkDexId = findStandardArtworkDexId(pet);
  const dexIds = Array.from(new Set([
    requestedDexId > 1025 ? standardArtworkDexId : requestedDexId,
    standardArtworkDexId,
    pet?.baseDexId,
    requestedDexId,
    25
  ].filter(Boolean)));
  const candidates: string[] = [];
  const includeShiny = !!pet?.isShiny && !forceNormal;

  dexIds.forEach(dexId => {
    if (includeShiny) {
      candidates.push(officialArtworkUrl(dexId, true, 'jsdelivr'));
      candidates.push(officialArtworkUrl(dexId, true, 'raw'));
    }
    candidates.push(officialArtworkUrl(dexId, false, 'jsdelivr'));
    candidates.push(officialArtworkUrl(dexId, false, 'raw'));
    candidates.push(spriteUrl(dexId, 'jsdelivr'));
    candidates.push(spriteUrl(dexId, 'raw'));
  });

  return Array.from(new Set(candidates));
};

export const getPokemonFallbackPlaceholderUrl = (pet?: PokemonPet): string => {
  const name = getPokemonDisplayName(pet) || 'Pokemon';
  const types = pet?.types?.join(' / ') || 'Pokemon';
  const escapedName = name.replace(/[<>&"]/g, '');
  const escapedTypes = types.replace(/[<>&"]/g, '');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff7ed"/>
          <stop offset="55%" stop-color="#fef3c7"/>
          <stop offset="100%" stop-color="#fee2e2"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="44" fill="url(#bg)"/>
      <circle cx="120" cy="100" r="58" fill="#ffffff" stroke="#f59e0b" stroke-width="8"/>
      <path d="M62 100h116" stroke="#111827" stroke-width="10" stroke-linecap="round"/>
      <circle cx="120" cy="100" r="18" fill="#ffffff" stroke="#111827" stroke-width="8"/>
      <text x="120" y="183" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#92400e">${escapedName.slice(0, 18)}</text>
      <text x="120" y="207" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#b45309">${escapedTypes.slice(0, 24)}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const getPokemonArtworkUrl = (pet?: PokemonPet, forceNormal = false): string => {
  return getPokemonArtworkCandidates(pet, forceNormal)[0] || getPokemonFallbackPlaceholderUrl(pet);
};

export const handlePokemonArtworkError = (event: { currentTarget: HTMLImageElement }, pet?: PokemonPet): void => {
  const target = event.currentTarget;
  const currentIndex = Number(target.dataset.pokemonArtworkFallbackIndex || '0');
  const candidates = getPokemonArtworkCandidates(pet);
  const nextIndex = currentIndex + 1;

  if (nextIndex < candidates.length) {
    target.dataset.pokemonArtworkFallbackIndex = String(nextIndex);
    target.src = candidates[nextIndex];
    return;
  }

  target.dataset.pokemonArtworkFallbackIndex = String(nextIndex);
  target.src = getPokemonFallbackPlaceholderUrl(pet);
};

export const getDefaultPokemonProgress = (): StudentPokemonProgress => ({
  answerStreak: 0,
  bestAnswerStreak: 0,
  battleWinStreak: 0,
  bestBattleWinStreak: 0,
  homeworkStreak: 0,
  bestHomeworkStreak: 0,
  positiveSoloCount: 0,
  battleWins: 0
});

export const xpNeededForNextLevel = (level: number): number => {
  return Math.min(150, 30 + (Math.max(1, level) - 1) * 5);
};

export const totalXpForLevel = (level: number): number => {
  let total = 0;
  for (let current = 1; current < Math.max(1, level); current += 1) {
    total += xpNeededForNextLevel(current);
  }
  return total;
};

export const getLevelProgressFromTotalXp = (totalXpValue: number): { level: number; xp: number; masteryXp: number; masteryStars: number } => {
  let remainingXp = Math.max(0, Math.floor(totalXpValue));
  let level = 1;

  while (level < MAX_NORMAL_LEVEL && remainingXp >= xpNeededForNextLevel(level)) {
    remainingXp -= xpNeededForNextLevel(level);
    level += 1;
  }

  if (level >= MAX_NORMAL_LEVEL) {
    const masteryXp = Math.max(0, remainingXp);
    return {
      level: MAX_NORMAL_LEVEL,
      xp: 0,
      masteryXp,
      masteryStars: getMasteryStarsForXp(masteryXp)
    };
  }

  return {
    level,
    xp: remainingXp,
    masteryXp: 0,
    masteryStars: 0
  };
};

export const getMasteryStarsForXp = (masteryXp: number): number => {
  return MASTERY_STAR_THRESHOLDS.filter(threshold => masteryXp >= threshold).length;
};

export const getNextMasteryTarget = (masteryStars: number): number | null => {
  return MASTERY_STAR_THRESHOLDS[masteryStars] || null;
};

export const getEvolutionStageForLevel = (level: number): number => {
  if (level >= 30) return 4;
  if (level >= 20) return 3;
  if (level >= 12) return 2;
  if (level >= 5) return 1;
  return 0;
};

export const findBaseDexIdForDexId = (dexId: number): number | undefined => {
  if (POKEMON_EVOLUTION_CHAINS[dexId]) return dexId;
  for (const [baseId, stages] of Object.entries(POKEMON_EVOLUTION_CHAINS)) {
    if (stages.some(options => options.some(option => option.dexId === dexId))) {
      return Number(baseId);
    }
  }
  return LIST_POKEMONS.find(pokemon => pokemon.dexId === dexId)?.dexId;
};

export const findEvolutionStageForDexId = (baseDexId: number, dexId: number, speciesName?: string): number => {
  const chain = POKEMON_EVOLUTION_CHAINS[baseDexId];
  if (!chain) return 0;
  const normalizedSpecies = speciesName?.trim().toLowerCase();
  const exactStage = chain.findIndex(options => options.some(option =>
    option.dexId === dexId && (!normalizedSpecies || option.name.toLowerCase() === normalizedSpecies)
  ));
  if (exactStage >= 0) return exactStage;
  const dexOnlyStage = chain.findIndex(options => options.some(option => option.dexId === dexId));
  return Math.max(0, dexOnlyStage);
};

export const getSpeciesForDexId = (dexId: number, baseDexId?: number): { dexId: number; name: string; types: string[] } => {
  if (baseDexId) {
    const chain = POKEMON_EVOLUTION_CHAINS[baseDexId];
    const match = chain?.flat().find(option => option.dexId === dexId);
    if (match) return match;
  }

  for (const stages of Object.values(POKEMON_EVOLUTION_CHAINS)) {
    const match = stages.flat().find(option => option.dexId === dexId);
    if (match) return match;
  }

  const listed = LIST_POKEMONS.find(pokemon => pokemon.dexId === dexId) || LIST_POKEMONS[0];
  return { dexId: listed.dexId, name: listed.name, types: listed.types };
};

export const getEvolvedFormForLevel = (
  baseDexId: number,
  level: number,
  instanceId?: string
): { dexId: number; name: string; types: string[] } => {
  const chain = POKEMON_EVOLUTION_CHAINS[baseDexId];
  if (!chain) return getSpeciesForDexId(baseDexId);

  const stageIndex = Math.min(chain.length - 1, getEvolutionStageForLevel(level));
  const options = chain[stageIndex] || chain[chain.length - 1] || chain[0];
  const seed = instanceId || `${baseDexId}-${stageIndex}`;
  const chosenIndex = stableHash(`${seed}-${stageIndex}`) % options.length;
  return options[chosenIndex] || options[0];
};

export const getNextEvolutionPreview = (pet?: PokemonPet): {
  isFinal: boolean;
  nextLevel?: number;
  nextSpeciesName?: string;
} => {
  if (!pet) return { isFinal: true };
  const normalizedPet = normalizePokemonPet(pet);
  const baseDexId = normalizedPet.baseDexId || normalizedPet.dexId;
  const chain = POKEMON_EVOLUTION_CHAINS[baseDexId];
  if (!chain || chain.length <= 1) return { isFinal: true };

  const currentStage = Math.min(chain.length - 1, getEvolutionStageForLevel(normalizedPet.level || 1));
  if (currentStage >= chain.length - 1) return { isFinal: true };

  const nextStage = currentStage + 1;
  const nextLevel = STAGE_MIN_LEVELS[nextStage] || STAGE_MIN_LEVELS[STAGE_MIN_LEVELS.length - 1];
  const nextSpecies = getEvolvedFormForLevel(baseDexId, nextLevel, normalizedPet.instanceId);
  return {
    isFinal: false,
    nextLevel,
    nextSpeciesName: nextSpecies.name
  };
};

export const isSamePokemonPet = (a?: PokemonPet, b?: PokemonPet): boolean => {
  if (!a || !b) return false;
  if (a.instanceId && b.instanceId) return a.instanceId === b.instanceId;
  return a.dexId === b.dexId && a.name === b.name && (a.baseDexId || a.dexId) === (b.baseDexId || b.dexId);
};

export const normalizePokemonPet = (pet: PokemonPet): PokemonPet => {
  const baseDexId = pet.baseDexId || findBaseDexIdForDexId(pet.dexId) || pet.dexId;
  const currentSpecies = getSpeciesForDexId(pet.dexId, baseDexId);
  const progressFromTotal = pet.totalXp !== undefined ? getLevelProgressFromTotalXp(pet.totalXp) : undefined;
  const level = clamp(progressFromTotal?.level ?? pet.level ?? 1, 1, MAX_NORMAL_LEVEL);
  const xp = Math.max(0, progressFromTotal?.xp ?? pet.xp ?? 0);
  const totalXp = Math.max(totalXpForLevel(level) + xp, pet.totalXp ?? 0);
  const speciesName = pet.speciesName || currentSpecies.name;
  const existingName = pet.name || speciesName;
  const nickname = pet.nickname || (existingName !== speciesName ? existingName : undefined);
  const instanceId = pet.instanceId || createPokemonInstanceId();
  const evolved = getEvolvedFormForLevel(baseDexId, level, instanceId);

  const masteryXp = Math.max(0, progressFromTotal?.masteryXp ?? pet.masteryXp ?? 0);
  const masteryStars = Math.max(0, pet.masteryStars ?? getMasteryStarsForXp(masteryXp), getMasteryStarsForXp(masteryXp));

  return {
    ...pet,
    instanceId,
    baseDexId,
    dexId: evolved.dexId,
    speciesName: evolved.name,
    nickname,
    name: nickname || evolved.name,
    types: evolved.types,
    hp: clamp(pet.hp ?? 100, 0, 100),
    accessories: pet.accessories || [],
    skills: pet.skills || [],
    skillUses: pet.skillUses || {},
    level,
    xp,
    totalXp,
    bond: clamp(pet.bond ?? 0, 0, 100),
    charge: clamp(pet.charge ?? 0, 0, 5),
    isShiny: pet.isShiny ?? false,
    masteryXp,
    masteryStars,
    passiveId: pet.passiveId || getPassiveIdForBaseDexId(baseDexId)
  };
};

export const createPokemonPetFromDexId = (
  dexId: number,
  nickname?: string,
  options: { isShiny?: boolean; shinyChance?: number } = {}
): PokemonPet => {
  const meta = LIST_POKEMONS.find(pokemon => pokemon.dexId === dexId) || LIST_POKEMONS[0];
  const isShiny = options.isShiny ?? (Math.random() < (options.shinyChance ?? 0.02));
  return normalizePokemonPet({
    instanceId: createPokemonInstanceId(),
    dexId: meta.dexId,
    baseDexId: meta.dexId,
    name: nickname || meta.name,
    speciesName: meta.name,
    nickname,
    types: meta.types,
    hp: 100,
    accessories: [],
    skills: [],
    isShiny
  });
};

export const updatePetInCollection = (student: Student, nextPet: PokemonPet): PokemonPet[] => {
  const currentPets = student.pets && student.pets.length > 0 ? student.pets : (student.pet ? [student.pet] : []);
  const normalizedPet = normalizePokemonPet(nextPet);
  const isUpdatingCurrentActive = !!student.pet && isSamePokemonPet(student.pet, normalizedPet);
  const updated = currentPets.map(pet => {
    const shouldReplace = isSamePokemonPet(pet, normalizedPet) || (isUpdatingCurrentActive && isSamePokemonPet(pet, student.pet));
    return shouldReplace ? normalizedPet : normalizePokemonPet(pet);
  });
  return updated.some(pet => isSamePokemonPet(pet, normalizedPet)) ? updated : [normalizedPet, ...updated];
};

export const normalizeStudentPokemonData = (student: Student): Student => {
  const progress = { ...getDefaultPokemonProgress(), ...(student.pokemonProgress || {}) };
  const activeOriginal = student.pet;
  const activePet = activeOriginal ? normalizePokemonPet(activeOriginal) : undefined;
  const normalizedPets = (student.pets || [])
    .map(pet => activeOriginal && isSamePokemonPet(pet, activeOriginal) ? activePet! : normalizePokemonPet(pet));

  if (activePet && !normalizedPets.some(pet => isSamePokemonPet(pet, activePet))) {
    normalizedPets.unshift(activePet);
  }

  const uniquePets = normalizedPets.filter((pet, index, pets) => {
    return pets.findIndex(candidate => isSamePokemonPet(candidate, pet)) === index;
  });

  return {
    ...student,
    pet: activePet,
    pets: uniquePets,
    pokemonProgress: progress
  };
};

export interface AddPokemonXpResult {
  pet: PokemonPet;
  xpApplied: number;
  levelUps: number;
  evolved: boolean;
  previousSpeciesName: string;
  masteryStarsGained: number;
}

export const addPokemonXp = (pet: PokemonPet, amount: number): AddPokemonXpResult => {
  let nextPet = normalizePokemonPet(pet);
  const previousSpeciesName = nextPet.speciesName || nextPet.name;
  const previousMasteryStars = nextPet.masteryStars || 0;
  let xpToApply = Math.max(0, Math.floor(amount));
  let levelUps = 0;

  if (nextPet.level! >= MAX_NORMAL_LEVEL) {
    const nextMasteryXp = (nextPet.masteryXp || 0) + xpToApply;
    nextPet = {
      ...nextPet,
      masteryXp: nextMasteryXp,
      masteryStars: getMasteryStarsForXp(nextMasteryXp),
      totalXp: (nextPet.totalXp || 0) + xpToApply
    };
    return { pet: nextPet, xpApplied: xpToApply, levelUps, evolved: false, previousSpeciesName, masteryStarsGained: Math.max(0, (nextPet.masteryStars || 0) - previousMasteryStars) };
  }

  let level = nextPet.level || 1;
  let xp = (nextPet.xp || 0) + xpToApply;
  let totalXp = (nextPet.totalXp || totalXpForLevel(level)) + xpToApply;

  while (level < MAX_NORMAL_LEVEL && xp >= xpNeededForNextLevel(level)) {
    xp -= xpNeededForNextLevel(level);
    level += 1;
    levelUps += 1;
  }

  if (level >= MAX_NORMAL_LEVEL && xp > 0) {
    const nextMasteryXp = (nextPet.masteryXp || 0) + xp;
    nextPet.masteryXp = nextMasteryXp;
    nextPet.masteryStars = getMasteryStarsForXp(nextMasteryXp);
    xp = 0;
  }

  const evolved = getEvolvedFormForLevel(nextPet.baseDexId || nextPet.dexId, level, nextPet.instanceId);
  nextPet = {
    ...nextPet,
    level,
    xp,
    totalXp,
    masteryStars: getMasteryStarsForXp(nextPet.masteryXp || 0),
    bond: clamp((nextPet.bond || 0) + levelUps, 0, 100),
    dexId: evolved.dexId,
    speciesName: evolved.name,
    name: nextPet.nickname || evolved.name,
    types: evolved.types
  };

  return {
    pet: nextPet,
    xpApplied: xpToApply,
    levelUps,
    evolved: previousSpeciesName !== evolved.name,
    previousSpeciesName,
    masteryStarsGained: Math.max(0, (nextPet.masteryStars || 0) - previousMasteryStars)
  };
};
