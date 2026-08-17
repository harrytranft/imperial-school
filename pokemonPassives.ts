import { PokemonPet, Student } from './types';

export type PassiveTrigger =
  | 'solo-positive'
  | 'battle-win'
  | 'battle-loss'
  | 'battle-draw'
  | 'homework-complete';

export interface PassiveDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
}

export interface PassiveContext {
  student: Student;
  pet: PokemonPet;
  trigger: PassiveTrigger;
  baseXp: number;
  baseBond: number;
  baseCharge: number;
  nextAnswerStreak: number;
  nextPositiveSoloCount: number;
  battleScore?: number;
}

export interface PassiveResult {
  bonusXp?: number;
  bonusBond?: number;
  bonusCharge?: number;
  bonusHp?: number;
  reaction?: string;
}

export const PASSIVE_DEFINITIONS: Record<string, PassiveDefinition> = {
  static_charge: {
    id: 'static_charge',
    name: 'Static Charge',
    shortName: 'Static',
    description: 'Moi 3 lan tra loi tich cuc trong Solo nhan them XP.'
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    shortName: 'Growth',
    description: 'Tang XP tu homework.'
  },
  blaze: {
    id: 'blaze',
    name: 'Blaze',
    shortName: 'Blaze',
    description: 'Answer Streak cao giup tang XP Solo.'
  },
  torrent: {
    id: 'torrent',
    name: 'Torrent',
    shortName: 'Torrent',
    description: 'Thua Battle nhung van co diem se nhan them XP va Bond.'
  },
  adaptability: {
    id: 'adaptability',
    name: 'Adaptability',
    shortName: 'Adapt',
    description: 'Moi lan tang Bond duoc cong them Bond.'
  },
  joyful_heart: {
    id: 'joyful_heart',
    name: 'Joyful Heart',
    shortName: 'Joy',
    description: 'San sang nhan bonus Bond tu Homework Streak.'
  },
  rest_recover: {
    id: 'rest_recover',
    name: 'Rest & Recover',
    shortName: 'Rest',
    description: 'Tra loi tich cuc trong Solo hoi them 1 HP.'
  },
  aura_fighter: {
    id: 'aura_fighter',
    name: 'Aura Fighter',
    shortName: 'Aura',
    description: 'Thang Battle nhan them XP.'
  },
  ninja_focus: {
    id: 'ninja_focus',
    name: 'Ninja Focus',
    shortName: 'Focus',
    description: 'Answer Streak on dinh giup nap them Charge.'
  },
  mischief: {
    id: 'mischief',
    name: 'Mischief',
    shortName: 'Mischief',
    description: 'Moi 5 lan Solo tich cuc nhan them XP.'
  },
  synchronize: {
    id: 'synchronize',
    name: 'Synchronize',
    shortName: 'Sync',
    description: 'Level up tang them Bond.'
  },
  sky_legend: {
    id: 'sky_legend',
    name: 'Sky Legend',
    shortName: 'Legend',
    description: 'Tang XP tu su kien lop hoc.'
  }
};

const PASSIVE_BY_BASE_DEX_ID: Record<number, string> = {
  25: 'static_charge',
  1: 'growth',
  152: 'growth',
  252: 'growth',
  470: 'growth',
  4: 'blaze',
  155: 'blaze',
  255: 'blaze',
  7: 'torrent',
  54: 'torrent',
  258: 'torrent',
  158: 'torrent',
  133: 'adaptability',
  132: 'adaptability',
  39: 'joyful_heart',
  175: 'joyful_heart',
  143: 'rest_recover',
  448: 'aura_fighter',
  658: 'ninja_focus',
  94: 'mischief',
  151: 'synchronize',
  384: 'sky_legend'
};

export const getPassiveIdForBaseDexId = (baseDexId?: number): string | undefined => {
  if (!baseDexId) return undefined;
  return PASSIVE_BY_BASE_DEX_ID[baseDexId];
};

