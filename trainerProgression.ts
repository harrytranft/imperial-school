import { EarnedBadge, Student, TrainerProgress, TrainerTitleId } from './types';
import { clamp } from './pokemonProgression';

export interface TrainerTitleDefinition {
  id: TrainerTitleId;
  icon: string;
  name: string;
  description: string;
}

export interface BadgeDefinition {
  id: string;
  icon: string;
  name: string;
  description: string;
  trainerXpReward: number;
  isEarned: (student: Student) => boolean;
}

export const TRAINER_TITLE_DEFINITIONS: TrainerTitleDefinition[] = [
  { id: 'rookie', icon: '🌱', name: 'Rookie Trainer', description: 'Bắt đầu hành trình huấn luyện.' },
  { id: 'homework-master', icon: '📚', name: 'Homework Master', description: 'Giữ streak bài tập thật ổn định.' },
  { id: 'battle-specialist', icon: '⚔️', name: 'Battle Specialist', description: 'Có nhiều chiến thắng Battle.' },
  { id: 'pokemon-friend', icon: '💖', name: 'Pokémon Friend', description: 'Gắn bó sâu với Pokémon đồng hành.' },
  { id: 'shiny-hunter', icon: '✨', name: 'Shiny Hunter', description: 'Sở hữu Pokémon Shiny.' },
  { id: 'pokemon-breeder', icon: '🐣', name: 'Pokémon Breeder', description: 'Ấp nở nhiều trứng Pokémon.' },
  { id: 'boss-hunter', icon: '👹', name: 'Boss Hunter', description: 'Tham gia nhiều round Boss thành công.' },
  { id: 'boss-slayer', icon: '🏆', name: 'Boss Slayer', description: 'Lọt Top 5 khi Boss bị đánh bại.' },
  { id: 'pokemon-champion', icon: '👑', name: 'Pokémon Champion', description: 'Trainer cấp cao với nhiều huy hiệu.' }
];

export const getTrainerTitleDefinition = (titleId?: TrainerTitleId): TrainerTitleDefinition => {
  return TRAINER_TITLE_DEFINITIONS.find(title => title.id === titleId) || TRAINER_TITLE_DEFINITIONS[0];
};

export const getDefaultTrainerProgress = (): TrainerProgress => ({
  level: 1,
  xp: 0,
  totalXp: 0,
  titleId: 'rookie',
  unlockedTitleIds: ['rookie']
});

export const trainerXpNeededForNextLevel = (level: number): number => {
  return Math.min(500, 80 + (Math.max(1, level) - 1) * 20);
};

export const getTrainerLevelProgressFromTotalXp = (totalXpValue: number): TrainerProgress => {
  let remainingXp = Math.max(0, Math.floor(totalXpValue));
  let level = 1;

  while (remainingXp >= trainerXpNeededForNextLevel(level)) {
    remainingXp -= trainerXpNeededForNextLevel(level);
    level += 1;
  }

  return {
    level,
    xp: remainingXp,
    totalXp: Math.max(0, Math.floor(totalXpValue)),
    titleId: 'rookie',
    unlockedTitleIds: ['rookie']
  };
};

export const getUnlockedTitleIdsForStudent = (student: Student): TrainerTitleId[] => {
  const progress = student.pokemonProgress;
  const pets = [student.pet, ...(student.pets || [])].filter(Boolean);
  const badgeCount = student.earnedBadges?.length || 0;
  const unlocked = new Set<TrainerTitleId>(['rookie']);

  if ((progress?.bestHomeworkStreak || 0) >= 10) unlocked.add('homework-master');
  if ((progress?.battleWins || 0) >= 10) unlocked.add('battle-specialist');
  if (pets.some(pet => (pet?.bond || 0) >= 100)) unlocked.add('pokemon-friend');
  if (pets.some(pet => !!pet?.isShiny)) unlocked.add('shiny-hunter');
  if ((progress?.hatchedEggs || 0) >= 10) unlocked.add('pokemon-breeder');
  if ((progress?.bossSuccessfulRounds || 0) >= 10) unlocked.add('boss-hunter');
  if ((progress?.bossTop5Finishes || 0) > 0) unlocked.add('boss-slayer');
  if ((student.trainerProgress?.level || 1) >= 20 || badgeCount >= 8) unlocked.add('pokemon-champion');

  return TRAINER_TITLE_DEFINITIONS
    .map(title => title.id)
    .filter(titleId => unlocked.has(titleId));
};

export const normalizeTrainerProgress = (student: Student): TrainerProgress => {
  const base = student.trainerProgress?.totalXp !== undefined
    ? getTrainerLevelProgressFromTotalXp(student.trainerProgress.totalXp)
    : {
      ...getDefaultTrainerProgress(),
      ...(student.trainerProgress || {})
    };
  const unlockedTitleIds = Array.from(new Set([
    ...(base.unlockedTitleIds || ['rookie']),
    ...getUnlockedTitleIdsForStudent({ ...student, trainerProgress: base })
  ])) as TrainerTitleId[];
  const titleId = base.titleId && unlockedTitleIds.includes(base.titleId) ? base.titleId : unlockedTitleIds[0] || 'rookie';
  return {
    ...base,
    level: Math.max(1, base.level || 1),
    xp: Math.max(0, base.xp || 0),
    totalXp: Math.max(0, base.totalXp || 0),
    titleId,
    unlockedTitleIds
  };
};

