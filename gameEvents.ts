import { PokemonPet, Student, StudentPokemonProgress } from './types';
import {
  addPokemonXp,
  clamp,
  getDefaultPokemonProgress,
  getPokemonDisplayName,
  normalizePokemonPet,
  stableHash,
  updatePetInCollection
} from './pokemonProgression';
import { resolvePassiveEffect } from './pokemonPassives';

export type GameEventType =
  | 'SOLO_RESULT'
  | 'BATTLE_RESULT'
  | 'AURA_ADJUSTMENT'
  | 'HOMEWORK_COMPLETE'
  | 'HOMEWORK_MISSING'
  | 'EGG_HATCHED'
  | 'POKEMON_ACQUIRED';

export type GameEventSource =
  | 'solo'
  | 'battle'
  | 'manual'
  | 'skill'
  | 'lucky-wheel'
  | 'homework'
  | 'system';

export interface GameEvent {
  type: GameEventType;
  source: GameEventSource;
  studentId: string;
  auraDelta?: number;
  battleOutcome?: 'win' | 'loss' | 'draw';
  battleScore?: number;
  lessonKey?: string;
  timestamp: number;
}

export interface PokemonUiEvent {
  type: 'xp' | 'level-up' | 'evolution' | 'streak' | 'passive' | 'charge-ready' | 'bond' | 'hp' | 'random-drop' | 'mastery';
  message: string;
}

export interface GameEventResult {
  student: Student;
  uiEvents: PokemonUiEvent[];
}

const getAnswerStreakBonusXp = (streak: number): number => {
  if (streak === 3) return 5;
  if (streak === 5) return 10;
  if (streak === 10) return 20;
  if (streak > 10 && streak % 5 === 0) return 10;
  return 0;
};

const getBattleWinStreakBonusXp = (streak: number): number => {
  if (streak === 2) return 5;
  if (streak === 3) return 10;
  if (streak === 5) return 20;
  return 0;
};

const getHomeworkStreakBonusXp = (streak: number): number => {
  if (streak === 3) return 10;
  if (streak === 5) return 20;
  return 0;
};

type InstantDropType = 'rare-candy' | 'oran-berry' | 'friendship-ribbon' | 'energy-spark';

const INSTANT_DROPS: Array<{ type: InstantDropType; label: string; icon: string }> = [
  { type: 'rare-candy', label: 'Rare Candy', icon: '🍬' },
  { type: 'oran-berry', label: 'Oran Berry', icon: '🍓' },
  { type: 'friendship-ribbon', label: 'Friendship Ribbon', icon: '💖' },
  { type: 'energy-spark', label: 'Energy Spark', icon: '⚡' }
];

const applyProgressToPet = (
  student: Student,
  pet: PokemonPet,
  xpGain: number,
  bondGain: number,
  chargeGain: number,
  bonusHp: number,
  uiEvents: PokemonUiEvent[]
): Student => {
  let nextPet = normalizePokemonPet(pet);
  const finalXpGain = Math.max(0, Math.floor(xpGain));

  if (finalXpGain > 0) {
    const xpResult = addPokemonXp(nextPet, finalXpGain);
    nextPet = xpResult.pet;
    uiEvents.push({
      type: 'xp',
      message: `${getPokemonDisplayName(nextPet)} +${finalXpGain} XP`
    });
    if (xpResult.levelUps > 0) {
      uiEvents.push({
        type: 'level-up',
        message: `${getPokemonDisplayName(nextPet)} len Lv.${nextPet.level}`
      });
    }
    if (xpResult.evolved) {
      nextPet = {
        ...nextPet,
        bond: clamp((nextPet.bond || 0) + 3, 0, 100)
      };
      uiEvents.push({
        type: 'evolution',
        message: `${xpResult.previousSpeciesName} tien hoa thanh ${nextPet.speciesName || nextPet.name}`
      });
    }
    if (xpResult.masteryStarsGained > 0) {
      uiEvents.push({
        type: 'mastery',
        message: `${getPokemonDisplayName(nextPet)} Mastery ${'⭐'.repeat(nextPet.masteryStars || 0)}`
      });
    }
  }

  const synchronizeBonus = nextPet.passiveId === 'synchronize' && uiEvents.some(event => event.type === 'level-up') ? 2 : 0;
  const nextBond = clamp((nextPet.bond || 0) + bondGain + synchronizeBonus, 0, 100);
  const nextCharge = clamp((nextPet.charge || 0) + chargeGain, 0, 5);
  const nextHp = clamp((nextPet.hp ?? 100) + bonusHp, 0, 100);

  nextPet = {
    ...nextPet,
    bond: nextBond,
    charge: nextCharge,
    hp: nextHp
  };

  if (bondGain + synchronizeBonus > 0) {
    uiEvents.push({
      type: 'bond',
      message: `${getPokemonDisplayName(nextPet)} +${bondGain + synchronizeBonus} Bond`
    });
  }

  return {
    ...student,
    pet: nextPet,
    pets: updatePetInCollection(student, nextPet)
  };
};

