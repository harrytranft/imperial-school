import { describe, expect, it } from 'vitest';
import {
  EXPEDITION_DURATION_MS,
  claimReadyExpedition,
  createPokemonExpedition,
  ensureActiveExpedition,
  markExpeditionReadyIfDue
} from './expeditionSystem';
import { createPokemonPetFromDexId } from './pokemonProgression';
import { Gender, Student } from './types';

const makeStudent = (overrides: Partial<Student> = {}): Student => ({
  id: 'student-1',
  name: 'Student One',
  gender: Gender.MALE,
  className: 'Class A',
  points: 0,
  history: [],
  ...overrides
});

describe('expedition system', () => {
  it('creates an active expedition for the current pet', () => {
    const pet = createPokemonPetFromDexId(25, undefined, { isShiny: false });
    const expedition = createPokemonExpedition(makeStudent({ pet }), 1000);

    expect(expedition?.petInstanceId).toBe(pet.instanceId);
    expect(expedition?.startedAt).toBe(1000);
    expect(expedition?.resolvesAt).toBe(1000 + EXPEDITION_DURATION_MS);
    expect(expedition?.status).toBe('active');
  });

  it('marks expeditions ready only after their resolve time', () => {
    const pet = createPokemonPetFromDexId(4, undefined, { isShiny: false });
    const student = ensureActiveExpedition(makeStudent({ pet }), 1000);

    expect(markExpeditionReadyIfDue(student, 1000 + EXPEDITION_DURATION_MS - 1).expedition?.status).toBe('active');

    const readyStudent = markExpeditionReadyIfDue(student, 1000 + EXPEDITION_DURATION_MS);
    expect(readyStudent.expedition?.status).toBe('ready');
    expect(readyStudent.expedition?.reward?.xp).toBeGreaterThan(0);
    expect(readyStudent.expedition?.reward?.eggFragments).toBeGreaterThan(0);
  });

  it('claims ready expedition rewards and starts the next expedition', () => {
    const pet = createPokemonPetFromDexId(7, undefined, { isShiny: false });
    const student = ensureActiveExpedition(makeStudent({ pet, pets: [pet] }), 1000);

    const result = claimReadyExpedition(student, 1000 + EXPEDITION_DURATION_MS);

    expect(result.message).toContain('Expedition');
    expect(result.student.pet?.totalXp).toBeGreaterThan(pet.totalXp || 0);
    expect(result.student.pet?.bond).toBeGreaterThan(pet.bond || 0);
    expect(result.student.expedition?.status).toBe('active');
    expect(result.student.expedition?.startedAt).toBe(1000 + EXPEDITION_DURATION_MS);
  });
});
