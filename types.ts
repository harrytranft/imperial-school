
export enum Gender {
  MALE = 'Nam',
  FEMALE = 'Nữ'
}

export interface HistoryItem {
  id: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export type EggKind = 'normal' | 'special' | 'legendary';

export interface StudentEgg {
  instanceId?: string;
  progress: number; // For egg status: 0-10. At 10, it hatches.
  status: 'egg' | 'hatched';
  assignedDexId: number; // Pre-rolled so they get a specific Pokémon
  kind?: EggKind;
  requiredProgress?: number;
  acquiredAt?: number;
  source?: 'shop' | 'boss' | 'reward' | 'system';
}

export type PokemonNatureId =
  | 'brave'
  | 'curious'
  | 'loyal'
  | 'hardworking'
  | 'lucky'
  | 'energetic'
  | 'calm';

export type TrainerTitleId =
  | 'rookie'
  | 'homework-master'
  | 'battle-specialist'
  | 'pokemon-friend'
  | 'shiny-hunter'
  | 'pokemon-breeder'
  | 'boss-hunter'
  | 'boss-slayer'
  | 'pokemon-champion';

export interface TrainerProgress {
  level: number;
  xp: number;
  totalXp: number;
  titleId?: TrainerTitleId;
  unlockedTitleIds?: TrainerTitleId[];
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: number;
}

export interface PokemonExpedition {
  expeditionId: string;
  petInstanceId: string;
  startedAt: number;
  resolvesAt: number;
  status: 'active' | 'ready' | 'claimed';
  seed: string;
  reward?: {
    xp: number;
    bond: number;
    eggFragments?: number;
    rare?: boolean;
  };
}

export interface EggFragments {
  normal?: number;
  special?: number;
  legendary?: number;
}

export interface WeeklyChestProgress {
  weekKey: string;
  progress: number;
  claimed: boolean;
}

export interface AdventureJournalEntry {
  id: string;
  timestamp: number;
  type:
    | 'pokemon-hatched'
    | 'pokemon-evolved'
    | 'pokemon-lost'
    | 'bond-max'
    | 'mastery'
    | 'shiny-acquired'
    | 'boss-win'
    | 'boss-top5'
    | 'trainer-level'
    | 'badge-earned';
  text: string;
  petInstanceId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface PokemonPet {
  instanceId?: string;
  dexId: number;
  baseDexId?: number; // Original base Pokemon dexId for evolution stages
  name: string;
  speciesName?: string;
  nickname?: string;
  types: string[];
  hp?: number; // Health points (0 - 100)
  accessories: string[]; // List of accessory IDs
  skills: string[]; // List of skill IDs
  skillUses?: Record<string, number>; // Maps skillId to number of times used (max 2)
  level?: number;
  xp?: number;
  totalXp?: number;
  bond?: number;
  charge?: number;
  isShiny?: boolean;
  masteryXp?: number;
  masteryStars?: number;
  passiveId?: string;
  natureId?: PokemonNatureId;
}

export interface PokemonReleaseEvent {
  studentId: string;
  studentName: string;
  releasedPet: PokemonPet;
  remainingPets: PokemonPet[];
  cause?: string;
}

export interface StudentPokemonProgress {
  answerStreak: number;
  bestAnswerStreak: number;
  battleWinStreak: number;
  bestBattleWinStreak: number;
  homeworkStreak: number;
  bestHomeworkStreak: number;
  attendanceStreak?: number;
  bestAttendanceStreak?: number;
  lastHomeworkLessonKey?: string;
  lastAttendanceLessonKey?: string;
  positiveSoloCount?: number;
  battleWins?: number;
  hatchedEggs?: number;
  bossSuccessfulRounds?: number;
  bossTop5Finishes?: number;
}

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  className: string;
  points: number;
  history: HistoryItem[];
  isAbsent?: boolean;
  attendanceStatus?: AttendanceStatus;
  customAvatar?: string; // Custom Base64 avatar photo uploaded for student
  egg?: StudentEgg;
  eggInventory?: StudentEgg[];
  pet?: PokemonPet;
  pets?: PokemonPet[]; // List of all acquired pets
  pokemonProgress?: StudentPokemonProgress;
  trainerProgress?: TrainerProgress;
  earnedBadges?: EarnedBadge[];
  expedition?: PokemonExpedition;
  eggFragments?: EggFragments;
  weeklyChest?: WeeklyChestProgress;
  adventureJournal?: AdventureJournalEntry[];
  supportPetInstanceId?: string;
  ludoTile?: number; // Position on board (0 to 49)
  ludoSteps?: number; // Total step count
  ludoMonsterStuck?: boolean; // Trapped by monster flag
}

export interface LudoTileSpec {
  tileIndex: number;
  title: string;
  desc: string;
  icon: string;
  type: 'portal' | 'curse' | 'treasure' | 'monster' | 'restart';
  value?: number; // e.g. +3 steps, -5 steps, +5 pts, restart
}

export type LuckyWheelRewardType = 'points' | 'pokemon' | 'skill' | 'hp' | 'ludo_rolls';

export interface LuckyWheelReward {
  id: string;
  label: string;
  icon: string;
  type: LuckyWheelRewardType;
  amount?: number;
  color: string;
}

export interface RankInfo {
  id: string;
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  avatar?: string; // Base64 string from user upload
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  points: number;
  type: 'positive' | 'negative';
}

export type BossTier = 'standard' | 'elite' | 'legendary';

export interface BossDefinition {
  id: string;
  name: string;
  image?: string;
  icon: string;
  maxHp: number;
  failDamage: number;
  damagePerSuccessfulStudent: number;
  tier: BossTier;
}

export interface BossInstance {
  instanceId: string;
  definitionId: string;
  name: string;
  icon: string;
  maxHp: number;
  currentHp: number;
  failDamage: number;
  damagePerSuccessfulStudent: number;
  tier: BossTier;
  spawnedAt: number;
  defeatedAt?: number;
}

export interface BossContribution {
  studentId: string;
  successfulRounds: number;
  damageDealt: number;
  appearances: number;
  failedRounds: number;
  firstContributionAt?: number;
  lastContributionAt?: number;
}

export interface ClassBossState {
  className: string;
  boss: BossInstance;
  randomsSinceLastEncounter: number;
  nextEncounterAt: number;
  encounterReady: boolean;
  contributionByStudentId: Record<string, BossContribution>;
  participantQueue: string[];
  previousPartyIds?: string[];
  defeatedBosses: number;
  resolvedRoundIds?: string[];
  updatedAt: number;
}

export interface ActiveBossRound {
  roundId: string;
  bossInstanceId: string;
  className: string;
  partyStudentIds: string[];
  openedAt: number;
  resolvedAt?: number;
  result?: 'success' | 'failure';
}
