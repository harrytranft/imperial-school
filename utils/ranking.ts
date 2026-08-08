
import { Gender, RankInfo } from '../types';
import { DEFAULT_RANKS_MALE, DEFAULT_RANKS_FEMALE } from '../constants';

// Fix: Import RankInfo from types and use correct default constants from constants.ts
export const getRank = (points: number, gender: Gender): RankInfo => {
  const ranks = gender === Gender.MALE ? DEFAULT_RANKS_MALE : DEFAULT_RANKS_FEMALE;
  const rank = ranks.find(r => points >= r.minPoints && points <= r.maxPoints);
  return rank || (points < 0 ? ranks[0] : ranks[ranks.length - 1]);
};

export const getNextLevelProgress = (points: number) => {
  if (points < 0) return 0;
  return ((points % 50) / 50) * 100;
};