const shouldRollInstantDrop = (event: GameEvent, trigger: Parameters<typeof resolvePassiveEffect>[0]['trigger'] | null, score: number): boolean => {
  return (trigger === 'solo-positive' && (event.auraDelta || 0) > 0)
    || (event.type === 'BATTLE_RESULT' && event.source === 'battle' && score > 0);
};

const applyInstantDrop = (
  student: Student,
  event: GameEvent,
  trigger: Parameters<typeof resolvePassiveEffect>[0]['trigger'] | null,
  score: number,
  uiEvents: PokemonUiEvent[]
): Student => {
  if (!student.pet || !shouldRollInstantDrop(event, trigger, score)) return student;

  const pet = normalizePokemonPet(student.pet);
  const baseChancePercent = pet.passiveId === 'mischief' ? 12 : 6;
  const rollSeed = `${event.studentId}:${event.type}:${event.source}:${event.timestamp}:${event.auraDelta || 0}:${event.battleOutcome || ''}:${score}:${pet.instanceId || ''}`;
  const roll = stableHash(`drop-roll:${rollSeed}`) % 100;
  if (roll >= baseChancePercent) return student;

  const drop = INSTANT_DROPS[stableHash(`drop-type:${rollSeed}`) % INSTANT_DROPS.length];
  uiEvents.push({
    type: 'random-drop',
    message: `RARE DROP! ${drop.icon} ${drop.label}`
  });

  switch (drop.type) {
    case 'rare-candy':
      return applyProgressToPet(student, pet, 15, 0, 0, 0, uiEvents);
    case 'oran-berry':
      uiEvents.push({ type: 'hp', message: `${getPokemonDisplayName(pet)} +10 HP` });
      return applyProgressToPet(student, pet, 0, 0, 0, 10, uiEvents);
    case 'friendship-ribbon':
      return applyProgressToPet(student, pet, 0, 3, 0, 0, uiEvents);
    case 'energy-spark':
      uiEvents.push({ type: 'charge-ready', message: `${getPokemonDisplayName(pet)} +1 Charge` });
      return applyProgressToPet(student, pet, 0, 0, 1, 0, uiEvents);
    default:
      return student;
  }
};