export const addTrainerXp = (student: Student, amount: number): { student: Student; levelUps: number } => {
  const current = normalizeTrainerProgress(student);
  const previousLevel = current.level;
  const nextTotalXp = current.totalXp + Math.max(0, Math.floor(amount));
  const nextBase = getTrainerLevelProgressFromTotalXp(nextTotalXp);
  const nextStudent = {
    ...student,
    trainerProgress: {
      ...nextBase,
      titleId: current.titleId,
      unlockedTitleIds: current.unlockedTitleIds
    }
  };
  return {
    student: {
      ...nextStudent,
      trainerProgress: normalizeTrainerProgress(nextStudent)
    },
    levelUps: Math.max(0, nextBase.level - previousLevel)
  };
};

const allPets = (student: Student) => [student.pet, ...(student.pets || [])].filter(Boolean);

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'blaze',
    icon: '🔥',
    name: 'Blaze Badge',
    description: 'Best Answer Streak >= 10',
    trainerXpReward: 20,
    isEarned: student => (student.pokemonProgress?.bestAnswerStreak || 0) >= 10
  },
  {
    id: 'scholar',
    icon: '📚',
    name: 'Scholar Badge',
    description: 'Best Homework Streak >= 10',
    trainerXpReward: 20,
    isEarned: student => (student.pokemonProgress?.bestHomeworkStreak || 0) >= 10
  },
  {
    id: 'battle',
    icon: '⚔️',
    name: 'Battle Badge',
    description: 'Battle Wins >= 10',
    trainerXpReward: 20,
    isEarned: student => (student.pokemonProgress?.battleWins || 0) >= 10
  },
  {
    id: 'friendship',
    icon: '💖',
    name: 'Friendship Badge',
    description: 'Any Pokémon Bond = 100',
    trainerXpReward: 20,
    isEarned: student => allPets(student).some(pet => (pet?.bond || 0) >= 100)
  },
  {
    id: 'shiny-hunter',
    icon: '✨',
    name: 'Shiny Hunter Badge',
    description: 'Own at least one Shiny Pokémon',
    trainerXpReward: 20,
    isEarned: student => allPets(student).some(pet => !!pet?.isShiny)
  },
  {
    id: 'breeder',
    icon: '🐣',
    name: 'Breeder Badge',
    description: 'Hatch 10 eggs',
    trainerXpReward: 20,
    isEarned: student => (student.pokemonProgress?.hatchedEggs || 0) >= 10
  },
  {
    id: 'master',
    icon: '🌟',
    name: 'Master Badge',
    description: 'Any Pokémon Mastery = 5 stars',
    trainerXpReward: 20,
    isEarned: student => allPets(student).some(pet => (pet?.masteryStars || 0) >= 5)
  },
  {
    id: 'raid',
    icon: '👹',
    name: 'Raid Badge',
    description: 'Participate in 10 successful Boss rounds',
    trainerXpReward: 20,
    isEarned: student => (student.pokemonProgress?.bossSuccessfulRounds || 0) >= 10
  },
  {
    id: 'boss-slayer',
    icon: '🏆',
    name: 'Boss Slayer Badge',
    description: 'Finish Top 5 contribution on a defeated Boss',
    trainerXpReward: 20,
    isEarned: student => (student.pokemonProgress?.bossTop5Finishes || 0) > 0
  }
];

export const getBadgeDefinition = (badgeId: string): BadgeDefinition | undefined => {
  return BADGE_DEFINITIONS.find(badge => badge.id === badgeId);
};

export const evaluateNewBadges = (student: Student, timestamp = Date.now()): EarnedBadge[] => {
  const existing = new Set((student.earnedBadges || []).map(badge => badge.badgeId));
  return BADGE_DEFINITIONS
    .filter(definition => !existing.has(definition.id) && definition.isEarned(student))
    .map(definition => ({ badgeId: definition.id, earnedAt: timestamp }));
};

export const applyBadgeRewards = (student: Student, timestamp = Date.now()): { student: Student; newBadges: EarnedBadge[]; trainerLevelUps: number } => {
  const newBadges = evaluateNewBadges(student, timestamp);
  if (newBadges.length === 0) {
    const normalized = { ...student, trainerProgress: normalizeTrainerProgress(student), earnedBadges: student.earnedBadges || [] };
    return { student: normalized, newBadges, trainerLevelUps: 0 };
  }

  let nextStudent: Student = {
    ...student,
    earnedBadges: [...(student.earnedBadges || []), ...newBadges]
  };
  const xpReward = newBadges.reduce((sum, badge) => sum + (getBadgeDefinition(badge.badgeId)?.trainerXpReward || 0), 0);
  const xpResult = addTrainerXp(nextStudent, xpReward);
  nextStudent = xpResult.student;
  return {
    student: {
      ...nextStudent,
      trainerProgress: normalizeTrainerProgress(nextStudent)
    },
    newBadges,
    trainerLevelUps: xpResult.levelUps
  };
};

export const getTrainerLevelPercent = (progress?: TrainerProgress): number => {
  const normalized = progress || getDefaultTrainerProgress();
  return clamp((normalized.xp / trainerXpNeededForNextLevel(normalized.level)) * 100, 0, 100);
};
