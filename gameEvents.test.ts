import { describe, expect, it } from 'vitest';
import { LIST_POKEMONS } from './pokemonData';
import { Gender, Student } from './types';
import { applyGameEventToStudent, applyPetHpDeltaToStudent } from './gameEvents';
import { addPokemonXp, createPokemonPetFromDexId, totalXpForLevel } from './pokemonProgression';

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
});