export const getPassiveDefinition = (passiveId?: string): PassiveDefinition | undefined => {
  if (!passiveId) return undefined;
  return PASSIVE_DEFINITIONS[passiveId];
};

export const getPassiveIcon = (passiveId?: string): string => {
  switch (passiveId) {
    case 'static_charge':
      return '⚡';
    case 'growth':
      return '🌱';
    case 'blaze':
      return '🔥';
    case 'torrent':
      return '💧';
    case 'adaptability':
      return '🔁';
    case 'joyful_heart':
      return '💖';
    case 'rest_recover':
      return '🛌';
    case 'aura_fighter':
      return '🥋';
    case 'ninja_focus':
      return '🎯';
    case 'mischief':
      return '👻';
    case 'synchronize':
      return '✨';
    case 'sky_legend':
      return '🌌';
    default:
      return '◇';
  }
};

const getBondTier = (bond?: number): 0 | 1 | 2 | 3 => {
  const value = bond ?? 0;
  if (value >= 100) return 3;
  if (value >= 60) return 2;
  if (value >= 25) return 1;
  return 0;
};

export const resolvePassiveEffect = (context: PassiveContext): PassiveResult => {
  const passiveId = context.pet.passiveId || getPassiveIdForBaseDexId(context.pet.baseDexId || context.pet.dexId);
  const tier = getBondTier(context.pet.bond);

  switch (passiveId) {
    case 'static_charge': {
      if (context.trigger !== 'solo-positive' || context.nextPositiveSoloCount % 3 !== 0) return {};
      const bonusXp = tier >= 3 ? 10 : tier >= 2 ? 8 : 5;
      return { bonusXp, reaction: `Static Charge +${bonusXp} XP` };
    }
    case 'growth': {
      if (context.trigger !== 'homework-complete') return {};
      const multiplier = tier >= 3 ? 0.4 : tier >= 2 ? 0.3 : 0.2;
      const bonusXp = Math.ceil(context.baseXp * multiplier);
      return { bonusXp, reaction: `Growth +${bonusXp} XP` };
    }
    case 'blaze': {
      if (context.trigger !== 'solo-positive' || context.nextAnswerStreak < 3) return {};
      const multiplier = tier >= 3 ? 0.3 : tier >= 2 ? 0.25 : 0.2;
      const bonusXp = Math.ceil(context.baseXp * multiplier);
      return { bonusXp, reaction: `Blaze +${bonusXp} XP` };
    }
    case 'torrent': {
      if (context.trigger !== 'battle-loss' || !context.battleScore || context.battleScore <= 0) return {};
      const bonusXp = tier >= 2 ? 8 : 5;
      return { bonusXp, bonusBond: 1, reaction: `Torrent +${bonusXp} XP` };
    }
    case 'adaptability':
      return context.baseBond > 0 ? { bonusBond: 1, reaction: 'Adaptability +1 Bond' } : {};
    case 'rest_recover':
      return context.trigger === 'solo-positive' ? { bonusHp: 1, reaction: 'Rest & Recover +1 HP' } : {};
    case 'aura_fighter': {
      if (context.trigger !== 'battle-win') return {};
      const bonusXp = Math.ceil(context.baseXp * 0.25);
      return { bonusXp, reaction: `Aura Fighter +${bonusXp} XP` };
    }
    case 'ninja_focus':
      return context.trigger === 'solo-positive' && context.nextAnswerStreak >= 2 && context.nextAnswerStreak % 3 === 0
        ? { bonusCharge: 1, reaction: 'Ninja Focus +1 Charge' }
        : {};
    case 'mischief':
      return context.trigger === 'solo-positive' && context.nextPositiveSoloCount % 5 === 0
        ? { bonusXp: 5, reaction: 'Mischief +5 XP' }
        : {};
    case 'sky_legend': {
      if (context.trigger !== 'solo-positive') return {};
      const bonusXp = Math.ceil(context.baseXp * 0.1);
      return { bonusXp, reaction: `Sky Legend +${bonusXp} XP` };
    }
    default:
      return {};
  }
};