export const applyGameEventToStudent = (student: Student, event: GameEvent): GameEventResult => {
  const progress: StudentPokemonProgress = {
    ...getDefaultPokemonProgress(),
    ...(student.pokemonProgress || {})
  };
  const uiEvents: PokemonUiEvent[] = [];

  let nextProgress = { ...progress };
  let baseXp = 0;
  let baseBond = 0;
  let baseCharge = 0;
  let trigger: Parameters<typeof resolvePassiveEffect>[0]['trigger'] | null = null;
  let bonusXp = 0;

  if (event.type === 'SOLO_RESULT' && event.source === 'solo') {
    const aura = event.auraDelta || 0;
    if (aura > 0) {
      nextProgress.answerStreak = progress.answerStreak + 1;
      nextProgress.bestAnswerStreak = Math.max(progress.bestAnswerStreak, nextProgress.answerStreak);
      nextProgress.positiveSoloCount = (progress.positiveSoloCount || 0) + 1;
      baseXp = Math.min(25, Math.max(0, aura) * 5);
      baseBond = 1;
      baseCharge = 1;
      trigger = 'solo-positive';
      bonusXp += getAnswerStreakBonusXp(nextProgress.answerStreak);
      if (bonusXp > 0) {
        uiEvents.push({
          type: 'streak',
          message: `Answer Streak x${nextProgress.answerStreak} +${bonusXp} XP`
        });
      }
    } else {
      nextProgress.answerStreak = 0;
    }
  }

  if (event.type === 'BATTLE_RESULT' && event.source === 'battle') {
    const score = event.battleScore || 0;
    if (event.battleOutcome === 'win') {
      nextProgress.battleWinStreak = progress.battleWinStreak + 1;
      nextProgress.bestBattleWinStreak = Math.max(progress.bestBattleWinStreak, nextProgress.battleWinStreak);
      nextProgress.battleWins = (progress.battleWins || 0) + 1;
      baseXp = 20;
      baseBond = 2;
      baseCharge = 2;
      trigger = 'battle-win';
      bonusXp += getBattleWinStreakBonusXp(nextProgress.battleWinStreak);
      if (bonusXp > 0) {
        uiEvents.push({
          type: 'streak',
          message: `Battle Win Streak x${nextProgress.battleWinStreak} +${bonusXp} XP`
        });
      }
    } else if (event.battleOutcome === 'loss') {
      nextProgress.battleWinStreak = 0;
      if (score > 0) {
        baseXp = 10;
        baseBond = 1;
        baseCharge = 1;
      }
      trigger = 'battle-loss';
    } else {
      nextProgress.battleWinStreak = 0;
      if (score > 0) {
        baseXp = 12;
        baseBond = 1;
        baseCharge = 1;
      }
      trigger = 'battle-draw';
    }
  }

  if (event.type === 'HOMEWORK_COMPLETE' && event.source === 'homework') {
    nextProgress.homeworkStreak = progress.homeworkStreak + 1;
    nextProgress.bestHomeworkStreak = Math.max(progress.bestHomeworkStreak, nextProgress.homeworkStreak);
    nextProgress.lastHomeworkLessonKey = event.lessonKey || progress.lastHomeworkLessonKey;
    baseXp = 15;
    baseBond = 2;
    trigger = 'homework-complete';
    bonusXp += getHomeworkStreakBonusXp(nextProgress.homeworkStreak);
    if (bonusXp > 0) {
      uiEvents.push({
        type: 'streak',
        message: `Homework Streak x${nextProgress.homeworkStreak} +${bonusXp} XP`
      });
    }
  }

  if (event.type === 'HOMEWORK_MISSING' && event.source === 'homework') {
    nextProgress.homeworkStreak = 0;
    nextProgress.lastHomeworkLessonKey = event.lessonKey || progress.lastHomeworkLessonKey;
  }

  let nextStudent: Student = {
    ...student,
    pokemonProgress: nextProgress
  };

  if (!student.pet || !trigger || baseXp + bonusXp + baseBond + baseCharge <= 0) {
    return { student: nextStudent, uiEvents };
  }

  const petBeforeEvent = normalizePokemonPet(student.pet);
  let chargeReadyBonus = 0;
  let chargeGain = baseCharge;
  if (trigger === 'solo-positive' && (petBeforeEvent.charge || 0) >= 5 && baseXp + bonusXp > 0) {
    chargeReadyBonus = Math.ceil((baseXp + bonusXp) * 0.5);
    chargeGain = -(petBeforeEvent.charge || 0);
    uiEvents.push({
      type: 'charge-ready',
      message: `POWER READY +${chargeReadyBonus} XP`
    });
  }

  const passive = resolvePassiveEffect({
    student,
    pet: petBeforeEvent,
    trigger,
    baseXp,
    baseBond,
    baseCharge,
    nextAnswerStreak: nextProgress.answerStreak,
    nextPositiveSoloCount: nextProgress.positiveSoloCount || 0,
    battleScore: event.battleScore
  });

  if (passive.reaction) {
    uiEvents.push({ type: 'passive', message: passive.reaction });
  }

  nextStudent = applyProgressToPet(
    nextStudent,
    petBeforeEvent,
    baseXp + bonusXp + chargeReadyBonus + (passive.bonusXp || 0),
    baseBond + (passive.bonusBond || 0),
    chargeGain + (passive.bonusCharge || 0),
    passive.bonusHp || 0,
    uiEvents
  );

  const eventScore = event.type === 'BATTLE_RESULT' ? (event.battleScore || 0) : (event.auraDelta || 0);
  nextStudent = applyInstantDrop(nextStudent, event, trigger, eventScore, uiEvents);

  return { student: nextStudent, uiEvents };
};
