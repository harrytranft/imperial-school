import { PokemonExpedition, Student } from './types';
import {
  addPokemonXp,
  clamp,
  getPokemonDisplayName,
  normalizePokemonPet,
  stableHash,
  updatePetInCollection
} from './pokemonProgression';

export const EXPEDITION_DURATION_MS = 8 * 60 * 60 * 1000;

const createId = (prefix: string): string => {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createPokemonExpedition = (student: Student, timestamp = Date.now()): PokemonExpedition | undefined => {
  if (!student.pet?.instanceId) return undefined;
  return {
    expeditionId: createId('expedition'),
    petInstanceId: student.pet.instanceId,
    startedAt: timestamp,
    resolvesAt: timestamp + EXPEDITION_DURATION_MS,
    status: 'active',
    seed: `${student.id}:${student.pet.instanceId}:${timestamp}`
  };
};

export const getExpeditionReward = (expedition: PokemonExpedition, student: Student) => {
  const pet = student.pet ? normalizePokemonPet(student.pet) : undefined;
  const rareThreshold = pet?.natureId === 'curious' ? 22 : 20;
  const roll = stableHash(`expedition-rare:${expedition.seed}`) % 100;
  const rare = roll < rareThreshold;
  return {
    xp: rare ? 24 : 14,
    bond: rare ? 4 : 2,
    eggFragments: rare ? 2 : 1,
    rare
  };
};

export const markExpeditionReadyIfDue = (student: Student, timestamp = Date.now()): Student => {
  const expedition = student.expedition;
  if (!expedition || expedition.status !== 'active' || timestamp < expedition.resolvesAt) return student;
  return {
    ...student,
    expedition: {
      ...expedition,
      status: 'ready',
      reward: getExpeditionReward(expedition, student)
    }
  };
};

export const ensureActiveExpedition = (student: Student, timestamp = Date.now()): Student => {
  if (!student.pet || (student.expedition && student.expedition.status !== 'claimed')) return student;
  const expedition = createPokemonExpedition(student, timestamp);
  if (!expedition) return student;
  return {
    ...student,
    expedition
  };
};

export const claimReadyExpedition = (student: Student, timestamp = Date.now()): { student: Student; message?: string } => {
  const readyStudent = markExpeditionReadyIfDue(student, timestamp);
  const expedition = readyStudent.expedition;
  if (!expedition || expedition.status !== 'ready' || !readyStudent.pet) {
    return { student: readyStudent };
  }

  const reward = expedition.reward || getExpeditionReward(expedition, readyStudent);
  const pet = normalizePokemonPet(readyStudent.pet);
  const xpResult = addPokemonXp(pet, reward.xp);
  const nextPet = {
    ...xpResult.pet,
    bond: clamp((xpResult.pet.bond || 0) + reward.bond, 0, 100)
  };
  const nextStudent: Student = {
    ...readyStudent,
    pet: nextPet,
    pets: updatePetInCollection(readyStudent, nextPet),
    expedition: {
      ...expedition,
      status: 'claimed',
      reward
    }
  };

  return {
    student: ensureActiveExpedition(nextStudent, timestamp),
    message: `${getPokemonDisplayName(nextPet)} trở về Expedition: +${reward.xp} XP, +${reward.bond} Bond${reward.rare ? ', rare loot' : ''}`
  };
};
