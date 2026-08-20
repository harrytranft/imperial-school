import { describe, expect, it } from 'vitest';
import { LIST_POKEMONS } from './pokemonData';
import { Gender, Student } from './types';
import { applyGameEventToStudent, applyPetHpDeltaToStudent } from './gameEvents';
import { addPokemonXp, createPokemonPetFromDexId, deterministicNatureFromInstanceId, getPokemonArtworkCandidates, totalXpForLevel } from './pokemonProgression';
import { addTrainerXp, applyBadgeRewards, normalizeTrainerProgress } from './trainerProgression';

const makeStudent = (overrides: Partial<Student> = {}): Student => ({
  id: 'student-1',
  name: 'Student One',
  gender: Gender.MALE,
  className: 'Class A',
  points: 0,
  history: [],
  ...overrides
});

describe('pokemon database', () => {
  it('contains the full National Dex source list used for random eggs and rewards', () => {
    expect(LIST_POKEMONS.length).toBeGreaterThanOrEqual(1025);
    expect(LIST_POKEMONS.some(pokemon => pokemon.dexId === 1 && pokemon.name === 'Bulbasaur')).toBe(true);
    expect(LIST_POKEMONS.some(pokemon => pokemon.dexId === 1025 && pokemon.name === 'Pecharunt')).toBe(true);
  });
});

describe('pokemon progression', () => {
  it('levels up and evolves from XP instead of aura points', () => {
    const pet = createPokemonPetFromDexId(1, undefined, { isShiny: false });
    const result = addPokemonXp(pet, totalXpForLevel(5));

    expect(result.pet.level).toBe(5);
    expect(result.levelUps).toBe(4);
    expect(result.evolved).toBe(true);
    expect(result.pet.speciesName).toBe('Ivysaur');
  });

  it('provides base species artwork fallbacks for special forms', () => {
    const pet = {
      ...createPokemonPetFromDexId(384, undefined, { isShiny: false }),
      dexId: 10079,
      baseDexId: 384,
      speciesName: 'Mega Rayquaza',
      name: 'Mega Rayquaza'
    };

    const candidates = getPokemonArtworkCandidates(pet);

    expect(candidates[0]).toContain('/384.png');
    expect(candidates.some(url => url.includes('/10079.png'))).toBe(true);
  });
});

describe('game events', () => {
  it('applies homework done streak progress and locks only completed homework lesson keys', () => {
    const pet = createPokemonPetFromDexId(4, undefined, { isShiny: false });
    const student = makeStudent({ pet, pets: [pet] });

    const result = applyGameEventToStudent(student, {
      type: 'HOMEWORK_COMPLETE',
      source: 'homework',
      studentId: student.id,
      lessonKey: 'Class A:2026-08-17',
      timestamp: 1
    });

    expect(result.student.pokemonProgress?.homeworkStreak).toBe(1);
    expect(result.student.pokemonProgress?.lastHomeworkLessonKey).toBe('Class A:2026-08-17');
    expect(result.student.pet?.totalXp).toBeGreaterThan(pet.totalXp || 0);
  });

  it('resets homework streak for missing homework', () => {
    const student = makeStudent({
      pokemonProgress: {
        answerStreak: 0,
        bestAnswerStreak: 0,
        battleWinStreak: 0,
        bestBattleWinStreak: 0,
        homeworkStreak: 4,
        bestHomeworkStreak: 4
      }
    });

    const result = applyGameEventToStudent(student, {
      type: 'HOMEWORK_MISSING',
      source: 'homework',
      studentId: student.id,
      lessonKey: 'Class A:2026-08-17',
      timestamp: 1
    });

    expect(result.student.pokemonProgress?.homeworkStreak).toBe(0);
    expect(result.student.pokemonProgress?.lastHomeworkLessonKey).toBe('Class A:2026-08-17');
  });

  it('releases the active pokemon through the shared HP event helper', () => {
    const pet = { ...createPokemonPetFromDexId(7, undefined, { isShiny: false }), hp: 5 };
    const student = makeStudent({ pet, pets: [pet] });

    const result = applyPetHpDeltaToStudent(student, -10, 'Test damage', 1);

    expect(result.releaseEvent?.studentId).toBe(student.id);
    expect(result.releaseEvent?.releasedPet.name).toBe(pet.name);
    expect(result.student.pet).toBeUndefined();
    expect(result.student.pets).toHaveLength(0);
    expect(result.student.history[0].reason).toContain('hết HP');
  });

  it('clamps positive HP changes at 100', () => {
    const pet = { ...createPokemonPetFromDexId(25, undefined, { isShiny: false }), hp: 98 };
    const student = makeStudent({ pet, pets: [pet] });

    const result = applyPetHpDeltaToStudent(student, 8, 'Homework Done', 1);

    expect(result.releaseEvent).toBeNull();
    expect(result.student.pet?.hp).toBe(100);
  });

  it('keeps pokemon nature deterministic for legacy instances', () => {
    const first = deterministicNatureFromInstanceId('legacy-pet-1', 25);
    const second = deterministicNatureFromInstanceId('legacy-pet-1', 25);

    expect(first).toBe(second);
  });

  it('applies Brave nature battle XP bonus', () => {
    const pet = { ...createPokemonPetFromDexId(4, undefined, { isShiny: false }), natureId: 'brave' as const };
    const student = makeStudent({ pet, pets: [pet] });

    const result = applyGameEventToStudent(student, {
      type: 'BATTLE_RESULT',
      source: 'battle',
      studentId: student.id,
      battleOutcome: 'win',
      battleScore: 5,
      timestamp: 1
    });

    expect(result.student.pet?.totalXp).toBe((pet.totalXp || 0) + 22);
  });
});

describe('trainer progression', () => {
  it('adds trainer XP independently from aura points', () => {
    const student = makeStudent({ points: -5 });
    const result = addTrainerXp(student, 100);

    expect(result.student.points).toBe(-5);
    expect(result.student.trainerProgress?.level).toBeGreaterThan(1);
  });

  it('awards badge rewards once', () => {
    const student = makeStudent({
      pokemonProgress: {
        answerStreak: 10,
        bestAnswerStreak: 10,
        battleWinStreak: 0,
        bestBattleWinStreak: 0,
        homeworkStreak: 0,
        bestHomeworkStreak: 0
      }
    });

    const first = applyBadgeRewards(student, 1);
    const second = applyBadgeRewards(first.student, 2);

    expect(first.newBadges.some(badge => badge.badgeId === 'blaze')).toBe(true);
    expect(second.newBadges).toHaveLength(0);
    expect(normalizeTrainerProgress(first.student).totalXp).toBe(20);
  });
});
