import { describe, expect, it } from 'vitest';
import { Gender, Student } from './types';
import {
  BOSS_PARTY_SIZE,
  createClassBossState,
  getBossEncounterFrequencyOption,
  incrementBossEncounterCounter,
  isBossEncounterReady,
  recalibrateBossEncounterFrequency,
  resolveBossFailure,
  resolveBossSuccess,
  rollNextBossEncounterGap,
  selectBossParty
} from './bossSystem';
import { createPokemonPetFromDexId } from './pokemonProgression';

const makeStudent = (id: string, overrides: Partial<Student> = {}): Student => ({
  id,
  name: `Student ${id}`,
  gender: Gender.MALE,
  className: 'Class A',
  points: 0,
  history: [],
  pet: createPokemonPetFromDexId(25, undefined, { isShiny: false }),
  ...overrides
});

describe('boss system', () => {
  it('rolls default encounter gaps from 6 to 9', () => {
    for (let index = 0; index < 200; index += 1) {
      expect(rollNextBossEncounterGap()).toBeGreaterThanOrEqual(6);
      expect(rollNextBossEncounterGap()).toBeLessThanOrEqual(9);
    }
  });

  it('rolls encounter gaps by configured frequency', () => {
    const frequent = getBossEncounterFrequencyOption('frequent');
    const occasional = getBossEncounterFrequencyOption('occasional');
    const rare = getBossEncounterFrequencyOption('rare');

    for (let index = 0; index < 200; index += 1) {
      expect(rollNextBossEncounterGap('frequent')).toBeGreaterThanOrEqual(frequent.minGap);
      expect(rollNextBossEncounterGap('frequent')).toBeLessThanOrEqual(frequent.maxGap);
      expect(rollNextBossEncounterGap('occasional')).toBeGreaterThanOrEqual(occasional.minGap);
      expect(rollNextBossEncounterGap('occasional')).toBeLessThanOrEqual(occasional.maxGap);
      expect(rollNextBossEncounterGap('rare')).toBeGreaterThanOrEqual(rare.minGap);
      expect(rollNextBossEncounterGap('rare')).toBeLessThanOrEqual(rare.maxGap);
    }
  });

  it('recalibrates existing boss state when frequency changes', () => {
    const state = { ...createClassBossState('Class A'), randomsSinceLastEncounter: 4, nextEncounterAt: 14 };
    const recalibrated = recalibrateBossEncounterFrequency(state, 'frequent', 2);

    expect(recalibrated.nextEncounterAt).toBe(5);
    expect(recalibrated.encounterReady).toBe(false);

    const ready = incrementBossEncounterCounter(recalibrated, 3);
    expect(isBossEncounterReady(ready)).toBe(true);
  });

  it('increments encounter counter and marks ready at threshold', () => {
    let state = { ...createClassBossState('Class A'), nextEncounterAt: 2 };
    state = incrementBossEncounterCounter(state);
    expect(state.randomsSinceLastEncounter).toBe(1);
    expect(isBossEncounterReady(state)).toBe(false);

    state = incrementBossEncounterCounter(state);
    expect(state.randomsSinceLastEncounter).toBe(2);
    expect(isBossEncounterReady(state)).toBe(true);
  });

  it('selects exactly five eligible students and excludes absent/no-pet students', () => {
    const students = [
      ...Array.from({ length: 6 }, (_, index) => makeStudent(`s${index + 1}`)),
      makeStudent('absent', { isAbsent: true }),
      makeStudent('no-pet', { pet: undefined, pets: [] })
    ];

    const { party } = selectBossParty(students, [], []);

    expect(party).toHaveLength(BOSS_PARTY_SIZE);
    expect(party.some(student => student.id === 'absent')).toBe(false);
    expect(party.some(student => student.id === 'no-pet')).toBe(false);
  });

  it('cycles fair queue and avoids the previous party when enough students are available', () => {
    const students = Array.from({ length: 10 }, (_, index) => makeStudent(`s${index + 1}`));
    const first = selectBossParty(students, students.map(student => student.id), []);
    const second = selectBossParty(students, first.nextQueue, first.party.map(student => student.id));

    expect(first.party).toHaveLength(5);
    expect(second.party).toHaveLength(5);
    expect(second.party.some(student => first.party.some(previous => previous.id === student.id))).toBe(false);
  });

  it('applies success damage, contribution updates, and HP clamp on defeat', () => {
    const state = {
      ...createClassBossState('Class A'),
      boss: {
        ...createClassBossState('Class A').boss,
        currentHp: 20
      }
    };
    const partyIds = ['s1', 's2', 's3', 's4', 's5'];
    const result = resolveBossSuccess(state, partyIds, 'round-1', 1);

    expect(result.damageDealt).toBe(25);
    expect(result.bossDefeated).toBe(true);
    expect(result.topContributors).toHaveLength(5);
    expect(result.topContributors[0].damageDealt).toBe(5);
    expect(result.state.defeatedBosses).toBe(1);
    expect(result.state.randomsSinceLastEncounter).toBe(0);
  });

  it('failure adds appearances/failed rounds without damaging the boss', () => {
    const state = createClassBossState('Class A');
    const startingHp = state.boss.currentHp;
    const result = resolveBossFailure(state, ['s1', 's2', 's3', 's4', 's5'], 'round-1', 1);

    expect(result.damageDealt).toBe(0);
    expect(result.state.boss.currentHp).toBe(startingHp);
    expect(result.state.contributionByStudentId.s1.failedRounds).toBe(1);
    expect(result.state.contributionByStudentId.s1.damageDealt).toBe(0);
  });

  it('sorts top contributors deterministically', () => {
    const state = {
      ...createClassBossState('Class A'),
      contributionByStudentId: {
        a: { studentId: 'a', damageDealt: 10, successfulRounds: 2, appearances: 3, failedRounds: 1, firstContributionAt: 2 },
        b: { studentId: 'b', damageDealt: 10, successfulRounds: 2, appearances: 2, failedRounds: 0, firstContributionAt: 3 },
        c: { studentId: 'c', damageDealt: 15, successfulRounds: 3, appearances: 4, failedRounds: 1, firstContributionAt: 4 }
      }
    };
    const result = resolveBossSuccess(state, ['a', 'b', 'c', 'd', 'e'], 'round-2', 5);

    expect(result.topContributors.map(contribution => contribution.studentId).slice(0, 3)).toEqual(['c', 'b', 'a']);
  });

  it('does not apply the same round twice', () => {
    const state = createClassBossState('Class A');
    const first = resolveBossSuccess(state, ['s1', 's2', 's3', 's4', 's5'], 'same-round', 1);
    const second = resolveBossSuccess(first.state, ['s1', 's2', 's3', 's4', 's5'], 'same-round', 2);

    expect(second.damageDealt).toBe(0);
    expect(second.state.boss.currentHp).toBe(first.state.boss.currentHp);
  });
});
