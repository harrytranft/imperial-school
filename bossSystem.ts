import { BossContribution, BossDefinition, BossEncounterFrequency, BossInstance, ClassBossState, Student } from './types';

export const BOSS_MIN_RANDOM_GAP = 6;
export const BOSS_MAX_RANDOM_GAP = 9;
export const BOSS_PARTY_SIZE = 5;

export const BOSS_ENCOUNTER_FREQUENCY_OPTIONS: Array<{
  id: BossEncounterFrequency;
  label: string;
  description: string;
  minGap: number;
  maxGap: number;
}> = [
  { id: 'frequent', label: 'Thường xuyên', description: 'Boss xuất hiện sau khoảng 3-5 lượt Random.', minGap: 3, maxGap: 5 },
  { id: 'occasional', label: 'Thỉnh thoảng', description: 'Boss xuất hiện sau khoảng 6-9 lượt Random.', minGap: 6, maxGap: 9 },
  { id: 'rare', label: 'Hiếm khi', description: 'Boss xuất hiện sau khoảng 10-14 lượt Random.', minGap: 10, maxGap: 14 }
];

export const DEFAULT_BOSS_ENCOUNTER_FREQUENCY: BossEncounterFrequency = 'occasional';

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

export const getBossEncounterFrequencyOption = (
  frequency: BossEncounterFrequency = DEFAULT_BOSS_ENCOUNTER_FREQUENCY
) => BOSS_ENCOUNTER_FREQUENCY_OPTIONS.find(option => option.id === frequency) || BOSS_ENCOUNTER_FREQUENCY_OPTIONS[1];

export const rollNextBossEncounterGap = (
  frequency: BossEncounterFrequency = DEFAULT_BOSS_ENCOUNTER_FREQUENCY
): number => {
  const option = getBossEncounterFrequencyOption(frequency);
  return option.minGap + Math.floor(Math.random() * (option.maxGap - option.minGap + 1));
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

export const createClassBossState = (
  className: string,
  timestamp = Date.now(),
  frequency: BossEncounterFrequency = DEFAULT_BOSS_ENCOUNTER_FREQUENCY
): ClassBossState => ({
  className,
  boss: createBossInstance(BOSS_PRESETS[0], timestamp),
  randomsSinceLastEncounter: 0,
  nextEncounterAt: rollNextBossEncounterGap(frequency),
  encounterReady: false,
  contributionByStudentId: {},
  participantQueue: [],
  previousPartyIds: [],
  defeatedBosses: 0,
  resolvedRoundIds: [],
  updatedAt: timestamp
});

export const normalizeClassBossState = (
  state: ClassBossState | undefined,
  className: string,
  frequency: BossEncounterFrequency = DEFAULT_BOSS_ENCOUNTER_FREQUENCY
): ClassBossState => {
  if (!state) return createClassBossState(className, Date.now(), frequency);
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
    nextEncounterAt: state.nextEncounterAt || rollNextBossEncounterGap(frequency),
    encounterReady: !!state.encounterReady,
    contributionByStudentId: state.contributionByStudentId || {},
    participantQueue: Array.isArray(state.participantQueue) ? state.participantQueue : [],
    previousPartyIds: Array.isArray(state.previousPartyIds) ? state.previousPartyIds : [],
    defeatedBosses: Math.max(0, state.defeatedBosses || 0),
    resolvedRoundIds: Array.isArray(state.resolvedRoundIds) ? state.resolvedRoundIds : [],
    updatedAt: state.updatedAt || Date.now()
  };
};

export const normalizeBossStatesByClass = (
  states?: Record<string, ClassBossState>,
  frequency: BossEncounterFrequency = DEFAULT_BOSS_ENCOUNTER_FREQUENCY
): Record<string, ClassBossState> => {
  return Object.fromEntries(
    Object.entries(states || {}).map(([className, state]) => [className, normalizeClassBossState(state, className, frequency)])
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

export const resetBossEncounterAfterRound = (
  state: ClassBossState,
  timestamp = Date.now(),
  frequency: BossEncounterFrequency = DEFAULT_BOSS_ENCOUNTER_FREQUENCY
): ClassBossState => ({
  ...state,
  randomsSinceLastEncounter: 0,
  nextEncounterAt: rollNextBossEncounterGap(frequency),
  encounterReady: false,
  updatedAt: timestamp
});

export const recalibrateBossEncounterFrequency = (
  state: ClassBossState,
  frequency: BossEncounterFrequency = DEFAULT_BOSS_ENCOUNTER_FREQUENCY,
  timestamp = Date.now()
): ClassBossState => {
  const option = getBossEncounterFrequencyOption(frequency);
  if (state.encounterReady || state.randomsSinceLastEncounter >= state.nextEncounterAt) {
    return {
      ...state,
      encounterReady: true,
      updatedAt: timestamp
    };
  }

  const nextEncounterAt = Math.max(
    state.randomsSinceLastEncounter + 1,
    Math.min(state.nextEncounterAt || rollNextBossEncounterGap(frequency), option.maxGap)
  );

  return {
    ...state,
    nextEncounterAt,
    encounterReady: state.randomsSinceLastEncounter >= nextEncounterAt,
    updatedAt: timestamp
  };
};

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
  timestamp = Date.now(),
  frequency: BossEncounterFrequency = DEFAULT_BOSS_ENCOUNTER_FREQUENCY
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
  }, timestamp, frequency);

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
  timestamp = Date.now(),
  frequency: BossEncounterFrequency = DEFAULT_BOSS_ENCOUNTER_FREQUENCY
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
    }, timestamp, frequency),
    damageDealt: 0,
    bossDefeated: false,
    topContributors: getBossTopContributors({ ...state, contributionByStudentId })
  };
};
