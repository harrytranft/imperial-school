import { BossContribution, BossDefinition, BossInstance, ClassBossState, Student } from './types';

export const BOSS_MIN_RANDOM_GAP = 8;
export const BOSS_MAX_RANDOM_GAP = 14;
export const BOSS_PARTY_SIZE = 5;

export const BOSS_PRESETS: BossDefinition[] = [
  {
    id: 'shadow-dragon',
    name: 'Shadow Dragon',
    icon: '🐲',
    maxHp: 500,
    failDamage: 10,
    damagePerSuccessfulStudent: 5,
    tier: 'standard'
  }
];

export interface BossRoundResolution {
  state: ClassBossState;
  damageDealt: number;
  bossDefeated: boolean;
  topContributors: BossContribution[];
}

const createId = (prefix: string): string => {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const rollNextBossEncounterGap = (): number => {
  return BOSS_MIN_RANDOM_GAP + Math.floor(Math.random() * (BOSS_MAX_RANDOM_GAP - BOSS_MIN_RANDOM_GAP + 1));
};

export const createBossInstance = (definition: BossDefinition = BOSS_PRESETS[0], timestamp = Date.now()): BossInstance => ({
  instanceId: createId('boss'),
  definitionId: definition.id,
  name: definition.name,
  icon: definition.icon,
  maxHp: definition.maxHp,
  currentHp: definition.maxHp,
  failDamage: definition.failDamage,
  damagePerSuccessfulStudent: definition.damagePerSuccessfulStudent,
  tier: definition.tier,
  spawnedAt: timestamp
});

export const createClassBossState = (className: string, timestamp = Date.now()): ClassBossState => ({
  className,
  boss: createBossInstance(BOSS_PRESETS[0], timestamp),
  randomsSinceLastEncounter: 0,
  nextEncounterAt: rollNextBossEncounterGap(),
  encounterReady: false,
  contributionByStudentId: {},
  participantQueue: [],
  previousPartyIds: [],
  defeatedBosses: 0,
  resolvedRoundIds: [],
  updatedAt: timestamp
});

export const normalizeClassBossState = (state: ClassBossState | undefined, className: string): ClassBossState => {
  if (!state) return createClassBossState(className);
  const definition = BOSS_PRESETS.find(preset => preset.id === state.boss?.definitionId) || BOSS_PRESETS[0];
  return {
    ...state,
    className: state.className || className,
    boss: {
      ...createBossInstance(definition, state.boss?.spawnedAt || Date.now()),
      ...(state.boss || {}),
      icon: state.boss?.icon || definition.icon,
      tier: state.boss?.tier || definition.tier,
      currentHp: Math.max(0, Math.min(state.boss?.maxHp || definition.maxHp, state.boss?.currentHp ?? definition.maxHp))
    },
    randomsSinceLastEncounter: Math.max(0, state.randomsSinceLastEncounter || 0),
    nextEncounterAt: state.nextEncounterAt || rollNextBossEncounterGap(),
    encounterReady: !!state.encounterReady,
    contributionByStudentId: state.contributionByStudentId || {},
    participantQueue: Array.isArray(state.participantQueue) ? state.participantQueue : [],
    previousPartyIds: Array.isArray(state.previousPartyIds) ? state.previousPartyIds : [],
    defeatedBosses: Math.max(0, state.defeatedBosses || 0),
    resolvedRoundIds: Array.isArray(state.resolvedRoundIds) ? state.resolvedRoundIds : [],
    updatedAt: state.updatedAt || Date.now()
  };
};

export const normalizeBossStatesByClass = (states?: Record<string, ClassBossState>): Record<string, ClassBossState> => {
  return Object.fromEntries(
    Object.entries(states || {}).map(([className, state]) => [className, normalizeClassBossState(state, className)])
  );
};

export const incrementBossEncounterCounter = (state: ClassBossState, timestamp = Date.now()): ClassBossState => {
  const nextCount = state.randomsSinceLastEncounter + 1;
  return {
    ...state,
    randomsSinceLastEncounter: nextCount,
    encounterReady: state.encounterReady || nextCount >= state.nextEncounterAt,
    updatedAt: timestamp
  };
};

export const resetBossEncounterAfterRound = (state: ClassBossState, timestamp = Date.now()): ClassBossState => ({
  ...state,
  randomsSinceLastEncounter: 0,
  nextEncounterAt: rollNextBossEncounterGap(),
  encounterReady: false,
  updatedAt: timestamp
});

export const isBossEncounterReady = (state: ClassBossState): boolean => state.encounterReady || state.randomsSinceLastEncounter >= state.nextEncounterAt;

export const isBossEligibleStudent = (student: Student): boolean => {
  return !student.isAbsent
    && student.attendanceStatus !== 'absent'
    && !!student.pet
    && (student.pet.hp ?? 0) > 0;
};

export const selectBossParty = (
  students: Student[],
  queue: string[],
  previousPartyIds: string[] = []
): { party: Student[]; nextQueue: string[] } => {
  const eligible = students.filter(isBossEligibleStudent);
  if (eligible.length < BOSS_PARTY_SIZE) return { party: [], nextQueue: queue.filter(id => eligible.some(student => student.id === id)) };

  const eligibleById = new Map(eligible.map(student => [student.id, student]));
  let nextQueue = queue.filter(id => eligibleById.has(id));
  const refillQueue = () => {
    const avoidSet = new Set(previousPartyIds);
    const canAvoidPrevious = eligible.length - previousPartyIds.filter(id => eligibleById.has(id)).length >= BOSS_PARTY_SIZE;
    const preferred = canAvoidPrevious ? eligible.filter(student => !avoidSet.has(student.id)) : eligible;
    const deferred = canAvoidPrevious ? eligible.filter(student => avoidSet.has(student.id)) : [];
    nextQueue = [...shuffle(preferred.map(student => student.id)), ...shuffle(deferred.map(student => student.id))];
  };

  if (nextQueue.length < BOSS_PARTY_SIZE) refillQueue();
  const partyIds = nextQueue.slice(0, BOSS_PARTY_SIZE);
  return {
    party: partyIds.map(id => eligibleById.get(id)).filter(Boolean) as Student[],
    nextQueue: nextQueue.slice(BOSS_PARTY_SIZE)
  };
};

const touchContribution = (
  source: Record<string, BossContribution>,
  studentId: string,
  timestamp: number
): BossContribution => ({
  studentId,
  successfulRounds: source[studentId]?.successfulRounds || 0,
  damageDealt: source[studentId]?.damageDealt || 0,
  appearances: source[studentId]?.appearances || 0,
  failedRounds: source[studentId]?.failedRounds || 0,
  firstContributionAt: source[studentId]?.firstContributionAt || timestamp,
  lastContributionAt: timestamp
});

const sortedContributions = (state: ClassBossState): BossContribution[] => {
  return Object.values(state.contributionByStudentId).sort((a, b) => {
    if (b.damageDealt !== a.damageDealt) return b.damageDealt - a.damageDealt;
    if (b.successfulRounds !== a.successfulRounds) return b.successfulRounds - a.successfulRounds;
    if (a.appearances !== b.appearances) return a.appearances - b.appearances;
    if ((a.firstContributionAt || 0) !== (b.firstContributionAt || 0)) return (a.firstContributionAt || 0) - (b.firstContributionAt || 0);
    return a.studentId.localeCompare(b.studentId);
  });
};

export const getBossTopContributors = (state: ClassBossState, limit = 5): BossContribution[] => {
  return sortedContributions(state).slice(0, limit);
};

export const resolveBossSuccess = (
  state: ClassBossState,
  studentIds: string[],
  roundId: string,
  timestamp = Date.now()
): BossRoundResolution => {
  if (state.resolvedRoundIds?.includes(roundId)) {
    return { state, damageDealt: 0, bossDefeated: !!state.boss.defeatedAt, topContributors: getBossTopContributors(state) };
  }

  const contributionByStudentId = { ...state.contributionByStudentId };
  studentIds.forEach(studentId => {
    const contribution = touchContribution(contributionByStudentId, studentId, timestamp);
    contribution.appearances += 1;
    contribution.successfulRounds += 1;
    contribution.damageDealt += state.boss.damagePerSuccessfulStudent;
    contribution.lastContributionAt = timestamp;
    contributionByStudentId[studentId] = contribution;
  });

  const damageDealt = studentIds.length * state.boss.damagePerSuccessfulStudent;
  const nextHp = Math.max(0, state.boss.currentHp - damageDealt);
  const defeated = nextHp <= 0;
  const nextState: ClassBossState = resetBossEncounterAfterRound({
    ...state,
    boss: defeated
      ? {
        ...createBossInstance(BOSS_PRESETS[0], timestamp),
        spawnedAt: timestamp
      }
      : {
        ...state.boss,
        currentHp: nextHp,
        defeatedAt: undefined
      },
    contributionByStudentId: defeated ? {} : contributionByStudentId,
    previousPartyIds: studentIds,
    defeatedBosses: state.defeatedBosses + (defeated ? 1 : 0),
    resolvedRoundIds: [...(state.resolvedRoundIds || []), roundId].slice(-30)
  }, timestamp);

  return {
    state: nextState,
    damageDealt,
    bossDefeated: defeated,
    topContributors: sortedContributions({ ...state, contributionByStudentId }).slice(0, 5)
  };
};

export const resolveBossFailure = (
  state: ClassBossState,
  studentIds: string[],
  roundId: string,
  timestamp = Date.now()
): BossRoundResolution => {
  if (state.resolvedRoundIds?.includes(roundId)) {
    return { state, damageDealt: 0, bossDefeated: false, topContributors: getBossTopContributors(state) };
  }

  const contributionByStudentId = { ...state.contributionByStudentId };
  studentIds.forEach(studentId => {
    const contribution = touchContribution(contributionByStudentId, studentId, timestamp);
    contribution.appearances += 1;
    contribution.failedRounds += 1;
    contribution.lastContributionAt = timestamp;
    contributionByStudentId[studentId] = contribution;
  });

  return {
    state: resetBossEncounterAfterRound({
      ...state,
      contributionByStudentId,
      previousPartyIds: studentIds,
      resolvedRoundIds: [...(state.resolvedRoundIds || []), roundId].slice(-30)
    }, timestamp),
    damageDealt: 0,
    bossDefeated: false,
    topContributors: getBossTopContributors({ ...state, contributionByStudentId })
  };
};
