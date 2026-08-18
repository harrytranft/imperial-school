
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Gender, HistoryItem, RankInfo, Skill, PokemonPet, PokemonReleaseEvent, LudoTileSpec, LuckyWheelReward, LuckyWheelRewardType, StudentEgg, AttendanceStatus } from './types';
import { 
  STORAGE_KEY, DEFAULT_RANKS_MALE, DEFAULT_RANKS_FEMALE, 
  RANKS_KEY_MALE, RANKS_KEY_FEMALE, DEFAULT_SKILLS, SKILLS_KEY,
  DEFAULT_LUDO_TILES, PET_SKILLS_KEY, DEFAULT_LUCKY_WHEEL_REWARDS,
  LUCKY_WHEEL_REWARDS_KEY, WHEEL_SPIN_SOUND_KEY, WHEEL_FINISH_SOUND_KEY
} from './constants';
import { StudentCard } from './components/StudentCard';
import { LiquidDock } from './components/LiquidDock';
import { StatusDock } from './components/StatusDock';
import { AttendanceCheckModal } from './components/AttendanceCheckModal';
import { HomeworkCheckModal } from './components/HomeworkCheckModal';
import { HomeworkStatus } from './components/HomeworkCheckModal';
import { PokemonMiniStatus } from './components/PokemonMiniStatus';
import { PokemonPassiveBadge } from './components/PokemonPassiveBadge';
import { PokemonReactionToast } from './components/PokemonReactionToast';
import { generateEdict } from './geminiService';
import { LIST_POKEMONS, LIST_PET_SKILLS as DEFAULT_PET_SKILLS, PetSkill, getRandomPokemon } from './pokemonData';
import { getPassiveDefinition, getPassiveIcon } from './pokemonPassives';
import { useAuth } from './AuthContext';
import { fetchUserSettings, upsertUserSettings } from './supabaseData';
import { applyGameEventToStudent, applyPetHpDeltaToStudent, GameEventSource, PokemonUiEvent } from './gameEvents';
import {
  createPokemonPetFromDexId,
  handlePokemonArtworkError,
  getPokemonArtworkUrl,
  getPokemonDisplayName,
  getNextMasteryTarget,
  getNextEvolutionPreview,
  isSamePokemonPet,
  normalizePokemonPet,
  normalizeStudentPokemonData,
  totalXpForLevel,
  updatePetInCollection,
  xpNeededForNextLevel
} from './pokemonProgression';


type Screen = 'school' | 'class' | 'profile' | 'settings';

interface LuckyWheelResult {
  student: Student;
  reward: LuckyWheelReward;
  pokemon?: PokemonPet;
  skill?: PetSkill;
  hpDelta?: number;
  message: string;
}

interface LevelUpAnnouncement {
  title: string;
  events: PokemonUiEvent[];
}

interface BattleLudoTurn {
  studentId: string;
  role: 'winner' | 'loser' | 'draw';
}

interface ShopReviewItem {
  studentId: string;
  studentName: string;
  pointBalance: number;
  egg?: 'normal' | 'special';
  skillIds: string[];
  itemLabels: string[];
  totalCost: number;
  canAfford: boolean;
}

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DEFAULT_WHEEL_SPIN_SOUND_URL = 'https://actions.google.com/sounds/v1/transportation/airport_departure_chime.ogg';

const AuthLoginForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { loginWithEmail, signUpWithEmail } = useAuth();
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ Email và Mật khẩu.");
      return;
    }

    if (authTab === 'register' && !displayName.trim()) {
      setErrorMsg("Vui lòng nhập Tên sỹ phu / Tôn hiệu.");
      return;
    }

    setSubmitting(true);
    try {
      if (authTab === 'login') {
        await loginWithEmail(email.trim(), password);
      } else {
        const result = await signUpWithEmail(email.trim(), password, displayName.trim());
        if (result.needsEmailConfirmation) {
          setAuthTab('login');
          setErrorMsg("Tài khoản đã được tạo. Vui lòng mở email xác nhận từ Supabase rồi quay lại đăng nhập.");
          return;
        }
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full font-sans space-y-4">
      {/* Tabs */}
      <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200">
        <button
          type="button"
          onClick={() => { setAuthTab('login'); setErrorMsg(null); }}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
            authTab === 'login'
              ? 'bg-red-800 text-white shadow-md'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          🔑 Đăng Nhập
        </button>
        <button
          type="button"
          onClick={() => { setAuthTab('register'); setErrorMsg(null); }}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
            authTab === 'register'
              ? 'bg-red-800 text-white shadow-md'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          📜 Tạo Tài Khoản
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
        {authTab === 'register' && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">
              Tên Sỹ Phu / Tôn Hiệu
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Ví dụ: Quan Trường Ngô Văn A"
              className="w-full border border-stone-300 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-red-800/30"
            />
          </div>
        )}

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">
            Địa chỉ Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="syphu@trieudinh.vn"
            className="w-full border border-stone-300 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-red-800/30"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">
            Mật khẩu
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-stone-300 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-red-800/30"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-white font-extrabold py-3.5 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all text-xs uppercase tracking-wider border-b-4 border-red-950 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang Xử Lý...</span>
            </>
          ) : authTab === 'login' ? (
            <span>🚀 Đăng Nhập Sỹ Phu</span>
          ) : (
            <span>✨ Tạo Tài Khoản Mới</span>
          )}
        </button>
      </form>
    </div>
  );
};

interface SettingsSectionProps {
  id: string;
  title: string;
  icon: string;
  subtitle?: string;
  className?: string;
  collapsedSections: Record<string, boolean>;
  onToggle: (section: string) => void;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  id,
  title,
  icon,
  subtitle,
  className = 'bg-white p-10 rounded-[40px] border shadow-sm space-y-8',
  collapsedSections,
  onToggle,
  children
}) => {
  const isCollapsed = !!collapsedSections[id];
  return (
    <section className={className}>
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl shrink-0">{icon}</span>
          <div className="min-w-0">
            <h3 className="text-2xl font-royal text-red-800">{title}</h3>
            {subtitle && <p className="text-xs text-stone-500 font-bold mt-1">{subtitle}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggle(id)}
          className={`shrink-0 w-16 h-8 rounded-full border-2 p-1 transition-all ${isCollapsed ? 'bg-stone-200 border-stone-300' : 'bg-red-800 border-red-900'}`}
          aria-label={isCollapsed ? `Hiện ${title}` : `Ẩn ${title}`}
          title={isCollapsed ? `Hiện ${title}` : `Ẩn ${title}`}
        >
          <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${isCollapsed ? 'translate-x-0' : 'translate-x-8'}`} />
        </button>
      </div>
      {!isCollapsed && children}
    </section>
  );
};

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [ranksMale, setRanksMale] = useState<RankInfo[]>(DEFAULT_RANKS_MALE);
  const [ranksFemale, setRanksFemale] = useState<RankInfo[]>(DEFAULT_RANKS_FEMALE);
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [petSkills, setPetSkills] = useState<PetSkill[]>(() => {
    const saved = localStorage.getItem(PET_SKILLS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) {
        console.error("Error loading custom Pokemon skills:", err);
      }
    }
    return DEFAULT_PET_SKILLS;
  });
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('school');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'positive' | 'negative'>('positive');
  const [feedbackSource, setFeedbackSource] = useState<GameEventSource>('manual');
  const [pokemonReactionEvents, setPokemonReactionEvents] = useState<PokemonUiEvent[]>([]);
  const [pokemonReactionTitle, setPokemonReactionTitle] = useState('Tiến triển Pokémon');
  const [levelUpAnnouncement, setLevelUpAnnouncement] = useState<LevelUpAnnouncement | null>(null);
  const pokemonReactionTimerRef = useRef<number | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<'name' | 'points-desc' | 'points-asc'>('points-desc');
  const [filterClass, setFilterClass] = useState<string>('Tất cả');

  // Manual points state
  const [manualPoints, setManualPoints] = useState<string>('');

  // Modals
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [homeworkStatuses, setHomeworkStatuses] = useState<Record<string, HomeworkStatus>>({});
  const [showShopModal, setShowShopModal] = useState(false);
  const [shopSelections, setShopSelections] = useState<Record<string, { egg?: 'normal' | 'special'; skills: string[] }>>({});
  const [shopReview, setShopReview] = useState<ShopReviewItem[] | null>(null);
  const [selectedShopSkill, setSelectedShopSkill] = useState<PetSkill | null>(null);
  const [randomMode, setRandomMode] = useState<'solo' | 'battle'>('solo');
  const [battleStudentA, setBattleStudentA] = useState<Student | null>(null);
  const [battleStudentB, setBattleStudentB] = useState<Student | null>(null);
  const [battleScoreA, setBattleScoreA] = useState<number>(0);
  const [battleScoreB, setBattleScoreB] = useState<number>(0);
  const [battleResultSummary, setBattleResultSummary] = useState<{
    studentA: Student;
    studentB: Student;
    winner: Student | null;
    scoreA: number;
    scoreB: number;
    diff: number;
    resultMsg: string;
    ludoTurns: BattleLudoTurn[];
  } | null>(null);
  const [uncalledMap, setUncalledMap] = useState<Record<string, string[]>>({}); // Fair round-robin random queue

  // Lucky Wheel State
  const [showLuckyWheelModal, setShowLuckyWheelModal] = useState(false);
  const [isLuckyWheelSpinning, setIsLuckyWheelSpinning] = useState(false);
  const [luckyWheelRotation, setLuckyWheelRotation] = useState(0);
  const [luckyWheelResult, setLuckyWheelResult] = useState<LuckyWheelResult | null>(null);
  const [luckyWheelPendingResult, setLuckyWheelPendingResult] = useState<LuckyWheelResult | null>(null);
  const [luckyWheelCandidateIds, setLuckyWheelCandidateIds] = useState<string[]>([]);
  const [luckyWheelMode, setLuckyWheelMode] = useState<'normal' | 'ludo-finish'>('normal');
  const [luckyWheelRewards, setLuckyWheelRewards] = useState<LuckyWheelReward[]>(() => {
    const saved = localStorage.getItem(LUCKY_WHEEL_REWARDS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.error("Error loading custom lucky wheel rewards:", err);
      }
    }
    return DEFAULT_LUCKY_WHEEL_REWARDS;
  });
  const [luckyWheelDisplayRewards, setLuckyWheelDisplayRewards] = useState<LuckyWheelReward[]>(DEFAULT_LUCKY_WHEEL_REWARDS);
  const luckyWheelRef = useRef<HTMLDivElement | null>(null);
  const luckyWheelSpinAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cá Ngựa / Ludo Game State
  const [showLudoModal, setShowLudoModal] = useState(false);
  const [ludoPositions, setLudoPositions] = useState<Record<string, number>>({});
  const [ludoSteps, setLudoSteps] = useState<Record<string, number>>({});
  const [ludoMonsterStuck, setLudoMonsterStuck] = useState<Record<string, boolean>>({});
  const [ludoVisitedSpecialTiles, setLudoVisitedSpecialTiles] = useState<Record<number, boolean>>({});
  const [ludoActiveStudent, setLudoActiveStudent] = useState<Student | null>(null);
  const [ludoClassName, setLudoClassName] = useState<string>('');
  const [ludoDice, setLudoDice] = useState<number | null>(null);
  const [ludoRolling, setLudoRolling] = useState(false);
  const [ludoPopup, setLudoPopup] = useState<{ title: string; desc: string; icon: string } | null>(null);
  const [ludoLogs, setLudoLogs] = useState<string[]>([]);
  const [ludoBonusRolls, setLudoBonusRolls] = useState<Record<string, number>>({});
  const [battleLudoQueue, setBattleLudoQueue] = useState<BattleLudoTurn[]>([]);
  const [ludoEventPopup, setLudoEventPopup] = useState<{
    title: string;
    message: string;
    actor: Student;
    target?: Student;
    icon: string;
    type: 'kick' | 'special' | 'finish' | 'monster' | 'curse' | 'portal';
    tileIndex?: number;
  } | null>(null);

  // Custom Ludo Special Tiles State
  const [customLudoTiles, setCustomLudoTiles] = useState<Record<number, LudoTileSpec>>(() => {
    const saved = localStorage.getItem('custom_ludo_tiles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Error loading custom Ludo tiles:", err);
      }
    }
    return DEFAULT_LUDO_TILES;
  });

  // Custom Ludo Tiles Form State in Settings
  const [tileFormIndex, setTileFormIndex] = useState<number>(0);
  const [tileFormTitle, setTileFormTitle] = useState<string>('');
  const [tileFormDesc, setTileFormDesc] = useState<string>('');
  const [tileFormIcon, setTileFormIcon] = useState<string>('🚀');
  const [tileFormType, setTileFormType] = useState<'portal' | 'curse' | 'treasure' | 'monster' | 'restart'>('portal');
  const [tileFormValue, setTileFormValue] = useState<number>(3);
  const [editingTileIndex, setEditingTileIndex] = useState<number | null>(null);

  // Pokemon Fusion State
  const [selectedFusionPetDexIds, setSelectedFusionPetDexIds] = useState<number[]>([]);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupSize, setGroupSize] = useState(2);
  const [generatedGroups, setGeneratedGroups] = useState<Student[][]>([]);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerTime, setTimerTime] = useState(0); 
  const [timerRunning, setTimerRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  // Edict handling
  const [edict, setEdict] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<'info' | 'pet' | 'fusion'>('info');

  // Hatching State variables
  const [showHatchModal, setShowHatchModal] = useState(false);
  const [hatchSuccessMessage, setHatchSuccessMessage] = useState<string>('');
  const [pokemonReleaseEvent, setPokemonReleaseEvent] = useState<PokemonReleaseEvent | null>(null);

  // Audio settings
  const [posSoundUrl, setPosSoundUrl] = useState('https://actions.google.com/sounds/v1/foley/ting.ogg');
  const [negSoundUrl, setNegSoundUrl] = useState('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  const [timerSoundUrl, setTimerSoundUrl] = useState('https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg');
  const [wheelSpinSoundUrl, setWheelSpinSoundUrl] = useState('https://actions.google.com/sounds/v1/transportation/airport_departure_chime.ogg');
  const [wheelFinishSoundUrl, setWheelFinishSoundUrl] = useState('https://actions.google.com/sounds/v1/cartoon/concussive_hit_guitar_boing.ogg');

  // Cloud Sync properties
  const { user, profile, loginWithEmail, signUpWithEmail, signInWithGoogle, logout, updateUserProfile, loading: authLoading } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<number | null>(null);
  const [initialCloudLoadComplete, setInitialCloudLoadComplete] = useState(false);
  const [cloudLoadSuccess, setCloudLoadSuccess] = useState(false);

  // Reference to store last synced state snapshot for differential sync
  const lastSyncedSnapshotRef = useRef<string>('');

  // User Profile Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState('');
  const [editingPhotoURL, setEditingPhotoURL] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState<Record<string, boolean>>({
    sound: false,
    ranks: false,
    skills: false,
    petSkills: false,
    pokemonReset: false,
    ludo: false,
    luckyWheel: false,
    data: false
  });

  useEffect(() => {
    if (profile) {
      setEditingDisplayName(profile.displayName || '');
      setEditingPhotoURL(profile.photoURL || '');
    }
    if (!showUserModal) {
      setConfirmLogout(false);
    }
  }, [profile, showUserModal]);

  useEffect(() => {
    return () => {
      if (pokemonReactionTimerRef.current) {
        window.clearTimeout(pokemonReactionTimerRef.current);
      }
    };
  }, []);

  const showPokemonReaction = (events: PokemonUiEvent[], title = 'Tiến triển Pokémon') => {
    if (events.length === 0) return;
    if (pokemonReactionTimerRef.current) {
      window.clearTimeout(pokemonReactionTimerRef.current);
    }
    setPokemonReactionTitle(title);
    setPokemonReactionEvents(events.slice(0, 4));
    const levelEvents = events.filter(event => event.type === 'level-up');
    if (levelEvents.length > 0) {
      setLevelUpAnnouncement({
        title,
        events: levelEvents.slice(0, 3)
      });
    }
  };

  // Sync state FROM Supabase on login (high priority)
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setInitialCloudLoadComplete(false);
      setCloudLoadSuccess(false);
      setLastSyncedTime(null);
      lastSyncedSnapshotRef.current = '';
      return;
    }

    const fetchCloudData = async () => {
      setIsSyncing(true);
      try {
        const cloudData = await fetchUserSettings(user.uid);

        if (cloudData) {
          const cloudStudents = Array.isArray(cloudData.students)
            ? cloudData.students.map(normalizeStudentPokemonData)
            : [];
          if (cloudData.students && Array.isArray(cloudData.students)) setStudents(cloudStudents);
          if (cloudData.ranksMale && Array.isArray(cloudData.ranksMale)) setRanksMale(cloudData.ranksMale);
          if (cloudData.ranksFemale && Array.isArray(cloudData.ranksFemale)) setRanksFemale(cloudData.ranksFemale);
          if (cloudData.skills && Array.isArray(cloudData.skills)) setSkills(cloudData.skills);
          if (cloudData.petSkills && Array.isArray(cloudData.petSkills) && cloudData.petSkills.length > 0) {
            setPetSkills(cloudData.petSkills);
            localStorage.setItem(PET_SKILLS_KEY, JSON.stringify(cloudData.petSkills));
          }
          if (cloudData.posSoundUrl) setPosSoundUrl(cloudData.posSoundUrl);
          if (cloudData.negSoundUrl) setNegSoundUrl(cloudData.negSoundUrl);
          if (cloudData.timerSoundUrl) setTimerSoundUrl(cloudData.timerSoundUrl);
          if (cloudData.wheelSpinSoundUrl) setWheelSpinSoundUrl(cloudData.wheelSpinSoundUrl);
          if (cloudData.wheelFinishSoundUrl) setWheelFinishSoundUrl(cloudData.wheelFinishSoundUrl);
          if (cloudData.customLudoTiles && typeof cloudData.customLudoTiles === 'object') {
            setCustomLudoTiles(cloudData.customLudoTiles);
            localStorage.setItem('custom_ludo_tiles', JSON.stringify(cloudData.customLudoTiles));
          }
          if (cloudData.luckyWheelRewards && Array.isArray(cloudData.luckyWheelRewards) && cloudData.luckyWheelRewards.length > 0) {
            setLuckyWheelRewards(cloudData.luckyWheelRewards);
            setLuckyWheelDisplayRewards(cloudData.luckyWheelRewards);
            localStorage.setItem(LUCKY_WHEEL_REWARDS_KEY, JSON.stringify(cloudData.luckyWheelRewards));
          }
          setLastSyncedTime(cloudData.updatedAt || Date.now());

          // Save snapshot ref to prevent immediate re-sync of unchanged data
          lastSyncedSnapshotRef.current = JSON.stringify({
            students: cloudStudents,
            ranksMale: cloudData.ranksMale || [],
            ranksFemale: cloudData.ranksFemale || [],
            skills: cloudData.skills || [],
            petSkills: cloudData.petSkills || DEFAULT_PET_SKILLS,
            posSoundUrl: cloudData.posSoundUrl || '',
            negSoundUrl: cloudData.negSoundUrl || '',
            timerSoundUrl: cloudData.timerSoundUrl || '',
            wheelSpinSoundUrl: cloudData.wheelSpinSoundUrl || '',
            wheelFinishSoundUrl: cloudData.wheelFinishSoundUrl || '',
            customLudoTiles: cloudData.customLudoTiles || {},
            luckyWheelRewards: cloudData.luckyWheelRewards || DEFAULT_LUCKY_WHEEL_REWARDS
          });

          // Also save a fallback local copy
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudStudents));
          if (cloudData.ranksMale) localStorage.setItem(RANKS_KEY_MALE, JSON.stringify(cloudData.ranksMale));
          if (cloudData.ranksFemale) localStorage.setItem(RANKS_KEY_FEMALE, JSON.stringify(cloudData.ranksFemale));
          if (cloudData.skills) localStorage.setItem(SKILLS_KEY, JSON.stringify(cloudData.skills));
          if (cloudData.petSkills) localStorage.setItem(PET_SKILLS_KEY, JSON.stringify(cloudData.petSkills));
          if (cloudData.posSoundUrl) localStorage.setItem('imperial_sound_pos', cloudData.posSoundUrl);
          if (cloudData.negSoundUrl) localStorage.setItem('imperial_sound_neg', cloudData.negSoundUrl);
          if (cloudData.timerSoundUrl) localStorage.setItem('imperial_sound_tim', cloudData.timerSoundUrl);
          if (cloudData.wheelSpinSoundUrl) localStorage.setItem(WHEEL_SPIN_SOUND_KEY, cloudData.wheelSpinSoundUrl);
          if (cloudData.wheelFinishSoundUrl) localStorage.setItem(WHEEL_FINISH_SOUND_KEY, cloudData.wheelFinishSoundUrl);
        } else {
          // First time logging in: check if there's any local storage data to migrate
          const saved = localStorage.getItem(STORAGE_KEY);
          let localStudents: Student[] = [];
          if (saved) {
            try {
              localStudents = JSON.parse(saved).map(normalizeStudentPokemonData);
            } catch (err) {
              console.error(err);
            }
          }
          
          const savedMaleRanks = localStorage.getItem(RANKS_KEY_MALE);
          const localMaleRanks = savedMaleRanks ? JSON.parse(savedMaleRanks) : DEFAULT_RANKS_MALE;

          const savedFemaleRanks = localStorage.getItem(RANKS_KEY_FEMALE);
          const localFemaleRanks = savedFemaleRanks ? JSON.parse(savedFemaleRanks) : DEFAULT_RANKS_FEMALE;

          const savedSkills = localStorage.getItem(SKILLS_KEY);
          const localSkills = savedSkills ? JSON.parse(savedSkills) : DEFAULT_SKILLS;

          const savedPetSkills = localStorage.getItem(PET_SKILLS_KEY);
          const localPetSkills = savedPetSkills ? JSON.parse(savedPetSkills) : DEFAULT_PET_SKILLS;

          const savedLuckyWheelRewards = localStorage.getItem(LUCKY_WHEEL_REWARDS_KEY);
          const localLuckyWheelRewards = savedLuckyWheelRewards ? JSON.parse(savedLuckyWheelRewards) : DEFAULT_LUCKY_WHEEL_REWARDS;

          // Push local state to cloud to prevent data loss on onboarding
          const updatedAt = await upsertUserSettings(user.uid, {
            students: localStudents,
            ranksMale: localMaleRanks,
            ranksFemale: localFemaleRanks,
            skills: localSkills,
            petSkills: localPetSkills,
            posSoundUrl,
            negSoundUrl,
            timerSoundUrl,
            wheelSpinSoundUrl,
            wheelFinishSoundUrl,
            customLudoTiles,
            luckyWheelRewards: localLuckyWheelRewards
          });

          lastSyncedSnapshotRef.current = JSON.stringify({
            students: localStudents,
            ranksMale: localMaleRanks,
            ranksFemale: localFemaleRanks,
            skills: localSkills,
            petSkills: localPetSkills,
            posSoundUrl,
            negSoundUrl,
            timerSoundUrl,
            wheelSpinSoundUrl,
            wheelFinishSoundUrl,
            customLudoTiles,
            luckyWheelRewards: localLuckyWheelRewards
          });
          
          setStudents(localStudents);
          setRanksMale(localMaleRanks);
          setRanksFemale(localFemaleRanks);
          setSkills(localSkills);
          setPetSkills(localPetSkills);
          setLuckyWheelRewards(localLuckyWheelRewards);
          setLuckyWheelDisplayRewards(localLuckyWheelRewards);
          setLastSyncedTime(updatedAt);
        }
        setCloudLoadSuccess(true);
        setInitialCloudLoadComplete(true);
      } catch (err) {
        console.error("Error pulling database sync from Supabase:", err);
        setCloudLoadSuccess(false);
        setInitialCloudLoadComplete(false);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchCloudData();
  }, [user, authLoading]);

  // Sync state TO Supabase whenever local data changes (except during initial load)
  useEffect(() => {
    if (!user || !initialCloudLoadComplete || !cloudLoadSuccess) return;

    const currentSnapshot = JSON.stringify({
      students,
      ranksMale,
      ranksFemale,
      skills,
      petSkills,
      posSoundUrl,
      negSoundUrl,
      timerSoundUrl,
      wheelSpinSoundUrl,
      wheelFinishSoundUrl,
      customLudoTiles,
      luckyWheelRewards
    });

    // DIFFERENTIAL INCREMENTAL SYNC CHECK:
    // Only perform auto-sync if current data is DIFFERENT from the last synced snapshot!
    // If nothing changed, we skip cloud writes completely to preserve existing data and save bandwidth.
    if (currentSnapshot === lastSyncedSnapshotRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const updatedAt = await upsertUserSettings(user.uid, {
          students,
          ranksMale,
          ranksFemale,
          skills,
          petSkills,
          posSoundUrl,
          negSoundUrl,
          timerSoundUrl,
          wheelSpinSoundUrl,
          wheelFinishSoundUrl,
          customLudoTiles,
          luckyWheelRewards,
        });

        lastSyncedSnapshotRef.current = currentSnapshot;
        setLastSyncedTime(updatedAt);
      } catch (err) {
        console.error("Auto-sync to cloud failed:", err);
      } finally {
        setIsSyncing(false);
      }
    }, 1500); // 1.5s debounce to group multiple rapid edits together

    return () => clearTimeout(timer);
  }, [students, ranksMale, ranksFemale, skills, petSkills, posSoundUrl, negSoundUrl, timerSoundUrl, wheelSpinSoundUrl, wheelFinishSoundUrl, customLudoTiles, luckyWheelRewards, user, initialCloudLoadComplete, cloudLoadSuccess]);

  // Sync Ludo position state maps whenever students array loads or changes
  useEffect(() => {
    if (students && students.length > 0) {
      const posMap: Record<string, number> = {};
      const stepsMap: Record<string, number> = {};
      const stuckMap: Record<string, boolean> = {};

      students.forEach(s => {
        posMap[s.id] = s.ludoTile || 0;
        stepsMap[s.id] = s.ludoSteps || 0;
        stuckMap[s.id] = !!s.ludoMonsterStuck;
      });

      setLudoPositions(posMap);
      setLudoSteps(stepsMap);
      setLudoMonsterStuck(stuckMap);
    }
  }, [students]);

  // Save customLudoTiles to local storage whenever updated
  useEffect(() => {
    localStorage.setItem('custom_ludo_tiles', JSON.stringify(customLudoTiles));
  }, [customLudoTiles]);

  useEffect(() => {
    localStorage.setItem(PET_SKILLS_KEY, JSON.stringify(petSkills));
  }, [petSkills]);

  // Persistence (Guest Mode)
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed: Student[] = JSON.parse(saved);
          const migrated = parsed.map(s => {
            if (!s.egg && !s.pet) {
              const randomPokemon = getRandomPokemon();
              return {
                ...s,
                egg: {
                  progress: 0,
                  status: 'egg' as const,
                  assignedDexId: randomPokemon.dexId,
                  kind: 'normal' as const,
                  requiredProgress: 10
                }
              };
            }
            return s;
          }).map(normalizeStudentPokemonData);
          setStudents(migrated);
        } catch (err) {
          console.error("Failed to parse saved students", err);
        }
      } else {
        setStudents([]);
      }

      const savedMaleRanks = localStorage.getItem(RANKS_KEY_MALE);
      if (savedMaleRanks) setRanksMale(JSON.parse(savedMaleRanks));
      else setRanksMale(DEFAULT_RANKS_MALE);

      const savedFemaleRanks = localStorage.getItem(RANKS_KEY_FEMALE);
      if (savedFemaleRanks) setRanksFemale(JSON.parse(savedFemaleRanks));
      else setRanksFemale(DEFAULT_RANKS_FEMALE);

      const savedSkills = localStorage.getItem(SKILLS_KEY);
      if (savedSkills) setSkills(JSON.parse(savedSkills));
      else setSkills(DEFAULT_SKILLS);

      const savedPetSkills = localStorage.getItem(PET_SKILLS_KEY);
      if (savedPetSkills) setPetSkills(JSON.parse(savedPetSkills));
      else setPetSkills(DEFAULT_PET_SKILLS);
      
      const sPos = localStorage.getItem('imperial_sound_pos');
      const sNeg = localStorage.getItem('imperial_sound_neg');
      const sTim = localStorage.getItem('imperial_sound_tim');
      const sWheelSpin = localStorage.getItem(WHEEL_SPIN_SOUND_KEY);
      const sWheelFinish = localStorage.getItem(WHEEL_FINISH_SOUND_KEY);
      if (sPos) setPosSoundUrl(sPos);
      if (sNeg) setNegSoundUrl(sNeg);
      if (sTim) setTimerSoundUrl(sTim);
      if (sWheelSpin) setWheelSpinSoundUrl(sWheelSpin);
      if (sWheelFinish) setWheelFinishSoundUrl(sWheelFinish);

      const savedLuckyWheelRewards = localStorage.getItem(LUCKY_WHEEL_REWARDS_KEY);
      if (savedLuckyWheelRewards) {
        const parsedRewards = JSON.parse(savedLuckyWheelRewards);
        if (Array.isArray(parsedRewards) && parsedRewards.length > 0) {
          setLuckyWheelRewards(parsedRewards);
          setLuckyWheelDisplayRewards(parsedRewards);
        }
      } else {
        setLuckyWheelRewards(DEFAULT_LUCKY_WHEEL_REWARDS);
        setLuckyWheelDisplayRewards(DEFAULT_LUCKY_WHEEL_REWARDS);
      }
    }
  }, [authLoading, user]);

  useEffect(() => { 
    if (!user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(students)); 
    }
  }, [students, user]);

  useEffect(() => { 
    if (!user) {
      localStorage.setItem(RANKS_KEY_MALE, JSON.stringify(ranksMale)); 
    }
  }, [ranksMale, user]);

  useEffect(() => { 
    if (!user) {
      localStorage.setItem(RANKS_KEY_FEMALE, JSON.stringify(ranksFemale)); 
    }
  }, [ranksFemale, user]);

  useEffect(() => { 
    if (!user) {
      localStorage.setItem(SKILLS_KEY, JSON.stringify(skills)); 
    }
  }, [skills, user]);

  useEffect(() => {
    localStorage.setItem(LUCKY_WHEEL_REWARDS_KEY, JSON.stringify(luckyWheelRewards));
  }, [luckyWheelRewards]);

  // Ranking Utility
  const getRank = (points: number, gender: Gender): RankInfo => {
    const list = gender === Gender.MALE ? ranksMale : ranksFemale;
    const sorted = [...list].sort((a, b) => b.minPoints - a.minPoints);
    return sorted.find(r => points >= r.minPoints) || list[0];
  };

  // Derived Data
  const classes = useMemo(() => ['Tất cả', ...Array.from(new Set(students.map(s => s.className)))], [students]);
  
  const currentClassStudents = useMemo(() => {
    let list = students.filter(s => filterClass === 'Tất cả' || s.className === filterClass);
    if (searchQuery) list = list.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (sortType === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortType === 'points-desc') list.sort((a, b) => b.points - a.points);
    else if (sortType === 'points-asc') list.sort((a, b) => a.points - b.points);
    return list;
  }, [students, filterClass, searchQuery, sortType]);

  const presentStudents = useMemo(() => currentClassStudents.filter(s => !s.isAbsent), [currentClassStudents]);
  const homeworkLessonDateKey = getLocalDateKey();
  const editingPetEvolutionPreview = useMemo(() => getNextEvolutionPreview(editingStudent?.pet), [editingStudent?.pet]);
  const classOptions = useMemo(() => classes.filter(c => c !== 'Tất cả'), [classes]);
  const luckyWheelBackground = useMemo(() => {
    const rewardsForWheel = luckyWheelDisplayRewards.length > 0 ? luckyWheelDisplayRewards : luckyWheelRewards;
    if (rewardsForWheel.length === 0) return '#facc15';
    const sliceSize = 100 / rewardsForWheel.length;
    return `conic-gradient(${rewardsForWheel.map((reward, idx) => `${reward.color} ${idx * sliceSize}% ${(idx + 1) * sliceSize}%`).join(', ')})`;
  }, [luckyWheelDisplayRewards, luckyWheelRewards]);
  const activeLudoClassName = ludoClassName || (filterClass !== 'Tất cả' ? filterClass : classOptions[0] || '');
  const ludoRaceStudents = useMemo(() => {
    if (!activeLudoClassName) return [];
    return students
      .filter(s => s.className === activeLudoClassName && !s.isAbsent)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, activeLudoClassName]);

  useEffect(() => {
    if (ludoActiveStudent && ludoActiveStudent.className !== activeLudoClassName) {
      setLudoActiveStudent(null);
    }
  }, [activeLudoClassName, ludoActiveStudent]);

  // Actions
  const openLudoForClass = (className?: string, activeStudent?: Student | null) => {
    const nextClass = className || (filterClass !== 'Tất cả' ? filterClass : classOptions[0] || '');
    if (!nextClass) {
      alert("Chưa có lớp nào để mở đường đua Cá Ngựa.");
      return;
    }
    setLudoClassName(nextClass);
    setLudoActiveStudent(activeStudent && activeStudent.className === nextClass ? activeStudent : null);
    setLudoDice(null);
    setShowLudoModal(true);
  };

  const openBattleLudoTurns = (turns: BattleLudoTurn[]) => {
    const validTurns = turns
      .map(turn => {
        const student = students.find(s => s.id === turn.studentId);
        return student && !student.isAbsent ? { turn, student } : null;
      })
      .filter(Boolean) as { turn: BattleLudoTurn; student: Student }[];

    if (validTurns.length === 0) {
      alert("Không có học sinh hợp lệ để lắc Cá Ngựa sau Battle.");
      return;
    }

    setBattleLudoQueue(validTurns.map(item => item.turn));
    openLudoForClass(validTurns[0].student.className, validTurns[0].student);
  };

  const getRandomIndex = (length: number) => {
    if (length <= 0) return 0;
    if (window.crypto?.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % length;
    }
    return Math.floor(Math.random() * length);
  };

  const SPECIAL_POKEMON_DEX_IDS = new Set([
    144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
    480, 481, 482, 483, 484, 485, 486, 487, 488, 491, 492, 493, 494, 638, 639, 640, 641, 642, 643, 644, 645,
    646, 647, 648, 649, 716, 717, 718, 719, 720, 721, 772, 773, 785, 786, 787, 788, 789, 790, 791, 792,
    800, 801, 802, 807, 808, 809, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 905, 1001, 1002,
    1003, 1004, 1007, 1008, 1009, 1010, 1014, 1015, 1016, 1017, 1020, 1021, 1022, 1023, 1024, 1025
  ]);

  const getEggRequiredProgress = (egg?: StudentEgg): number => egg?.requiredProgress || (egg?.kind === 'special' ? 15 : 10);
  const getEggLabel = (kind: 'normal' | 'special') => kind === 'special' ? 'Trứng đặc biệt' : 'Trứng thường';
  const getEggCost = (kind: 'normal' | 'special') => kind === 'special' ? 20 : 10;

  const getRandomEggDexId = (kind: 'normal' | 'special' = 'normal') => {
    const specialPool = LIST_POKEMONS.filter(pokemon => SPECIAL_POKEMON_DEX_IDS.has(pokemon.dexId));
    const normalPool = LIST_POKEMONS.filter(pokemon => !SPECIAL_POKEMON_DEX_IDS.has(pokemon.dexId));
    const useSpecialPool = kind === 'special' || getRandomIndex(100) >= 80;
    const pool = useSpecialPool && specialPool.length > 0 ? specialPool : normalPool.length > 0 ? normalPool : LIST_POKEMONS;
    return pool[getRandomIndex(pool.length)]?.dexId || 25;
  };

  const createEgg = (kind: 'normal' | 'special' = 'normal'): StudentEgg => ({
    progress: 0,
    status: 'egg',
    assignedDexId: getRandomEggDexId(kind),
    kind,
    requiredProgress: kind === 'special' ? 15 : 10
  });

  const advanceEggForStudent = (student: Student, amount: number) => {
    let currentEgg = student.egg ? { ...student.egg } : createEgg('normal');
    let currentStudent = student;
    let hatchedPet: PokemonPet | null = null;

    if (amount > 0 && currentEgg.status === 'egg') {
      const requiredProgress = getEggRequiredProgress(currentEgg);
      const nextProgress = currentEgg.progress + amount;
      currentEgg = {
        ...currentEgg,
        requiredProgress,
        progress: Math.min(requiredProgress, nextProgress)
      };

      if (currentEgg.progress >= requiredProgress) {
        currentEgg.status = 'hatched';
        hatchedPet = createPokemonPetFromDexId(currentEgg.assignedDexId);
        currentStudent = {
          ...currentStudent,
          pet: hatchedPet,
          pets: [hatchedPet, ...(currentStudent.pets || []).filter(p => !isSamePokemon(p, hatchedPet))]
        };
      }
    }

    return {
      student: {
        ...currentStudent,
        egg: currentEgg
      },
      egg: currentEgg,
      hatchedPet
    };
  };

  const shuffleLuckyWheelRewards = (rewards: LuckyWheelReward[]) => {
    const next = [...rewards];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = getRandomIndex(i + 1);
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  };

  const isGoodLuckyWheelReward = (reward: LuckyWheelReward) => {
    if (reward.type === 'points' || reward.type === 'hp') return (reward.amount || 0) > 0;
    return reward.type === 'pokemon' || reward.type === 'skill' || reward.type === 'ludo_rolls';
  };

  const getWeightedLudoFinishRewards = () => {
    const sourceRewards = luckyWheelRewards.length > 0 ? luckyWheelRewards : DEFAULT_LUCKY_WHEEL_REWARDS;
    const goodRewards = sourceRewards.filter(isGoodLuckyWheelReward);
    const badRewards = sourceRewards.filter(reward => !isGoodLuckyWheelReward(reward) && (reward.type === 'points' || reward.type === 'hp'));
    return {
      goodRewards,
      badRewards,
      displayRewards: shuffleLuckyWheelRewards([...goodRewards, ...badRewards])
    };
  };

  const chooseLuckyWheelReward = (validRewards: LuckyWheelReward[]) => {
    if (luckyWheelMode !== 'ludo-finish') return validRewards[getRandomIndex(validRewards.length)];

    const goodRewards = validRewards.filter(isGoodLuckyWheelReward);
    const badRewards = validRewards.filter(reward => !isGoodLuckyWheelReward(reward) && (reward.type === 'points' || reward.type === 'hp'));
    const preferGood = getRandomIndex(100) < 60;
    const preferredPool = preferGood ? goodRewards : badRewards;
    const fallbackPool = preferGood ? badRewards : goodRewards;
    const pool = preferredPool.length > 0 ? preferredPool : fallbackPool.length > 0 ? fallbackPool : validRewards;
    return pool[getRandomIndex(pool.length)];
  };

  const openLuckyWheelForLudoFinish = (student: Student) => {
    if (isLuckyWheelSpinning) return;
    const { displayRewards } = getWeightedLudoFinishRewards();
    setLuckyWheelMode('ludo-finish');
    setLuckyWheelCandidateIds([student.id]);
    setLuckyWheelDisplayRewards(displayRewards);
    setLuckyWheelPendingResult(null);
    setLuckyWheelResult(null);
    setShowLuckyWheelModal(true);
  };

  const isSamePokemon = (a?: PokemonPet, b?: PokemonPet) => {
    return isSamePokemonPet(a, b);
  };

  const handleSelectReplacementPokemon = (pet: PokemonPet) => {
    if (!pokemonReleaseEvent) return;
    setStudents(prev => prev.map(s => {
      if (s.id !== pokemonReleaseEvent.studentId) return s;
      const nextPet = normalizePokemonPet(pet);
      const nextStudent = { ...s, pet: nextPet, pets: updatePetInCollection(s, nextPet) };
      if (editingStudent?.id === s.id) setEditingStudent(nextStudent);
      return nextStudent;
    }));
    setPokemonReleaseEvent(null);
  };

  const handleOpenEggAfterRelease = () => {
    if (!pokemonReleaseEvent) return;
    const student = students.find(s => s.id === pokemonReleaseEvent.studentId);
    if (student) {
      setEditingStudent(student);
      setProfileTab('pet');
      setCurrentScreen('profile');
    }
    setPokemonReleaseEvent(null);
  };

  const handleUpdatePoints = async (ids: string[], amount: number, reason: string, source: GameEventSource = 'manual') => {
    if (isNaN(amount)) return;

    // Play Sound using dynamic URLs
    const sound = new Audio(amount >= 0 ? posSoundUrl : negSoundUrl);
    sound.play().catch(() => {});

    let hatchedNames: string[] = [];
    let evolvedMessages: string[] = [];
    let progressionEvents: PokemonUiEvent[] = [];
    let releaseEventToShow: PokemonReleaseEvent | null = null;

    const updatedStudents = students.map(s => {
      if (ids.includes(s.id)) {
        const oldRank = getRank(s.points, s.gender);
        const newPoints = s.points + amount;
        const newRank = getRank(newPoints, s.gender);
        const history: HistoryItem = { id: Date.now().toString() + Math.random(), amount, reason, timestamp: Date.now() };

        if (ids.length === 1 && oldRank.id !== newRank.id) {
          generateEdict(s.name, newRank.title, newPoints > s.points).then(setEdict);
        }

        let currentStudent = normalizeStudentPokemonData(s);
        const eggResult = advanceEggForStudent(currentStudent, amount);
        currentStudent = eggResult.student;
        if (eggResult.hatchedPet) {
          hatchedNames.push(s.name);
        }

        if (currentStudent.pet && amount !== 0) {
          const hpUpdate = applyPetHpDeltaToStudent(currentStudent, amount, `${reason}: ${amount >= 0 ? 'hồi' : 'mất'} ${Math.abs(amount)} HP`);
          currentStudent = hpUpdate.student;
          if (hpUpdate.releaseEvent && !releaseEventToShow) {
            releaseEventToShow = hpUpdate.releaseEvent;
          }
        }

        if (source === 'solo') {
          const progressionResult = applyGameEventToStudent(
            { ...currentStudent, points: newPoints },
            {
              type: 'SOLO_RESULT',
              source,
              studentId: s.id,
              auraDelta: amount,
              timestamp: Date.now()
            }
          );
          currentStudent = progressionResult.student;
          progressionEvents = [...progressionEvents, ...progressionResult.uiEvents];
          progressionResult.uiEvents
            .filter(event => event.type === 'evolution')
            .forEach(event => evolvedMessages.push(`Linh thú của ${s.name}: ${event.message}!`));
        }

        return {
          ...currentStudent,
          points: newPoints,
          history: [history, ...currentStudent.history].slice(0, 50),
          egg: eggResult.egg
        };
      }
      return s;
    });

    setStudents(updatedStudents);
    if (releaseEventToShow) setPokemonReleaseEvent(releaseEventToShow);

    // Keep profile details in sync if points were changed while viewing them
    if (editingStudent && ids.includes(editingStudent.id)) {
      const updatedSelf = updatedStudents.find(x => x.id === editingStudent.id);
      if (updatedSelf) setEditingStudent(updatedSelf);
    }
    if (randomStudent && ids.includes(randomStudent.id)) {
      const updatedRandomStudent = updatedStudents.find(x => x.id === randomStudent.id);
      if (updatedRandomStudent) setRandomStudent(updatedRandomStudent);
    }

    if (source === 'solo' && !releaseEventToShow) {
      const toastEvents: PokemonUiEvent[] = [
        ...progressionEvents.filter(event => ['xp', 'bond', 'streak', 'passive', 'charge-ready', 'level-up', 'evolution', 'hp', 'random-drop', 'mastery'].includes(event.type))
      ];
      if (hatchedNames.length > 0) {
        toastEvents.unshift({
          type: 'evolution',
          message: `Trứng của ${hatchedNames.join(', ')} đã nở`
        });
      }
      const hasActivePetAfterUpdate = updatedStudents.some(student => ids.includes(student.id) && !!student.pet);
      if (amount !== 0 && hasActivePetAfterUpdate) {
        toastEvents.push({
          type: 'hp',
          message: amount > 0 ? `HP +${amount}` : `HP -${Math.abs(amount)}`
        });
      }
      showPokemonReaction(toastEvents, amount >= 0 ? 'Pokémon phản ứng vui vẻ' : 'Pokémon vẫn cố gắng');
    } else if (hatchedNames.length > 0) {
      setHatchSuccessMessage(`Tin vui chấn động triều đình! Quả trứng của học sĩ ${hatchedNames.join(', ')} đã nứt vỡ ra một Pokémon Cưng vô cùng đáng yêu! 🥚🐣💖`);
      setShowHatchModal(true);
    } else if (evolvedMessages.length > 0) {
      setHatchSuccessMessage(`✨ TIẾN HÓA THĂNG HOA ✨\n\n${evolvedMessages.join('\n')}\nĐạo pháp thâm sâu, linh khí đong đầy! Hãy vinh danh học sĩ.`);
      setShowHatchModal(true);
    }

    setShowSkillModal(false);
    if (source !== 'solo') {
      setShowRandomModal(false);
    }
    setFeedbackSource('manual');
    setManualPoints('');
    setSelectedStudentIds(source === 'solo' ? ids : []);
    setIsMultiSelectMode(false);
  };

  const handleBuySkill = (studentId: string, skillId: string, cost: number, skillName: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    if (student.points < cost) {
      alert(`Không đủ Hào quang! Học sĩ cần thêm ${cost - student.points} điểm để giác ngộ truyền thừa ${skillName}.`);
      return;
    }

    if (!window.confirm(`Bạn có đồng ý tiêu hao ${cost} điểm Hào quang để rèn luyện tuyệt kỹ ${skillName} cho Pet?`)) return;

    const newPoints = student.points - cost;
    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      amount: -cost,
      reason: `Học pháp bảo: ${skillName}`,
      timestamp: Date.now()
    };

    const updatedStudents = students.map(s => {
      if (s.id === studentId && s.pet) {
        const currentUses = s.pet.skillUses ? { ...s.pet.skillUses } : {};
        currentUses[skillId] = 0; // Reset usages to 0 on purchase!
        const updatedPet = {
          ...s.pet,
          skills: [...(s.pet.skills || []), skillId],
          skillUses: currentUses
        };
        const updatedS = {
          ...s,
          points: newPoints,
          pet: updatedPet,
          pets: updatePetInCollection(s, updatedPet),
          history: [historyItem, ...s.history].slice(0, 50)
        };
        // Update editingStudent too!
        setEditingStudent(updatedS);
        return updatedS;
      }
      return s;
    });

    setStudents(updatedStudents);
    new Audio(posSoundUrl).play().catch(() => {});
    alert(`Đại sư Pet cưng đã thông tuệ bí kíp ${skillName}! Khấu trừ ${cost} điểm.`);
  };

  const handleRenamePet = (studentId: string, newName: string) => {
    if (!newName.trim()) return;
    const updatedStudents = students.map(s => {
      if (s.id === studentId && s.pet) {
        const trimmedName = newName.trim();
        const updatedPet = {
          ...s.pet,
          nickname: trimmedName,
          name: trimmedName
        };
        const updatedS = { ...s, pet: updatedPet, pets: updatePetInCollection(s, updatedPet) };
        setEditingStudent(updatedS);
        return updatedS;
      }
      return s;
    });
    setStudents(updatedStudents);
  };

  const handleBuyNewEgg = (
    studentId: string,
    kind: 'normal' | 'special' = 'normal',
    options: { skipConfirm?: boolean; silent?: boolean } = {}
  ) => {
    const s = students.find(x => x.id === studentId);
    if (!s) return false;
    const cost = getEggCost(kind);
    const eggLabel = getEggLabel(kind);
    const requiredProgress = kind === 'special' ? 15 : 10;
    if (s.points < cost) {
      alert(`Không đủ Hào quang! Học sĩ cần tối thiểu ${cost} điểm để thỉnh ${eggLabel}.`);
      return false;
    }
    if (!options.skipConfirm && !window.confirm(`Bạn có đồng ý thỉnh ${eggLabel} bằng cách tiêu hao ${cost}đ Hào Quang? Trứng này cần +${requiredProgress} Hào Quang để nở.`)) return false;
    
    // Save current companion in collection
    const currentActivePet = s.pet;
    let ownedPets = s.pets ? [...s.pets] : [];
    if (currentActivePet) {
      const exists = ownedPets.some(p => isSamePokemon(p, currentActivePet));
      if (!exists) {
        ownedPets.push(currentActivePet);
      }
    }

    const nextPoints = s.points - cost;
    const historyItem: HistoryItem = {
      id: Date.now().toString() + Math.random(),
      amount: -cost,
      reason: `Thỉnh ${eggLabel} Pokémon mới (-${cost}đ)`,
      timestamp: Date.now()
    };

    const updatedS: Student = {
      ...s,
      points: nextPoints,
      egg: createEgg(kind),
      pet: undefined, // Clear active pet so they see incubating layout
      pets: ownedPets,
      history: [historyItem, ...s.history].slice(0, 50)
    };

    setStudents(prev => prev.map(x => x.id === studentId ? updatedS : x));
    if (editingStudent?.id === studentId) setEditingStudent(updatedS);
    new Audio(posSoundUrl).play().catch(() => {});
    if (!options.silent) {
      alert(`Mua ${eggLabel} thành công! Hãy tích cực cộng điểm để sinh linh sớm thức tỉnh khỏi vỏ trứng.`);
    }
    return true;
  };

  const handleOpenShop = () => {
    if (currentClassStudents.length === 0) {
      alert('Chưa có học sinh trong lớp hiện tại để mở Shop.');
      return;
    }
    setShopSelections({});
    setShopReview(null);
    setShowShopModal(true);
  };

  const toggleShopEgg = (studentId: string, kind: 'normal' | 'special') => {
    setShopSelections(prev => {
      const current = prev[studentId] || { skills: [] };
      return {
        ...prev,
        [studentId]: {
          ...current,
          egg: current.egg === kind ? undefined : kind
        }
      };
    });
  };

  const toggleShopSkill = (studentId: string, skillId: string) => {
    setShopSelections(prev => {
      const current = prev[studentId] || { skills: [] };
      const hasSkill = current.skills.includes(skillId);
      return {
        ...prev,
        [studentId]: {
          ...current,
          skills: hasSkill ? current.skills.filter(id => id !== skillId) : [...current.skills, skillId]
        }
      };
    });
  };

  const buildShopReview = (): ShopReviewItem[] => currentClassStudents
    .map(student => {
      const selection = shopSelections[student.id] || { skills: [] };
      const ownedSkillIds = student.pet?.skills || [];
      const skillIds = selection.skills.filter(skillId => student.pet && !ownedSkillIds.includes(skillId));
      const selectedSkills = skillIds
        .map(skillId => petSkills.find(skill => skill.id === skillId))
        .filter(Boolean) as PetSkill[];
      const skillCost = selectedSkills.reduce((sum, skill) => sum + skill.cost, 0);
      const eggCost = selection.egg ? getEggCost(selection.egg) : 0;
      const totalCost = skillCost + eggCost;
      const itemLabels = [
        ...selectedSkills.map(skill => `${skill.icon} ${skill.name}`),
        ...(selection.egg ? [`🥚 ${getEggLabel(selection.egg)}`] : [])
      ];

      return {
        studentId: student.id,
        studentName: student.name,
        pointBalance: student.points,
        egg: selection.egg,
        skillIds,
        itemLabels,
        totalCost,
        canAfford: totalCost > 0 && student.points >= totalCost
      };
    })
    .filter(item => item.totalCost > 0);

  const handlePrepareShopPurchase = () => {
    const reviewItems = buildShopReview();
    if (reviewItems.length === 0) {
      alert('Chưa tick món nào trong Shop.');
      return;
    }
    setShopReview(reviewItems);
  };

  const handleConfirmShopPurchase = () => {
    if (!shopReview) return;
    const purchasableItems = shopReview.filter(item => item.canAfford);
    if (purchasableItems.length === 0) {
      alert('Chưa có học sinh nào đủ Hào Quang để mua các món đã chọn.');
      return;
    }
    const purchaseMap = new Map(purchasableItems.map(item => [item.studentId, item]));
    const timestamp = Date.now();

    const updatedStudents = students.map(student => {
      const item = purchaseMap.get(student.id);
      if (!item) return student;

      let updatedStudent = normalizeStudentPokemonData(student);
      let updatedPet = updatedStudent.pet;
      const historyItems: HistoryItem[] = [];

      if (updatedPet && item.skillIds.length > 0) {
        const currentUses = updatedPet.skillUses ? { ...updatedPet.skillUses } : {};
        item.skillIds.forEach(skillId => {
          currentUses[skillId] = 0;
        });
        updatedPet = {
          ...updatedPet,
          skills: [...(updatedPet.skills || []), ...item.skillIds],
          skillUses: currentUses
        };
        updatedStudent = {
          ...updatedStudent,
          pet: updatedPet,
          pets: updatePetInCollection(updatedStudent, updatedPet)
        };
      }

      if (item.egg) {
        const currentActivePet = updatedStudent.pet;
        let ownedPets = updatedStudent.pets ? [...updatedStudent.pets] : [];
        if (currentActivePet && !ownedPets.some(p => isSamePokemon(p, currentActivePet))) {
          ownedPets.push(currentActivePet);
        }
        updatedStudent = {
          ...updatedStudent,
          egg: createEgg(item.egg),
          pet: undefined,
          pets: ownedPets
        };
      }

      historyItems.push({
        id: `${timestamp}${Math.random()}`,
        amount: -item.totalCost,
        reason: `🛒 Shop: ${item.itemLabels.join(', ')} (-${item.totalCost}đ)`,
        timestamp
      });

      return {
        ...updatedStudent,
        points: updatedStudent.points - item.totalCost,
        history: [...historyItems, ...updatedStudent.history].slice(0, 50)
      };
    });

    setStudents(updatedStudents);
    if (editingStudent) {
      const updatedEditingStudent = updatedStudents.find(student => student.id === editingStudent.id);
      if (updatedEditingStudent) setEditingStudent(updatedEditingStudent);
    }
    setShowShopModal(false);
    setShopReview(null);
    setShopSelections({});
    new Audio(posSoundUrl).play().catch(() => {});
    showPokemonReaction(
      [{ type: 'bond', message: `${purchasableItems.length} học sinh đã mua đồ trong Shop` }],
      'Shop đã chốt đơn'
    );
  };

  const handleSelectActivePet = (studentId: string, chosenPet: PokemonPet) => {
    const s = students.find(x => x.id === studentId);
    if (!s) return;

    let ownedPets = s.pets ? [...s.pets] : [];
    
    // Backup active pet if any
    if (s.pet) {
      const exists = ownedPets.some(p => isSamePokemon(p, s.pet));
      if (!exists) {
        ownedPets.push(s.pet);
      }
    }

    // Load selected pet as active
    const nextPet = normalizePokemonPet(chosenPet);

    const updatedS: Student = {
      ...s,
      pet: nextPet,
      pets: updatePetInCollection({ ...s, pets: ownedPets }, nextPet)
    };

    setStudents(prev => prev.map(x => x.id === studentId ? updatedS : x));
    setEditingStudent(updatedS);
    alert(`Linh thú ${getPokemonDisplayName(nextPet)} đã hiện diện kề vai sát cánh cùng học sĩ!`);
  };

  const handleUsePetSkill = (studentId: string, skillId: string, skillName: string) => {
    const s = students.find(x => x.id === studentId);
    if (!s || !s.pet) return;

    const skillUses = s.pet.skillUses ? { ...s.pet.skillUses } : {};
    const currentUses = skillUses[skillId] || 0;

    if (currentUses >= 2) {
      alert("Tuyệt chiêu này đã cạn kiệt linh năng!");
      return;
    }

    if (!window.confirm(`Bạn có đồng ý kích hoạt tuyệt học [${skillName}] của Linh thú?`)) return;

    const nextUses = currentUses + 1;
    let skillsList = [...s.pet.skills];
    let alertMsg = "";

    if (nextUses >= 2) {
      // Exploded! Remove
      skillsList = skillsList.filter(id => id !== skillId);
      delete skillUses[skillId];
      alertMsg = `Kích hoạt thành công [${skillName}] (Lần 2/2)!\n\nChiêu pháp đã cạn pháp khí nên đã bốc hơi rã tiên! Hãy mua lại bí truyền nếu muốn dùng tiếp.`;
    } else {
      skillUses[skillId] = nextUses;
      alertMsg = `Kích hoạt thành công [${skillName}] (Lần 1/2)! Còn lại 1 lượt vận công pháp báu.`;
    }

    const historyItem: HistoryItem = {
      id: Date.now().toString() + Math.random(),
      amount: 0,
      reason: `[Linh Thú] Pháp thuật kích hoạt: ${skillName} (${nextUses}/2)`,
      timestamp: Date.now()
    };

    const updatedPet = {
      ...s.pet,
      skills: skillsList,
      skillUses: skillUses
    };

    const updatedS: Student = {
      ...s,
      pet: updatedPet,
      pets: updatePetInCollection(s, updatedPet),
      history: [historyItem, ...s.history].slice(0, 50)
    };

    setStudents(prev => prev.map(x => x.id === studentId ? updatedS : x));
    setEditingStudent(updatedS);
    new Audio(posSoundUrl).play().catch(() => {});
    alert(alertMsg);
  };

  const handleExportJSON = () => {
    const data = {
      students,
      skills,
      petSkills,
      ranksMale,
      ranksFemale,
      posSoundUrl,
      negSoundUrl,
      timerSoundUrl,
      wheelSpinSoundUrl,
      wheelFinishSoundUrl,
      customLudoTiles,
      luckyWheelRewards,
      exportedAt: Date.now()
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `imperial_academy_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        const importedStudents = data.students && Array.isArray(data.students)
          ? data.students.map(normalizeStudentPokemonData)
          : [];
        if (data.students && Array.isArray(data.students)) {
          setStudents(importedStudents);
        }
        if (data.skills && Array.isArray(data.skills)) {
          setSkills(data.skills);
        }
        if (data.petSkills && Array.isArray(data.petSkills)) {
          setPetSkills(data.petSkills);
          localStorage.setItem(PET_SKILLS_KEY, JSON.stringify(data.petSkills));
        }
        if (data.ranksMale && Array.isArray(data.ranksMale)) {
          setRanksMale(data.ranksMale);
        }
        if (data.ranksFemale && Array.isArray(data.ranksFemale)) {
          setRanksFemale(data.ranksFemale);
        }
        if (data.posSoundUrl) {
          setPosSoundUrl(data.posSoundUrl);
        }
        if (data.negSoundUrl) {
          setNegSoundUrl(data.negSoundUrl);
        }
        if (data.timerSoundUrl) {
          setTimerSoundUrl(data.timerSoundUrl);
        }
        if (data.wheelSpinSoundUrl) {
          setWheelSpinSoundUrl(data.wheelSpinSoundUrl);
        }
        if (data.wheelFinishSoundUrl) {
          setWheelFinishSoundUrl(data.wheelFinishSoundUrl);
        }
        if (data.customLudoTiles && typeof data.customLudoTiles === 'object') {
          setCustomLudoTiles(data.customLudoTiles);
          localStorage.setItem('custom_ludo_tiles', JSON.stringify(data.customLudoTiles));
        }
        if (data.luckyWheelRewards && Array.isArray(data.luckyWheelRewards)) {
          setLuckyWheelRewards(data.luckyWheelRewards);
          setLuckyWheelDisplayRewards(data.luckyWheelRewards);
          localStorage.setItem(LUCKY_WHEEL_REWARDS_KEY, JSON.stringify(data.luckyWheelRewards));
        }

        // Trigger immediate sync to Supabase if user is authenticated
        if (user) {
          setIsSyncing(true);
          upsertUserSettings(user.uid, {
              students: importedStudents,
              ranksMale: data.ranksMale || [],
              ranksFemale: data.ranksFemale || [],
              skills: data.skills || [],
              petSkills: data.petSkills || petSkills,
              posSoundUrl: data.posSoundUrl || "",
              negSoundUrl: data.negSoundUrl || "",
              timerSoundUrl: data.timerSoundUrl || "",
              wheelSpinSoundUrl: data.wheelSpinSoundUrl || wheelSpinSoundUrl,
              wheelFinishSoundUrl: data.wheelFinishSoundUrl || wheelFinishSoundUrl,
              customLudoTiles: data.customLudoTiles || customLudoTiles,
              luckyWheelRewards: data.luckyWheelRewards || luckyWheelRewards
          }).then((updatedAt) => {
            setLastSyncedTime(updatedAt);
            setIsSyncing(false);
          }).catch((err) => {
            console.error("Cloud sync during import failed:", err);
            setIsSyncing(false);
          });
        }

        alert("Chúc mừng! Đã phục hồi toàn bộ cơ sở dữ liệu triều đình thành công hoàn tất! ⚜️🏯✨");
      } catch (err) {
        console.error("Import JSON failed", err);
        alert("Có lỗi xảy ra: Không thể giải mã tập tin JSON này! Xin vui lòng kiểm tra lại cấu trúc file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBackupToCloud = async (silent = false) => {
    if (!user) {
      if (!silent) alert("Vui lòng đăng nhập để thực hiện sao lưu lên đám mây!");
      return;
    }
    setIsSyncing(true);
    try {
      const updatedAt = await upsertUserSettings(user.uid, {
        students,
        ranksMale,
        ranksFemale,
        skills,
        petSkills,
        posSoundUrl,
        negSoundUrl,
        timerSoundUrl,
        wheelSpinSoundUrl,
        wheelFinishSoundUrl,
        customLudoTiles,
        luckyWheelRewards
      });
      setLastSyncedTime(updatedAt);
      if (!silent) {
        alert("Khánh chúc! Toàn bộ cơ sở dữ liệu học lục, sỹ tử và thiên sủng triều đình đã được SAO LƯU lên Đám mây (Supabase) thành công! ⚜️☁️✨");
      }
    } catch (err) {
      console.error("Backup to Cloud failed:", err);
      if (!silent) {
        alert("Có lỗi xảy ra khi sao lưu lên đám mây: " + (err instanceof Error ? err.message : String(err)));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập để phục hồi dữ liệu!");
      return;
    }
    if (!confirm("Người có chắc chắn muốn PHỤC HỒI dữ liệu từ đám mây? Thao tác này sẽ ghi đè toàn bộ dữ liệu hiện tại trên thiết bị!")) {
      return;
    }
    setIsSyncing(true);
    try {
      const cloudData = await fetchUserSettings(user.uid);

      if (cloudData) {
        if (cloudData.students && Array.isArray(cloudData.students)) {
          setStudents(cloudData.students);
        }
        if (cloudData.ranksMale && Array.isArray(cloudData.ranksMale)) {
          setRanksMale(cloudData.ranksMale);
        }
        if (cloudData.ranksFemale && Array.isArray(cloudData.ranksFemale)) {
          setRanksFemale(cloudData.ranksFemale);
        }
        if (cloudData.skills && Array.isArray(cloudData.skills)) {
          setSkills(cloudData.skills);
        }
        if (cloudData.petSkills && Array.isArray(cloudData.petSkills) && cloudData.petSkills.length > 0) {
          setPetSkills(cloudData.petSkills);
          localStorage.setItem(PET_SKILLS_KEY, JSON.stringify(cloudData.petSkills));
        }
        if (cloudData.posSoundUrl) {
          setPosSoundUrl(cloudData.posSoundUrl);
        }
        if (cloudData.negSoundUrl) {
          setNegSoundUrl(cloudData.negSoundUrl);
        }
        if (cloudData.timerSoundUrl) {
          setTimerSoundUrl(cloudData.timerSoundUrl);
        }
        if (cloudData.wheelSpinSoundUrl) {
          setWheelSpinSoundUrl(cloudData.wheelSpinSoundUrl);
          localStorage.setItem(WHEEL_SPIN_SOUND_KEY, cloudData.wheelSpinSoundUrl);
        }
        if (cloudData.wheelFinishSoundUrl) {
          setWheelFinishSoundUrl(cloudData.wheelFinishSoundUrl);
          localStorage.setItem(WHEEL_FINISH_SOUND_KEY, cloudData.wheelFinishSoundUrl);
        }
        if (cloudData.customLudoTiles && typeof cloudData.customLudoTiles === 'object') {
          setCustomLudoTiles(cloudData.customLudoTiles);
          localStorage.setItem('custom_ludo_tiles', JSON.stringify(cloudData.customLudoTiles));
        }
        if (cloudData.luckyWheelRewards && Array.isArray(cloudData.luckyWheelRewards) && cloudData.luckyWheelRewards.length > 0) {
          setLuckyWheelRewards(cloudData.luckyWheelRewards);
          setLuckyWheelDisplayRewards(cloudData.luckyWheelRewards);
          localStorage.setItem(LUCKY_WHEEL_REWARDS_KEY, JSON.stringify(cloudData.luckyWheelRewards));
        }
        setLastSyncedTime(cloudData.updatedAt || Date.now());
        alert("Khánh chúc! Đã PHỤC HỒI dữ liệu từ đám mây thành công tốt đẹp! Toàn bộ sỹ tử và tiên thú đã hội quân. ⚜️☁️✨");
      } else {
        alert("Không tìm thấy bản sao lưu nào của người dùng này trên Đám mây!");
      }
    } catch (err) {
      console.error("Restore from Cloud failed:", err);
      alert("Có lỗi xảy ra khi phục hồi từ đám mây: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteStudents = () => {
    if (selectedStudentIds.length === 0) return;
    const count = selectedStudentIds.length;
    const confirmMsg = count === 1 
      ? `Bạn có chắc chắn muốn xóa học sĩ này khỏi triều đình?` 
      : `Bạn có chắc chắn muốn xóa ${count} học sĩ đã chọn khỏi triều đình?`;
    
    if (window.confirm(confirmMsg)) {
      setStudents(prev => prev.filter(s => !selectedStudentIds.includes(s.id)));
      setSelectedStudentIds([]);
      setIsMultiSelectMode(false);
    }
  };

  const resetPokemonLevelToOne = (pet: PokemonPet): PokemonPet => {
    return normalizePokemonPet({
      ...pet,
      level: 1,
      xp: 0,
      totalXp: 0,
      masteryXp: 0,
      masteryStars: 0
    });
  };

  const resetStudentPokemonLevels = (student: Student): Student => {
    const currentPets = student.pets && student.pets.length > 0 ? student.pets : (student.pet ? [student.pet] : []);
    const resetPets = currentPets.map(resetPokemonLevelToOne);
    const activePet = student.pet ? resetPokemonLevelToOne(student.pet) : undefined;
    const mergedPets = activePet
      ? [activePet, ...resetPets.filter(pet => !isSamePokemon(pet, activePet))]
      : resetPets;
    const uniquePets = mergedPets.filter((pet, index, pets) => pets.findIndex(candidate => isSamePokemon(candidate, pet)) === index);

    return {
      ...student,
      pet: activePet,
      pets: uniquePets
    };
  };

  const handleResetPokemonLevels = () => {
    const affectedCount = students.filter(student => student.pet || (student.pets && student.pets.length > 0)).length;
    if (affectedCount === 0) {
      alert('Chưa có học sinh nào có Pokémon để reset level.');
      return;
    }
    if (!window.confirm(`Reset level toàn bộ Pokémon của ${affectedCount} học sinh về Level 1? Hào Quang, HP, kỹ năng và phụ kiện vẫn được giữ nguyên.`)) {
      return;
    }

    const updatedStudents = students.map(resetStudentPokemonLevels);
    setStudents(updatedStudents);

    if (editingStudent) {
      const updatedEditingStudent = updatedStudents.find(student => student.id === editingStudent.id);
      if (updatedEditingStudent) setEditingStudent(updatedEditingStudent);
    }
    if (randomStudent) {
      const updatedRandomStudent = updatedStudents.find(student => student.id === randomStudent.id);
      if (updatedRandomStudent) setRandomStudent(updatedRandomStudent);
    }

    showPokemonReaction(
      [{ type: 'level-up', message: `${affectedCount} học sinh: Pokémon đã về Level 1` }],
      'Reset Level Pokémon'
    );
  };

  const handleResetSelectedAura = () => {
    if (selectedStudentIds.length === 0) {
      alert('Hãy chọn học sinh cần reset Hào Quang trước.');
      return;
    }
    const selectedStudents = students.filter(student => selectedStudentIds.includes(student.id));
    if (selectedStudents.length === 0) {
      alert('Không tìm thấy học sinh đã chọn.');
      return;
    }
    if (!window.confirm(`Reset Hào Quang của ${selectedStudents.length} học sinh đã chọn về 0? Pokémon hiện có vẫn được giữ nguyên.`)) {
      return;
    }

    const timestamp = Date.now();
    const selectedSet = new Set(selectedStudentIds);
    const updatedStudents = students.map(student => {
      if (!selectedSet.has(student.id)) return student;
      const historyItem: HistoryItem = {
        id: `${timestamp}${Math.random()}`,
        amount: -student.points,
        reason: '🧹 Reset Hào Quang về 0',
        timestamp
      };
      return {
        ...student,
        points: 0,
        history: [historyItem, ...student.history].slice(0, 50)
      };
    });

    setStudents(updatedStudents);
    if (editingStudent && selectedSet.has(editingStudent.id)) {
      const updatedEditingStudent = updatedStudents.find(student => student.id === editingStudent.id);
      if (updatedEditingStudent) setEditingStudent(updatedEditingStudent);
    }
    if (randomStudent && selectedSet.has(randomStudent.id)) {
      const updatedRandomStudent = updatedStudents.find(student => student.id === randomStudent.id);
      if (updatedRandomStudent) setRandomStudent(updatedRandomStudent);
    }
    setSelectedStudentIds([]);
    setIsMultiSelectMode(false);

    showPokemonReaction(
      [{ type: 'bond', message: `${selectedStudents.length} học sinh đã reset Hào Quang về 0` }],
      'Reset Hào Quang'
    );
  };

  const toggleAttendance = (id: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const nextAbsent = !s.isAbsent;
      return {
        ...s,
        isAbsent: nextAbsent,
        attendanceStatus: nextAbsent ? 'absent' : 'present'
      };
    }));
  };

  const handleToggleSelectAll = () => {
    const activeClassStudents = currentClassStudents.filter(s => !s.isAbsent);
    if (activeClassStudents.length === 0) return;
    const activeIds = activeClassStudents.map(s => s.id);
    const isAllSelected = activeIds.length > 0 && activeIds.every(id => selectedStudentIds.includes(id));
    if (isAllSelected) {
      setSelectedStudentIds([]);
      setIsMultiSelectMode(false);
    } else {
      setSelectedStudentIds(activeIds);
      setIsMultiSelectMode(true);
    }
  };

  const openHomeworkCheck = () => {
    if (presentStudents.length === 0) {
      alert("Không có học sinh đang hiện diện để check BTVN.");
      return;
    }
    const defaultStatuses: Record<string, HomeworkStatus> = {};
    presentStudents.forEach(student => {
      defaultStatuses[student.id] = 'done';
    });
    setHomeworkStatuses(defaultStatuses);
    setShowHomeworkModal(true);
  };

  const openAttendanceCheck = () => {
    if (currentClassStudents.length === 0) {
      alert("Không có học sinh trong lớp hiện tại để check đi học.");
      return;
    }
    const defaultStatuses: Record<string, AttendanceStatus> = {};
    currentClassStudents.forEach(student => {
      defaultStatuses[student.id] = student.attendanceStatus || (student.isAbsent ? 'absent' : 'present');
    });
    setAttendanceStatuses(defaultStatuses);
    setShowAttendanceModal(true);
  };

  const setAttendanceStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceStatuses(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const toggleHomeworkStatus = (studentId: string) => {
    setHomeworkStatuses(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'done' ? 'not-yet' : prev[studentId] === 'not-yet' ? 'missing' : 'done'
    }));
  };

  const setHomeworkStatus = (studentId: string, status: HomeworkStatus) => {
    setHomeworkStatuses(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleConfirmHomeworkCheck = () => {
    const timestamp = Date.now();
    const uiEvents: PokemonUiEvent[] = [];
    let doneCount = 0;
    let notYetCount = 0;
    let missingCount = 0;
    let skippedCount = 0;
    let releaseEventToShow: PokemonReleaseEvent | null = null;

    const updatedStudents = students.map(student => {
      if (!presentStudents.some(present => present.id === student.id)) return student;

      const lessonKey = `${student.className}:${homeworkLessonDateKey}`;
      if (student.pokemonProgress?.lastHomeworkLessonKey === lessonKey) {
        skippedCount += 1;
        return student;
      }

      const status = homeworkStatuses[student.id] || 'done';
      const baseStudent = normalizeStudentPokemonData(student);
      const historyItem: HistoryItem = {
        id: timestamp.toString() + Math.random(),
        amount: status === 'done' ? 8 : status === 'missing' ? -10 : 0,
        reason: status === 'done'
          ? `📚 Homework Done (${homeworkLessonDateKey}) (+8 Hào Quang, Pokémon +8 HP)`
          : status === 'missing'
            ? `📚 Homework Missing (${homeworkLessonDateKey}) (-10 Hào Quang, Pokémon -10 HP)`
            : `📚 Homework Not Yet (${homeworkLessonDateKey})`,
        timestamp
      };

      if (status === 'not-yet') {
        notYetCount += 1;
        return baseStudent;
      }

      if (status === 'missing') {
        missingCount += 1;
        const result = applyGameEventToStudent(baseStudent, {
          type: 'HOMEWORK_MISSING',
          source: 'homework',
          studentId: student.id,
          lessonKey,
          timestamp
        });
        let resultStudent = {
          ...result.student,
          points: result.student.points - 10
        };
        if (resultStudent.pet) {
          const hpUpdate = applyPetHpDeltaToStudent(resultStudent, -10, 'Homework Missing: mất 10 HP');
          resultStudent = hpUpdate.student;
          if (hpUpdate.releaseEvent && !releaseEventToShow) releaseEventToShow = hpUpdate.releaseEvent;
          uiEvents.push({ type: 'hp', message: `${student.name}: Pokémon -10 HP` });
        }
        return {
          ...resultStudent,
          history: [historyItem, ...resultStudent.history].slice(0, 50)
        };
      }

      doneCount += 1;
      const rewardedStudent = {
        ...baseStudent,
        points: baseStudent.points + 8
      };
      const result = applyGameEventToStudent(baseStudent, {
        type: 'HOMEWORK_COMPLETE',
        source: 'homework',
        studentId: student.id,
        lessonKey,
        timestamp
      });
      let resultStudent = {
        ...result.student,
        points: rewardedStudent.points
      };
      const eggResult = advanceEggForStudent(resultStudent, 8);
      resultStudent = eggResult.student;
      if (eggResult.hatchedPet) {
        uiEvents.push({ type: 'evolution', message: `${student.name}: trứng đã nở` });
      }
      if (resultStudent.pet) {
        const hpUpdate = applyPetHpDeltaToStudent(resultStudent, 8, 'Homework Done: hồi 8 HP');
        resultStudent = hpUpdate.student;
        uiEvents.push({ type: 'hp', message: `${student.name}: Pokémon +8 HP` });
      }
      uiEvents.push(...result.uiEvents);

      return {
        ...resultStudent,
        history: [historyItem, ...resultStudent.history].slice(0, 50)
      };
    });

    setStudents(updatedStudents);
    if (releaseEventToShow) setPokemonReleaseEvent(releaseEventToShow);
    if (editingStudent) {
      const updatedEditingStudent = updatedStudents.find(student => student.id === editingStudent.id);
      if (updatedEditingStudent) setEditingStudent(updatedEditingStudent);
    }
    setShowHomeworkModal(false);
    setHomeworkStatuses({});

    const summaryEvents: PokemonUiEvent[] = [
      { type: 'bond', message: `${doneCount} Done · ${notYetCount} Not Yet · ${missingCount} Missing${skippedCount ? ` · ${skippedCount} đã chốt` : ''}` },
      ...uiEvents.filter(event => ['xp', 'bond', 'hp', 'streak', 'passive', 'level-up', 'evolution', 'mastery'].includes(event.type)).slice(0, 3)
    ];
    showPokemonReaction(summaryEvents, 'Homework Check đã chốt');
  };

  const handleConfirmAttendanceCheck = () => {
    const timestamp = Date.now();
    const lessonKeySuffix = getLocalDateKey();
    const uiEvents: PokemonUiEvent[] = [];
    const hatchedNames: string[] = [];
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let skippedCount = 0;
    let releaseEventToShow: PokemonReleaseEvent | null = null;

    const updatedStudents = students.map(student => {
      if (!currentClassStudents.some(classStudent => classStudent.id === student.id)) return student;

      const lessonKey = `${student.className}:${lessonKeySuffix}`;
      if (student.pokemonProgress?.lastAttendanceLessonKey === lessonKey) {
        skippedCount += 1;
        return student;
      }

      const status = attendanceStatuses[student.id] || 'present';
      const baseStudent = normalizeStudentPokemonData(student);
      const currentProgress = baseStudent.pokemonProgress!;
      const pointDelta = status === 'present' ? 5 : status === 'late' ? -5 : 0;
      const nextAttendanceStreak = status === 'absent' ? 0 : (currentProgress.attendanceStreak || 0) + 1;
      const nextProgress = {
        ...currentProgress,
        attendanceStreak: nextAttendanceStreak,
        bestAttendanceStreak: Math.max(currentProgress.bestAttendanceStreak || 0, nextAttendanceStreak),
        lastAttendanceLessonKey: lessonKey
      };
      const label = status === 'present' ? 'Có mặt' : status === 'late' ? 'Muộn' : 'Vắng';
      const historyItem: HistoryItem = {
        id: `${timestamp}${Math.random()}`,
        amount: pointDelta,
        reason: status === 'present'
          ? `🧭 Đi học Có mặt (${lessonKeySuffix}) (+5 Hào Quang, Pokémon +5 HP)`
          : status === 'late'
            ? `🧭 Đi học Muộn (${lessonKeySuffix}) (-5 Hào Quang, Pokémon -5 HP)`
            : `🧭 Đi học Vắng (${lessonKeySuffix})`,
        timestamp
      };

      if (status === 'present') presentCount += 1;
      if (status === 'late') lateCount += 1;
      if (status === 'absent') absentCount += 1;

      let resultStudent: Student = {
        ...baseStudent,
        points: baseStudent.points + pointDelta,
        pokemonProgress: nextProgress,
        isAbsent: status === 'absent',
        attendanceStatus: status,
        history: [historyItem, ...baseStudent.history].slice(0, 50)
      };

      if (pointDelta > 0) {
        const eggResult = advanceEggForStudent(resultStudent, pointDelta);
        resultStudent = eggResult.student;
        if (eggResult.hatchedPet) {
          hatchedNames.push(student.name);
        }
      }

      if (resultStudent.pet && pointDelta !== 0) {
        const hpUpdate = applyPetHpDeltaToStudent(
          resultStudent,
          pointDelta,
          `Đi học ${label}: ${pointDelta > 0 ? 'hồi' : 'mất'} ${Math.abs(pointDelta)} HP`
        );
        resultStudent = hpUpdate.student;
        if (hpUpdate.releaseEvent && !releaseEventToShow) releaseEventToShow = hpUpdate.releaseEvent;
        uiEvents.push({ type: 'hp', message: `${student.name}: Pokémon ${pointDelta > 0 ? '+' : ''}${pointDelta} HP` });
      }

      if (status !== 'absent') {
        uiEvents.push({ type: 'streak', message: `${student.name}: streak đi học ${nextAttendanceStreak}` });
      }

      return resultStudent;
    });

    setStudents(updatedStudents);
    if (releaseEventToShow) setPokemonReleaseEvent(releaseEventToShow);
    if (editingStudent) {
      const updatedEditingStudent = updatedStudents.find(student => student.id === editingStudent.id);
      if (updatedEditingStudent) setEditingStudent(updatedEditingStudent);
    }
    if (randomStudent) {
      const updatedRandomStudent = updatedStudents.find(student => student.id === randomStudent.id);
      if (updatedRandomStudent) setRandomStudent(updatedRandomStudent);
    }
    setShowAttendanceModal(false);
    setAttendanceStatuses({});

    if (hatchedNames.length > 0 && !releaseEventToShow) {
      setHatchSuccessMessage(`Tin vui chấn động triều đình! Trứng của ${hatchedNames.join(', ')} đã nở sau điểm chuyên cần. 🥚🐣`);
      setShowHatchModal(true);
    }

    showPokemonReaction(
      [
        { type: 'bond', message: `${presentCount} Có mặt · ${lateCount} Muộn · ${absentCount} Vắng${skippedCount ? ` · ${skippedCount} đã chốt` : ''}` },
        ...uiEvents.slice(0, 3)
      ],
      'Check đi học đã chốt'
    );
  };

  const handleRandom = (forceMode?: 'solo' | 'battle') => {
    setBattleResultSummary(null);
    const available = presentStudents;
    if (available.length === 0) return alert("Không có học sinh nào hiện diện.");
    
    // Pick mode: if forceMode provided use it, otherwise randomly pick solo or battle (50/50 if available.length >= 2)
    const mode = forceMode || (available.length >= 2 ? (Math.random() > 0.5 ? 'battle' : 'solo') : 'solo');
    setRandomMode(mode);

    if (mode === 'solo') {
      let currentQueue = uncalledMap[filterClass] || [];
      currentQueue = currentQueue.filter(id => available.some(s => s.id === id));

      if (currentQueue.length === 0) {
        currentQueue = available.map(s => s.id);
      }

      const randomIndex = Math.floor(Math.random() * currentQueue.length);
      const chosenId = currentQueue[randomIndex];
      const nextQueue = currentQueue.filter(id => id !== chosenId);

      setUncalledMap(prev => ({ ...prev, [filterClass]: nextQueue }));

      const chosenStudent = students.find(s => s.id === chosenId) || available[0];
      setRandomStudent(chosenStudent);
      setSelectedStudentIds([chosenStudent.id]);
    } else {
      // Battle Mode: pick 2 distinct random students
      const shuffled = [...available].sort(() => 0.5 - Math.random());
      const sA = shuffled[0];
      const sB = shuffled[1];
      setBattleStudentA(sA);
      setBattleStudentB(sB);
      setBattleScoreA(0);
      setBattleScoreB(0);
      setSelectedStudentIds([sA.id, sB.id]);
    }

    setShowRandomModal(true);
  };

  const getLuckyWheelValidRewards = (student: Student) => {
    const ownedSkillIds = student.pet?.skills || [];
    return luckyWheelRewards.filter(reward => {
      if (reward.type === 'hp') return !!student.pet;
      if (reward.type === 'skill') {
        return !!student.pet && petSkills.some(sk => !ownedSkillIds.includes(sk.id));
      }
      if (reward.type === 'ludo_rolls') return (reward.amount || 0) > 0;
      return true;
    });
  };

  const prepareLuckyWheelResult = (student: Student, reward: LuckyWheelReward): LuckyWheelResult => {
    if (reward.type === 'pokemon') {
      const randomPokemon = getRandomPokemon();
      const giftedPet = createPokemonPetFromDexId(randomPokemon.dexId);
      return {
        student,
        reward,
        pokemon: giftedPet,
        message: `${student.name} nhận được ${giftedPet.isShiny ? 'Shiny ' : ''}Pokémon ${getPokemonDisplayName(giftedPet)}!`
      };
    }

    if (reward.type === 'skill' && student.pet) {
      const ownedSkillIds = student.pet.skills || [];
      const availableSkills = petSkills.filter(sk => !ownedSkillIds.includes(sk.id));
      const giftedSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      return {
        student,
        reward,
        skill: giftedSkill,
        message: `${student.name} nhận thêm tuyệt chiêu ${giftedSkill.name} cho ${getPokemonDisplayName(student.pet)}!`
      };
    }

    if (reward.type === 'hp') {
      const hpDelta = reward.amount || 0;
      return {
        student,
        reward,
        hpDelta,
        message: hpDelta >= 0
          ? `Pokémon của ${student.name} hồi ${hpDelta} HP!`
          : `Pokémon của ${student.name} bị trừ ${Math.abs(hpDelta)} HP!`
      };
    }

    if (reward.type === 'ludo_rolls') {
      const rolls = Math.min(5, Math.max(1, reward.amount || 1));
      return {
        student,
        reward: { ...reward, amount: rolls },
        message: `${student.name} được thêm ${rolls} lượt lắc xúc xắc Cá Ngựa!`
      };
    }

    const pointAmount = reward.amount || 0;
    return {
      student,
      reward,
      message: `${student.name} ${pointAmount >= 0 ? 'được cộng' : 'bị trừ'} ${Math.abs(pointAmount)} điểm Hào quang!`
    };
  };

  const updateActivePetInCollection = (student: Student, nextPet: PokemonPet) => {
    return updatePetInCollection(student, nextPet);
  };

  const applyLuckyWheelReward = async (result: LuckyWheelResult) => {
    const reward = result.reward;

    if (reward.type === 'points') {
      await handleUpdatePoints([result.student.id], reward.amount || 0, `🎡 Vòng quay may mắn: ${reward.label}`, 'lucky-wheel');
      setLuckyWheelResult(result);
      setIsLuckyWheelSpinning(false);
      return;
    }

    const isPositiveReward = reward.type !== 'hp' || (result.hpDelta || 0) >= 0;
    let releaseEventToShow: PokemonReleaseEvent | null = null;

    setStudents(prev => {
      let updatedTarget: Student | null = null;

      const nextStudents = prev.map(s => {
        if (s.id !== result.student.id) return s;

        const historyItem: HistoryItem = {
          id: Date.now().toString() + Math.random(),
          amount: 0,
          reason: `🎡 Vòng quay may mắn: ${result.message}`,
          timestamp: Date.now()
        };

        if (reward.type === 'pokemon' && result.pokemon) {
          const currentPets = s.pets ? [...s.pets] : [];
          if (s.pet && !currentPets.some(p => isSamePokemon(p, s.pet))) {
            currentPets.push(s.pet);
          }
          const updatedS: Student = {
            ...s,
            pet: result.pokemon,
            pets: [result.pokemon, ...currentPets],
            history: [historyItem, ...s.history].slice(0, 50)
          };
          updatedTarget = updatedS;
          return updatedS;
        }

        if (reward.type === 'skill' && result.skill && s.pet) {
          const currentUses = s.pet.skillUses ? { ...s.pet.skillUses } : {};
          currentUses[result.skill.id] = 0;
          const updatedPet: PokemonPet = {
            ...s.pet,
            skills: [...(s.pet.skills || []), result.skill.id],
            skillUses: currentUses
          };
          const updatedS: Student = {
            ...s,
            pet: updatedPet,
            pets: updateActivePetInCollection(s, updatedPet),
            history: [historyItem, ...s.history].slice(0, 50)
          };
          updatedTarget = updatedS;
          return updatedS;
        }

        if (reward.type === 'hp' && s.pet) {
          const hpUpdate = applyPetHpDeltaToStudent(s, result.hpDelta || 0, `Vòng quay may mắn: ${reward.label}`);
          const updatedS: Student = {
            ...hpUpdate.student,
            history: [historyItem, ...hpUpdate.student.history].slice(0, 50)
          };
          if (hpUpdate.releaseEvent && !releaseEventToShow) releaseEventToShow = hpUpdate.releaseEvent;
          updatedTarget = updatedS;
          return updatedS;
        }

        if (reward.type === 'ludo_rolls') {
          const rolls = Math.min(5, Math.max(1, reward.amount || 1));
          setLudoBonusRolls(prevRolls => ({
            ...prevRolls,
            [s.id]: (prevRolls[s.id] || 0) + rolls
          }));
          setLudoClassName(s.className);
          setLudoActiveStudent(s);
          const updatedS: Student = {
            ...s,
            history: [historyItem, ...s.history].slice(0, 50)
          };
          updatedTarget = updatedS;
          return updatedS;
        }

        return s;
      });

      if (updatedTarget && editingStudent?.id === updatedTarget.id) {
        setEditingStudent(updatedTarget);
      }

      return nextStudents;
    });

    new Audio(isPositiveReward ? posSoundUrl : negSoundUrl).play().catch(() => {});
    if (releaseEventToShow) setPokemonReleaseEvent(releaseEventToShow);
    setSelectedStudentIds([]);
    setIsMultiSelectMode(false);
    setLuckyWheelResult(result);
    setIsLuckyWheelSpinning(false);
  };

  const handleOpenLuckyWheel = () => {
    if (isLuckyWheelSpinning) return;

    const candidates = students.filter(s => selectedStudentIds.includes(s.id) && !s.isAbsent);
    if (candidates.length === 0) {
      alert("Vui lòng chọn ít nhất 1 học sinh đang hiện diện để quay Vòng quay may mắn.");
      return;
    }

    setLuckyWheelCandidateIds(candidates.map(s => s.id));
    const shuffledRewards = shuffleLuckyWheelRewards(luckyWheelRewards.length > 0 ? luckyWheelRewards : DEFAULT_LUCKY_WHEEL_REWARDS);
    setLuckyWheelMode('normal');
    setLuckyWheelDisplayRewards(shuffledRewards);
    setLuckyWheelPendingResult(null);
    setLuckyWheelResult(null);
    setShowLuckyWheelModal(true);
  };

  const startLuckyWheelSpin = () => {
    if (isLuckyWheelSpinning) return;

    const candidates = students.filter(s => luckyWheelCandidateIds.includes(s.id) && !s.isAbsent);
    if (candidates.length === 0) {
      alert("Không còn học sinh hợp lệ trong lượt quay này.");
      return;
    }

    const chosenStudent = candidates[getRandomIndex(candidates.length)];
    const validRewards = getLuckyWheelValidRewards(chosenStudent);
    if (validRewards.length === 0) {
      alert("Không có phần thưởng/hình phạt hợp lệ cho học sinh này. Vui lòng kiểm tra Customize Vòng quay may mắn.");
      return;
    }

    const displayRewards = luckyWheelDisplayRewards.length > 0 ? luckyWheelDisplayRewards : shuffleLuckyWheelRewards(luckyWheelRewards);
    const chosenReward = chooseLuckyWheelReward(validRewards);
    const preparedResult = prepareLuckyWheelResult(chosenStudent, chosenReward);
    const rewardIndex = Math.max(0, displayRewards.findIndex(reward => reward.id === chosenReward.id));
    const segmentSize = 360 / Math.max(1, displayRewards.length);
    const targetCenter = rewardIndex * segmentSize + segmentSize / 2;
    const startRotation = luckyWheelRotation % 360;
    const finalRotation = luckyWheelRotation + 360 * 12 + (360 - targetCenter);

    setLuckyWheelPendingResult(preparedResult);
    setLuckyWheelResult(null);
    setIsLuckyWheelSpinning(true);
    setLuckyWheelRotation(startRotation);

    if (luckyWheelSpinAudioRef.current) {
      luckyWheelSpinAudioRef.current.pause();
      luckyWheelSpinAudioRef.current = null;
    }
    const spinSoundUrl = wheelSpinSoundUrl.trim() || DEFAULT_WHEEL_SPIN_SOUND_URL;
    const spinAudio = new Audio(spinSoundUrl);
    spinAudio.loop = true;
    spinAudio.volume = 0.55;
    luckyWheelSpinAudioRef.current = spinAudio;
    spinAudio.play().catch(() => {});

    window.requestAnimationFrame(() => {
      if (luckyWheelRef.current) {
        luckyWheelRef.current.getAnimations().forEach(animation => animation.cancel());
        luckyWheelRef.current.animate([
          { transform: `rotate(${startRotation}deg)`, offset: 0 },
          { transform: `rotate(${startRotation + 180}deg)`, offset: 0.15 },
          { transform: `rotate(${startRotation + 360 * 8}deg)`, offset: 0.7 },
          { transform: `rotate(${finalRotation}deg)`, offset: 1 }
        ], {
          duration: 10000,
          easing: 'linear',
          fill: 'forwards'
        });
      }
    });

    window.setTimeout(() => {
      if (luckyWheelSpinAudioRef.current) {
        luckyWheelSpinAudioRef.current.pause();
        luckyWheelSpinAudioRef.current.currentTime = 0;
        luckyWheelSpinAudioRef.current = null;
      }
      if (wheelFinishSoundUrl.trim()) {
        new Audio(wheelFinishSoundUrl).play().catch(() => {});
      }
      setLuckyWheelRotation(finalRotation);
      applyLuckyWheelReward(preparedResult);
    }, 10000);
  };

  const handleResolveBattle = () => {
    if (!battleStudentA || !battleStudentB) return;

    const scoreA = battleScoreA;
    const scoreB = battleScoreB;
    const diff = Math.abs(scoreA - scoreB);

    let updatedStudents = [...students];
    let resultMsg = "";
    let winner: Student | null = null;
    let releaseEventToShow: PokemonReleaseEvent | null = null;
    let battleProgressMessages: string[] = [];
    let battleUiEvents: PokemonUiEvent[] = [];

    const applyBattleOutcome = (
      student: Student,
      pointGain: number,
      outcome: 'win' | 'loss' | 'draw',
      hpDelta: number | null,
      historyReason: string,
      hpReason?: string
    ): Student => {
      const newPts = student.points + pointGain;
      let baseStudent = normalizeStudentPokemonData(student);

      if (hpDelta !== null) {
        const hpUpdate = applyPetHpDeltaToStudent(baseStudent, hpDelta, hpReason || historyReason);
        baseStudent = hpUpdate.student;
        if (hpUpdate.releaseEvent && !releaseEventToShow) releaseEventToShow = hpUpdate.releaseEvent;
      }

      const progressionResult = applyGameEventToStudent(
        { ...baseStudent, points: newPts },
        {
          type: 'BATTLE_RESULT',
          source: 'battle',
          studentId: student.id,
          battleOutcome: outcome,
          battleScore: pointGain,
          timestamp: Date.now()
        }
      );
      battleUiEvents = [...battleUiEvents, ...progressionResult.uiEvents];

      battleProgressMessages = [
        ...battleProgressMessages,
        ...progressionResult.uiEvents
          .filter(event => ['streak', 'passive', 'charge-ready', 'level-up', 'evolution', 'random-drop', 'mastery'].includes(event.type))
          .map(event => `${student.name}: ${event.message}`)
      ];

      return {
        ...progressionResult.student,
        points: newPts,
        history: [
          { id: Date.now().toString() + Math.random(), amount: pointGain, reason: historyReason, timestamp: Date.now() },
          ...progressionResult.student.history
        ].slice(0, 50)
      };
    };

    if (scoreA > scoreB) {
      winner = battleStudentA;
      // A wins: A gets +scoreA points, Pokemon gets +diff HP. B gets +scoreB points, Pokemon loses diff HP (-diff HP).
      updatedStudents = updatedStudents.map(s => {
        if (s.id === battleStudentA.id) {
          return applyBattleOutcome(s, scoreA, 'win', diff, `🏆 Thắng Battle: +${scoreA}đ (Pokemon +${diff} HP)`, `Battle thắng: hồi ${diff} HP`);
        }
        if (s.id === battleStudentB.id) {
          return applyBattleOutcome(s, scoreB, 'loss', -diff, `⚔️ Thua Battle: +${scoreB}đ (Pokemon -${diff} HP)`, `Battle thua: mất ${diff} HP`);
        }
        return s;
      });

      resultMsg = `🏆 ${battleStudentA.name} CHIẾN THẮNG BATTLE!\n\n• ${battleStudentA.name}: +${scoreA} điểm Hào quang (Pokemon hồi +${diff} HP)\n• ${battleStudentB.name}: +${scoreB} điểm Hào quang (Pokemon tổn hại -${diff} HP).`;
    } else if (scoreB > scoreA) {
      winner = battleStudentB;
      // B wins: B gets +scoreB points, Pokemon gets +diff HP. A gets +scoreA points, Pokemon loses diff HP (-diff HP).
      updatedStudents = updatedStudents.map(s => {
        if (s.id === battleStudentB.id) {
          return applyBattleOutcome(s, scoreB, 'win', diff, `🏆 Thắng Battle: +${scoreB}đ (Pokemon +${diff} HP)`, `Battle thắng: hồi ${diff} HP`);
        }
        if (s.id === battleStudentA.id) {
          return applyBattleOutcome(s, scoreA, 'loss', -diff, `⚔️ Thua Battle: +${scoreA}đ (Pokemon -${diff} HP)`, `Battle thua: mất ${diff} HP`);
        }
        return s;
      });

      resultMsg = `🏆 ${battleStudentB.name} CHIẾN THẮNG BATTLE!\n\n• ${battleStudentB.name}: +${scoreB} điểm Hào quang (Pokemon hồi +${diff} HP)\n• ${battleStudentA.name}: +${scoreA} điểm Hào quang (Pokemon tổn hại -${diff} HP).`;
    } else {
      // Tie
      updatedStudents = updatedStudents.map(s => {
        if (s.id === battleStudentA.id) {
          return applyBattleOutcome(s, scoreA, 'draw', null, `⚔️ Hòa Battle: +${scoreA}đ`);
        }
        if (s.id === battleStudentB.id) {
          return applyBattleOutcome(s, scoreB, 'draw', null, `⚔️ Hòa Battle: +${scoreB}đ`);
        }
        return s;
      });

      resultMsg = `🤝 TRẬN BATTLE HÒA NHAU!\n\nCả 2 học sĩ đều được cộng điểm và bảo toàn HP cho Pokemon.`;
    }

    if (battleProgressMessages.length > 0) {
      resultMsg += `\n\nTiến triển Pokémon:\n${battleProgressMessages.slice(0, 5).map(message => `• ${message}`).join('\n')}`;
    }

    setStudents(updatedStudents);
    if (releaseEventToShow) setPokemonReleaseEvent(releaseEventToShow);
    if (!releaseEventToShow && battleUiEvents.length > 0) {
      showPokemonReaction(battleUiEvents, 'Kết quả Battle Pokémon');
    }
    new Audio(posSoundUrl).play().catch(() => {});

    const updatedA = updatedStudents.find(s => s.id === battleStudentA.id) || battleStudentA;
    const updatedB = updatedStudents.find(s => s.id === battleStudentB.id) || battleStudentB;
    let ludoTurns: BattleLudoTurn[] = [];
    if (scoreA > scoreB) {
      ludoTurns = [
        { studentId: updatedA.id, role: 'winner' },
        ...(scoreB >= 0 ? [{ studentId: updatedB.id, role: 'loser' as const }] : [])
      ];
    } else if (scoreB > scoreA) {
      ludoTurns = [
        { studentId: updatedB.id, role: 'winner' },
        ...(scoreA >= 0 ? [{ studentId: updatedA.id, role: 'loser' as const }] : [])
      ];
    } else {
      ludoTurns = [
        ...(scoreA >= 0 ? [{ studentId: updatedA.id, role: 'draw' as const }] : []),
        ...(scoreB >= 0 ? [{ studentId: updatedB.id, role: 'draw' as const }] : [])
      ];
    }
    setBattleStudentA(updatedA);
    setBattleStudentB(updatedB);

    setBattleResultSummary({
      studentA: updatedA,
      studentB: updatedB,
      winner: winner ? (updatedStudents.find(s => s.id === winner!.id) || winner) : null,
      scoreA,
      scoreB,
      diff,
      resultMsg,
      ludoTurns
    });
  };

  // Student Custom Avatar Upload Handlers
  const handleStudentCustomAvatarUpload = (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const updated = students.map(s => {
        if (s.id === studentId) {
          const updatedS = { ...s, customAvatar: base64 };
          if (editingStudent?.id === studentId) setEditingStudent(updatedS);
          return updatedS;
        }
        return s;
      });
      setStudents(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveStudentCustomAvatar = (studentId: string) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        const updatedS = { ...s, customAvatar: undefined };
        if (editingStudent?.id === studentId) setEditingStudent(updatedS);
        return updatedS;
      }
      return s;
    });
    setStudents(updated);
  };

  const getFusionCandidates = (student: Student): PokemonPet[] => {
    const candidates = [...(student.pets || [])];
    if (student.pet && !candidates.some(p => isSamePokemon(p, student.pet))) {
      candidates.unshift(student.pet);
    }
    return candidates;
  };

  // Pokemon Fusion Handler
  const handleFuseSelectedPokemons = (studentId: string) => {
    const s = students.find(x => x.id === studentId);
    const fusionCandidates = s ? getFusionCandidates(s) : [];
    if (!s || fusionCandidates.length < 2) {
      alert("Cần tối thiểu 2 Pokémon để thực hiện hợp nhất!");
      return;
    }

    if (selectedFusionPetDexIds.length < 2) {
      alert("Vui lòng chọn 2 Pokémon muốn hợp nhất!");
      return;
    }

    const petsToFuse = selectedFusionPetDexIds
      .map(index => fusionCandidates[index])
      .filter(Boolean);

    if (petsToFuse.length !== 2) {
      alert("Vui lòng chọn đúng 2 Pokémon hợp lệ để hợp nhất!");
      return;
    }

    const selectedSet = new Set(selectedFusionPetDexIds);
    const remainingPets = fusionCandidates.filter((_, index) => !selectedSet.has(index));

    const combinedSkillUses: Record<string, number> = {};
    petsToFuse.forEach(pet => {
      (pet.skills || []).forEach(skillId => {
        const uses = pet.skillUses?.[skillId] || 0;
        if (uses >= 2) return;
        if (combinedSkillUses[skillId] === undefined || uses < combinedSkillUses[skillId]) {
          combinedSkillUses[skillId] = uses;
        }
      });
    });
    const combinedSkills = Object.keys(combinedSkillUses);
    const randomNewPokemon = getRandomPokemon();
    const fusedLevel = Math.min(30, Math.max(1, Math.floor(petsToFuse.reduce((sum, pet) => sum + (pet.level || 1), 0) / petsToFuse.length)));
    const fusedIsShiny = petsToFuse.every(pet => pet.isShiny);

    const fusedPet: PokemonPet = {
      ...createPokemonPetFromDexId(randomNewPokemon.dexId, `Hợp Thể ${randomNewPokemon.name}`, { isShiny: fusedIsShiny }),
      types: Array.from(new Set(petsToFuse.flatMap(p => p.types))),
      level: fusedLevel,
      xp: 0,
      totalXp: totalXpForLevel(fusedLevel),
      bond: 0,
      charge: 0,
      masteryXp: 0,
      masteryStars: 0,
      skills: combinedSkills,
      skillUses: combinedSkillUses
    };

    const updatedPets = [fusedPet, ...remainingPets];

    const updatedS: Student = {
      ...s,
      pet: fusedPet,
      pets: updatedPets
    };

    setStudents(prev => prev.map(x => x.id === studentId ? updatedS : x));
    setEditingStudent(updatedS);
    setSelectedFusionPetDexIds([]);
    setProfileTab('pet');
    new Audio(posSoundUrl).play().catch(() => {});
    alert(`🔮 HỢP NHẤT THÀNH CÔNG!\n\nĐã dung hợp các Pokémon để tái sinh linh thú [${getPokemonDisplayName(fusedPet)}] tích tụ ${combinedSkills.length} tuyệt chiêu thần bí!`);
  };

  const playDiceSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'sine' : 'square';
        osc.frequency.setValueAtTime(220 + Math.random() * 400, now + i * 0.04);
        gain.gain.setValueAtTime(0.2, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.04);
      }
    } catch (err) {
      console.error("Dice audio failed:", err);
    }
  };

  const handleSaveCustomTile = () => {
    if (tileFormIndex < 0 || tileFormIndex > 49) {
      alert("Số ô phải từ 0 đến 49.");
      return;
    }
    const newSpec: LudoTileSpec = {
      tileIndex: tileFormIndex,
      title: tileFormTitle || `Ô Đặc Biệt ${tileFormIndex}`,
      desc: tileFormDesc || 'Ô đặc biệt trên bàn cờ Cá Ngựa.',
      icon: tileFormIcon || '🌟',
      type: tileFormType,
      value: tileFormValue
    };
    setCustomLudoTiles(prev => ({ ...prev, [tileFormIndex]: newSpec }));
    resetTileForm();
    alert(`Đã lưu thiết lập ô đặc biệt số ${tileFormIndex}!`);
  };

  const editCustomTile = (tile: LudoTileSpec) => {
    setTileFormIndex(tile.tileIndex);
    setTileFormTitle(tile.title);
    setTileFormDesc(tile.desc);
    setTileFormIcon(tile.icon);
    setTileFormType(tile.type);
    setTileFormValue(tile.value || 3);
    setEditingTileIndex(tile.tileIndex);
  };

  const deleteCustomTile = (index: number) => {
    if (confirm(`Xóa ô đặc biệt số ${index}?`)) {
      setCustomLudoTiles(prev => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
      if (editingTileIndex === index) resetTileForm();
    }
  };

  const resetTileForm = () => {
    setTileFormIndex(0);
    setTileFormTitle('');
    setTileFormDesc('');
    setTileFormIcon('🚀');
    setTileFormType('portal');
    setTileFormValue(3);
    setEditingTileIndex(null);
  };

  const handleLudoRollDice = (student: Student, options?: { isBonusRoll?: boolean }) => {
    if (ludoRolling) return;
    const isBonusRoll = !!options?.isBonusRoll;
    let releaseEventToShow: PokemonReleaseEvent | null = null;
    const applyLudoAuraReward = (target: Student, amount: number, reason: string): Student => {
      const historyItem: HistoryItem = {
        id: Date.now().toString() + Math.random(),
        amount,
        reason,
        timestamp: Date.now()
      };
      const pointUpdatedStudent: Student = {
        ...target,
        points: target.points + amount,
        history: [historyItem, ...target.history].slice(0, 50)
      };
      const hpUpdate = applyPetHpDeltaToStudent(
        pointUpdatedStudent,
        amount,
        `${reason}: ${amount >= 0 ? 'hồi' : 'mất'} ${Math.abs(amount)} HP`
      );
      if (hpUpdate.releaseEvent && !releaseEventToShow) releaseEventToShow = hpUpdate.releaseEvent;
      return hpUpdate.student;
    };

    setLudoRolling(true);
    setLudoDice(null);
    playDiceSound();

    if (isBonusRoll) {
      setLudoBonusRolls(prev => ({
        ...prev,
        [student.id]: Math.max(0, (prev[student.id] || 0) - 1)
      }));
    }

    // 1. Award +1 point for answering correctly, except bonus rolls from Lucky Wheel.
    let updatedStudents = students.map(s => {
      if (s.id !== student.id) return s;
      if (isBonusRoll) {
        return {
          ...s,
          history: [{ id: Date.now().toString() + Math.random(), amount: 0, reason: '🎁 Lượt lắc Cá Ngựa bonus từ Vòng quay may mắn', timestamp: Date.now() }, ...s.history]
        };
      }
      return applyLudoAuraReward(s, 1, '🎲 Trả lời đúng câu hỏi Cá Ngựa (+1đ)');
    });

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setLudoDice(roll);
      setLudoRolling(false);
      const advanceBattleQueue = (nextStudents: Student[]) => {
        setBattleLudoQueue(prev => {
          if (prev.length === 0) return prev;
          const nextQueue = prev.filter(turn => turn.studentId !== student.id);
          const nextTurn = nextQueue[0];
          const nextStudent = nextTurn ? nextStudents.find(s => s.id === nextTurn.studentId) || null : null;
          setLudoActiveStudent(nextStudent);
          return nextQueue;
        });
      };

      const isStuck = !!ludoMonsterStuck[student.id];
      if (isStuck) {
        if (roll !== 6) {
          setLudoLogs(prev => [`👹 ${student.name} tung được ${roll} điểm - Chưa đủ 6 để diệt Quái vật! Vẫn bị kẹt ở ô hiện tại.`, ...prev.slice(0, 30)]);
          setLudoEventPopup({
            title: '👹 CHƯA THOÁT KHỎI QUÁI VẬT',
            message: `${student.name} tung được ${roll} điểm - Cần lắc đúng 6 điểm để tiêu diệt Quái vật! Vẫn bị kẹt ở ô hiện tại.`,
            actor: student,
            icon: '👹',
            type: 'monster'
          });
          setStudents(updatedStudents);
          if (releaseEventToShow) setPokemonReleaseEvent(releaseEventToShow);
          advanceBattleQueue(updatedStudents);
          return;
        } else {
          setLudoMonsterStuck(prev => ({ ...prev, [student.id]: false }));
          updatedStudents = updatedStudents.map(s => s.id === student.id ? { ...s, ludoMonsterStuck: false } : s);
          setLudoLogs(prev => [`⚔️ ${student.name} tung được 6 điểm! Đã tiêu diệt Quái vật và được tiếp tục tiến bước!`, ...prev.slice(0, 30)]);
        }
      }

      const oldSteps = ludoSteps[student.id] || 0;
      let newSteps = oldSteps + roll;
      const oldLap = Math.floor(oldSteps / 50);
      const newLap = Math.floor(newSteps / 50);
      let newPos = newSteps % 50;

      const logs: string[] = [`🎲 ${student.name} tung được ${roll} điểm, tiến đến ô số ${newPos}!`];
      let popupEvent: any = null;
      let reachedFinishReward = newPos === 49;

      // Lap completion check (+20 points)
      if (newLap > oldLap) {
        reachedFinishReward = true;
        updatedStudents = updatedStudents.map(s => {
          if (s.id === student.id) {
            return applyLudoAuraReward(s, 20, '🎉 Hoàn thành 1 vòng bàn cờ Cá Ngựa (+20đ)');
          }
          return s;
        });
        logs.unshift(`🎉 ${student.name} đã đi trọn 1 vòng bàn cờ Cá Ngựa (50 ô)! Thưởng ngay +20 điểm Hào quang!`);
        popupEvent = {
          title: '👑 HOÀN THÀNH 1 VÒNG BÀN CỜ!',
          message: `${student.name} đã cán đích đi trọn 1 vòng bàn cờ Cá Ngựa (50 ô)! Thưởng ngay +20 điểm Hào quang!`,
          actor: student,
          icon: '👑',
          type: 'finish'
        };
      }

      // Collision / Kicking check
      let kickedStudent: Student | null = null;
      students
        .filter(s => s.className === student.className && !s.isAbsent)
        .forEach(other => {
        if (other.id !== student.id && (ludoPositions[other.id] || 0) === newPos && newPos !== 0) {
          kickedStudent = other;
        }
      });

      if (kickedStudent) {
        const target = kickedStudent as Student;
        setLudoPositions(prev => ({ ...prev, [target.id]: 0 }));
        setLudoSteps(prev => ({ ...prev, [target.id]: 0 }));
        updatedStudents = updatedStudents.map(s => {
          if (s.id === target.id) {
            return { ...s, ludoTile: 0, ludoSteps: 0 };
          }
          return s;
        });
        logs.unshift(`⚔️ ${student.name} dẫm lên ô ${newPos} và ĐÁ ${target.name} về lại Vạch Xuất Phát (ô 0)!`);
        popupEvent = {
          title: '💥 CÚ ĐÁ HOÀNG GIA! 💥',
          message: `${student.name} vừa dẫm lên ô ${newPos} và ĐÁ ${target.name} văng về lại Vạch Xuất Phát (ô 0)!`,
          actor: student,
          target: target,
          icon: '💥',
          type: 'kick'
        };
      }

      // Special tile check (if no kick happened)
      const tileSpec = customLudoTiles[newPos] || DEFAULT_LUDO_TILES[newPos];
      if (tileSpec) {
        if (tileSpec.type === 'monster') {
          setLudoMonsterStuck(prev => ({ ...prev, [student.id]: true }));
          logs.unshift(`👹 ${student.name} sa vào ô ${tileSpec.title}! Lượt sau cần lắc được 6 mới đi tiếp.`);
          if (!popupEvent) {
            popupEvent = {
              title: tileSpec.title,
              message: `${student.name} sa vào ô ${tileSpec.title}: ${tileSpec.desc}`,
              actor: student,
              icon: tileSpec.icon,
              type: 'monster'
            };
          }
        } else if (tileSpec.type === 'curse') {
          const val = tileSpec.value || -5;
          const curSteps = Math.max(0, newSteps + val);
          const curPos = curSteps % 50;
          newSteps = curSteps;
          newPos = curPos;
          logs.unshift(`📜 ${student.name} dẫm phải ${tileSpec.title}! ${tileSpec.desc}`);
          if (!popupEvent) {
            popupEvent = {
              title: tileSpec.title,
              message: `${student.name} dẫm phải ô ${tileSpec.title}: ${tileSpec.desc}`,
              actor: student,
              icon: tileSpec.icon,
              type: 'curse'
            };
          }
        } else if (tileSpec.type === 'portal') {
          const val = tileSpec.value || 3;
          const fwdSteps = newSteps + val;
          const fwdPos = fwdSteps % 50;
          newSteps = fwdSteps;
          newPos = fwdPos;
          logs.unshift(`🌀 ${student.name} dẫm phải ${tileSpec.title}! ${tileSpec.desc}`);
          if (!popupEvent) {
            popupEvent = {
              title: tileSpec.title,
              message: `${student.name} dẫm phải ô ${tileSpec.title}: ${tileSpec.desc}`,
              actor: student,
              icon: tileSpec.icon,
              type: 'portal'
            };
          }
        } else if (tileSpec.type === 'restart') {
          newSteps = 0;
          newPos = 0;
          logs.unshift(`🌀 ${student.name} dẫm phải ${tileSpec.title}! Bị lùi về vạch xuất phát.`);
          if (!popupEvent) {
            popupEvent = {
              title: tileSpec.title,
              message: `${student.name} dẫm phải ô ${tileSpec.title}! ${tileSpec.desc}`,
              actor: student,
              icon: tileSpec.icon,
              type: 'curse'
            };
          }
        } else if (tileSpec.type === 'treasure') {
          const val = tileSpec.value || 5;
          updatedStudents = updatedStudents.map(s => {
            if (s.id === student.id) {
              return applyLudoAuraReward(s, val, `💎 Nhặt được ${tileSpec.title} (${val >= 0 ? '+' : ''}${val}đ)`);
            }
            return s;
          });
          logs.unshift(`💎 ${student.name} dẫm phải ${tileSpec.title}! ${tileSpec.desc}`);
          if (!popupEvent) {
            popupEvent = {
              title: tileSpec.title,
              message: `${student.name} dẫm phải ô ${tileSpec.title}: ${tileSpec.desc}`,
              actor: student,
              icon: tileSpec.icon,
              type: 'treasure'
            };
          }
        }
      }
      if (newPos === 49) {
        reachedFinishReward = true;
        logs.unshift(`🎡 ${student.name} đã đến ô cuối cùng! Mở Vòng quay may mắn với tỉ lệ 60% quà tốt / 40% quà thử thách.`);
      }

      setLudoSteps(prev => ({ ...prev, [student.id]: newSteps }));
      setLudoPositions(prev => ({ ...prev, [student.id]: newPos }));

      // Apply student ludo status update
      updatedStudents = updatedStudents.map(s => {
        if (s.id === student.id) {
          return {
            ...s,
            ludoTile: newPos,
            ludoSteps: newSteps,
            ludoMonsterStuck: !!ludoMonsterStuck[student.id]
          };
        }
        return s;
      });

      setStudents(updatedStudents);
      if (releaseEventToShow) setPokemonReleaseEvent(releaseEventToShow);
      setLudoLogs(prev => [...logs, ...prev].slice(0, 40));
      advanceBattleQueue(updatedStudents);

      if (popupEvent) {
        setLudoEventPopup(popupEvent);
      }
      if (reachedFinishReward) {
        const latestStudent = updatedStudents.find(s => s.id === student.id) || student;
        window.setTimeout(() => openLuckyWheelForLudoFinish(latestStudent), 900);
      }
    }, 600);
  };

  const handleMakeGroups = () => {
    const shuffled = [...presentStudents].sort(() => 0.5 - Math.random());
    const result: Student[][] = [];
    for (let i = 0; i < shuffled.length; i += groupSize) {
      result.push(shuffled.slice(i, i + groupSize));
    }
    setGeneratedGroups(result);
    setShowGroupModal(true);
  };

  const startTimer = (seconds: number) => {
    setTimerTime(seconds);
    setTimerRunning(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimerTime(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          new Audio(timerSoundUrl).play().catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAvatarUpload = (gender: Gender, rankId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const updater = (prev: RankInfo[]) => prev.map(r => r.id === rankId ? { ...r, avatar: base64 } : r);
      if (gender === Gender.MALE) setRanksMale(updater); else setRanksFemale(updater);
    };
    reader.readAsDataURL(file);
  };

  // Pyramid Building Logic
  const pyramidTiers = useMemo(() => {
    if (students.length === 0) return [];
    
    // Sort all unique rank levels in descending order
    const levels = Array.from(new Set([...ranksMale, ...ranksFemale].map(r => r.level))).sort((a, b) => b - a);
    
    // Special Tier 1: Absolute Top Male and Female
    const topMale = students.filter(s => s.gender === Gender.MALE).sort((a,b) => b.points - a.points)[0];
    const topFemale = students.filter(s => s.gender === Gender.FEMALE).sort((a,b) => b.points - a.points)[0];
    
    const tiers = [];
    
    // Tier 1: King and Queen
    tiers.push({
      level: 999, // Special ID
      title: "Hoàng Đế & Hoàng Hậu",
      students: [topMale, topFemale].filter(Boolean) as Student[]
    });

    // Other Tiers based on remaining ranks
    levels.forEach(lvl => {
      const lvlStudents = students.filter(s => {
        const rank = getRank(s.points, s.gender);
        // Exclude the absolute tops from their rank tiers to avoid duplication at the top
        const isAbsoluteTop = (s.id === topMale?.id || s.id === topFemale?.id);
        return rank.level === lvl && !isAbsoluteTop;
      });

      if (lvlStudents.length > 0) {
        // Find titles for this level to display
        const mTitle = ranksMale.find(r => r.level === lvl)?.title;
        const fTitle = ranksFemale.find(r => r.level === lvl)?.title;
        tiers.push({
          level: lvl,
          title: `${mTitle} / ${fTitle}`,
          students: lvlStudents.sort((a,b) => b.points - a.points)
        });
      }
    });

    return tiers;
  }, [students, ranksMale, ranksFemale]);

  // Skill Sidebar Logic
  const getSidebarData = () => {
    if (selectedStudentIds.length !== 1) return null;
    const student = students.find(s => s.id === selectedStudentIds[0]);
    if (!student) return null;

    const rank = getRank(student.points, student.gender);
    const nextThreshold = (Math.floor(student.points / 50) + 1) * 50;
    const pointsToNext = nextThreshold - student.points;
    const demoteThreshold = Math.floor(student.points / 50) * 50 - 1;
    const pointsToDemote = student.points - demoteThreshold;

    return { student, rank, pointsToNext, pointsToDemote };
  };

  const sidebarData = getSidebarData();

  const updateSkill = (id: string, field: keyof Skill, value: any) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const updatePetSkill = (id: string, field: keyof PetSkill, value: any) => {
    setPetSkills(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addPetSkill = () => {
    const newSkill: PetSkill = {
      id: `sk_custom_${Date.now()}`,
      name: 'Tuyệt chiêu mới',
      icon: '✨',
      cost: 20,
      description: 'Mô tả quyền năng Pokémon mới.'
    };
    setPetSkills(prev => [...prev, newSkill]);
  };

  const updateLuckyWheelReward = (id: string, field: keyof LuckyWheelReward, value: any) => {
    setLuckyWheelRewards(prev => prev.map(reward => reward.id === id ? { ...reward, [field]: value } : reward));
  };

  const addLuckyWheelReward = (type: LuckyWheelRewardType = 'points') => {
    const amountByType = type === 'pokemon' || type === 'skill' ? undefined : type === 'ludo_rolls' ? 1 : 1;
    const nextReward: LuckyWheelReward = {
      id: `wheel_custom_${Date.now()}`,
      label: type === 'ludo_rolls' ? 'Lắc Cá Ngựa 1 lần' : 'Phần thưởng mới',
      icon: type === 'ludo_rolls' ? '🎲' : '✨',
      type,
      amount: amountByType,
      color: '#d946ef'
    };
    setLuckyWheelRewards(prev => [...prev, nextReward]);
  };

  const toggleSettingsSection = (section: string) => {
    setSettingsCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#5d4037] flex flex-col items-center justify-center text-white font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37] mb-4"></div>
        <p className="font-royal uppercase tracking-widest text-xs text-[#D4AF37]">Đang kết nối triều đình...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDF3E7] flex items-center justify-center p-4 sm:p-8 font-sans bg-[radial-gradient(#e0d0b0_1px,transparent_1px)] [background-size:16px_16px]">
        {/* Decorative Golden Corner Frames */}
        <div className="fixed top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-red-800 opacity-60 rounded-tl-xl pointer-events-none" />
        <div className="fixed top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-red-800 opacity-60 rounded-tr-xl pointer-events-none" />
        <div className="fixed bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-red-800 opacity-60 rounded-bl-xl pointer-events-none" />
        <div className="fixed bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-red-800 opacity-60 rounded-br-xl pointer-events-none" />

        <div className="w-full max-w-lg bg-white rounded-[40px] border-8 border-red-800 shadow-2xl p-8 sm:p-12 text-center relative overflow-hidden flex flex-col items-center space-y-6">
          {/* Imperial Crest Icon */}
          <div className="w-24 h-24 bg-red-800 rounded-full flex items-center justify-center text-5xl shadow-lg border-4 border-amber-400 select-none animate-bounce duration-1000">
            🏮
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-royal text-red-800 font-extrabold uppercase tracking-tight">Cung Đình Học Đường</h1>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">Vietnamese Imperial Academy</p>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent my-6" />

          <p className="text-sm font-sans text-stone-600 leading-relaxed max-w-sm">
            Chào mừng quý Quan trường ghé thăm học điện Hoàng gia. 
            Vui lòng thực hiện <strong>Đăng Nhập</strong> để đồng hành cùng sỹ tử, 
            đồng bộ học lục và thăng hoa tiên thú triều đình.
          </p>

          <div className="pt-2 w-full">
            <AuthLoginForm />
          </div>

          <div className="pt-2 w-full border-t border-stone-200">
            <button
              onClick={signInWithGoogle}
              className="w-full text-stone-500 hover:text-stone-800 text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-stone-200 hover:bg-stone-50"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.177-2.767-6.177-6.177S10.58 6.16 13.99 6.16c1.55 0 2.96.57 4.05 1.51l3.07-3.07C19.22 2.82 16.78 1.8 13.99 1.8 8.16 1.8 3.42 6.54 3.42 12.37s4.74 10.57 10.57 10.57c6.14 0 10.23-4.31 10.23-10.4 0-.7-.08-1.2-.18-1.57H12.24z" />
              </svg>
              Đăng nhập bằng Google (Dự phòng)
            </button>
          </div>

          <div className="pt-6 space-y-3">
            <p className="text-[10px] text-stone-400 font-mono italic max-w-xs leading-normal">
              💡 Lưu ý: Nếu nút đăng nhập bị chặn hoặc không phản hồi do cơ chế bảo mật sandbox iFrame, vui lòng bấm nút <strong>"Open in new tab"</strong> ở góc phải phía trên của thanh công cụ AI Studio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const releaseStudent = pokemonReleaseEvent ? students.find(s => s.id === pokemonReleaseEvent.studentId) : undefined;
  const releaseEggCost = 10;
  const releaseEggShortfall = Math.max(0, releaseEggCost - (releaseStudent?.points || 0));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#fffbf2_0%,#f5ebe0_100%)] pb-32">
      <PokemonReactionToast
        events={pokemonReactionEvents}
        title={pokemonReactionTitle}
        onClose={() => {
          if (pokemonReactionTimerRef.current) {
            window.clearTimeout(pokemonReactionTimerRef.current);
            pokemonReactionTimerRef.current = null;
          }
          setPokemonReactionEvents([]);
        }}
      />

      {levelUpAnnouncement && (
        <div
          className="fixed inset-0 z-[330] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setLevelUpAnnouncement(null);
          }}
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-[36px] border-4 border-amber-300 bg-white p-8 text-center shadow-[0_30px_90px_rgba(245,158,11,0.45)] animate-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.35),transparent_42%)] pointer-events-none" />
            <button
              onClick={() => setLevelUpAnnouncement(null)}
              className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-amber-200 bg-white text-sm font-black text-amber-900 hover:bg-amber-50"
              aria-label="Tắt thông báo level up"
            >
              ×
            </button>
            <div className="relative z-10 space-y-4">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-amber-100 text-5xl ring-8 ring-amber-200/60">⭐</div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-700">{levelUpAnnouncement.title}</p>
              <h2 className="font-royal text-4xl uppercase text-amber-950">Level Up!</h2>
              <div className="space-y-2">
                {levelUpAnnouncement.events.map((event, index) => (
                  <p key={`${event.message}-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-950">
                    {event.message}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEFT NAV DOCK */}
      <div className="fixed left-0 top-1/2 z-50 h-40 w-5 -translate-y-1/2 group/nav">
        <nav
          className="absolute left-0 top-1/2 flex -translate-y-1/2 -translate-x-[calc(100%-18px)] flex-col items-center gap-3 rounded-r-[28px] border-2 border-white/90 bg-red-950/80 px-3 py-4 shadow-[0_25px_60px_-10px_rgba(120,20,20,0.3)] backdrop-blur-2xl transition-transform duration-300 ease-out group-hover/nav:translate-x-0 focus-within:translate-x-0"
          style={{
            boxShadow: '0 20px 50px -10px rgba(120,20,20,0.28), 0 0 35px rgba(212,175,55,0.22), inset 0 2px 3px 0 rgba(255,255,255,0.35)'
          }}
        >
          {[
            { id: 'school' as Screen, icon: '🏛️', label: 'Kim Tự Tháp' },
            { id: 'class' as Screen, icon: '📚', label: 'Lớp Học' },
            { id: 'settings' as Screen, icon: '⚙️', label: 'Cài Đặt' }
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentScreen(item.id)}
              title={item.label}
              className={`grid h-14 w-14 place-items-center rounded-2xl border text-2xl shadow-lg transition-all active:scale-95 ${
                currentScreen === item.id
                  ? 'border-amber-200 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-red-950 ring-4 ring-amber-200/35'
                  : 'border-white/30 bg-white/12 text-amber-100 hover:scale-110 hover:bg-white/20'
              }`}
            >
              {item.icon}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            title="Thành viên triều đình"
            className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-300 to-amber-600 shadow-lg transition-all hover:scale-110 active:scale-95"
          >
            <img
              src={profile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'}
              className="h-10 w-10 rounded-xl border border-white/80 object-cover"
              alt="Avatar"
              referrerPolicy="no-referrer"
            />
          </button>
        </nav>
      </div>

      <StatusDock
        user={user}
        isSyncing={isSyncing}
        lastSyncedTime={lastSyncedTime}
        onBackup={handleBackupToCloud}
        onRestore={handleRestoreFromCloud}
      />

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto p-6">
        {currentScreen === 'school' && (
          <div className="space-y-12 py-12 animate-in fade-in duration-500">
            <h2 className="text-4xl font-royal text-center text-red-800 uppercase tracking-widest mb-16">Kim Tự Tháp Triều Đình</h2>
            
            <div className="flex flex-col items-center gap-16">
              {pyramidTiers.map((tier, idx) => (
                <div key={tier.level} className="w-full flex flex-col items-center">
                  <div className="mb-4 text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">{tier.title}</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6">
                    {tier.students.map(s => {
                      const rank = getRank(s.points, s.gender);
                      const isTop = tier.level === 999;
                      return (
                        <div key={s.id} className="text-center group">
                          <div className="relative inline-block mb-3">
                            <img 
                              src={rank.avatar || 'https://api.dicebear.com/7.x/bottts/svg'} 
                              className={`rounded-full border-[#D4AF37] shadow-xl object-cover transition-transform group-hover:scale-110 ${isTop ? 'w-40 h-40 border-8' : 'w-20 h-20 border-4'}`} 
                            />
                            {isTop && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-5xl">{s.gender === Gender.MALE ? '👑' : '👸'}</span>}
                            <div className="absolute -bottom-2 -right-2 bg-red-800 text-white text-[10px] w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white">{s.points}</div>
                          </div>
                          <p className={`font-bold text-red-800 ${isTop ? 'text-xl' : 'text-xs'}`}>{s.name}</p>
                          <p className="text-[8px] opacity-40 font-black uppercase">{s.className}</p>
                        </div>
                      );
                    })}
                  </div>
                  {idx < pyramidTiers.length - 1 && <div className="mt-12 w-32 h-1 bg-red-800/10 rounded-full" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentScreen === 'class' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-wrap gap-4 mb-8 bg-gray-50 p-4 rounded-2xl border items-center">
              <input type="text" placeholder="Tìm kiếm học sĩ..." className="flex-1 p-3 rounded-xl border outline-none focus:ring-2 ring-red-800/20" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />

              <div className="relative">
                <select
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                  className="bg-white text-red-950 border-2 border-amber-200 px-4 py-3 pr-9 rounded-xl outline-none font-black text-xs appearance-none hover:border-amber-400 transition-all cursor-pointer shadow-sm"
                >
                  <option value="Tất cả">Tất cả học sĩ</option>
                  {classes.filter(c => c !== 'Tất cả').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-amber-700">
                  <span className="text-[10px]">▼</span>
                </div>
              </div>
              
              <button
                onClick={openAttendanceCheck}
                className="bg-sky-700 text-white px-5 py-3 rounded-xl font-black shadow-lg hover:bg-sky-800 transition-all uppercase text-xs tracking-wider"
              >
                🧭 Check đi học
              </button>

              <button
                onClick={openHomeworkCheck}
                className="bg-emerald-700 text-white px-5 py-3 rounded-xl font-black shadow-lg hover:bg-emerald-800 transition-all uppercase text-xs tracking-wider"
              >
                📚 Check Homework
              </button>

              <button onClick={() => {
                const name = prompt("Họ tên học sĩ:");
                if (!name) return;
                const gender = confirm("Nhấn OK cho Nam, Cancel cho Nữ") ? Gender.MALE : Gender.FEMALE;
                const cls = prompt("Lớp:", filterClass !== 'Tất cả' ? filterClass : 'Mới');
                setStudents(prev => [...prev, { 
                  id: Date.now().toString(), 
                  name, 
                  gender, 
                  className: cls || 'Triều Đình', 
                  points: 0, 
                  history: [],
                  egg: createEgg('normal')
                }]);
              }} className="bg-red-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-red-900 transition-all">+ Thêm Học Sĩ</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentClassStudents.map(s => (
                <div key={s.id} className="relative group">
                  <StudentCard 
                    student={s} 
                    getRank={getRank} 
                    petSkills={petSkills}
                    isSelected={selectedStudentIds.includes(s.id)}
                    onSelect={(st) => {
                      if (isMultiSelectMode) {
                        setSelectedStudentIds(prev => prev.includes(st.id) ? prev.filter(id => id !== st.id) : [...prev, st.id]);
                      } else {
                        setEditingStudent(st);
                        setCurrentScreen('profile');
                      }
                    }} 
                  />
                  <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); toggleAttendance(s.id); }} className="bg-white/95 p-2 rounded-lg border shadow-sm text-[10px] font-bold">VẮNG/CÓ</button>
                  </div>
                  <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedStudentIds([s.id]); setActiveTab('positive'); setFeedbackSource('manual'); setShowSkillModal(true); }} className="bg-green-500 text-white w-10 h-10 rounded-full shadow-lg font-bold text-xl">+</button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedStudentIds([s.id]); setActiveTab('negative'); setFeedbackSource('manual'); setShowSkillModal(true); }} className="bg-red-500 text-white w-10 h-10 rounded-full shadow-lg font-bold text-xl">-</button>
                  </div>
                </div>
              ))}
            </div>

            {/* CLASS BOTTOM TOOLS - LIQUID GLASS FLOATING DOCK WITH MAGNIFICATION */}
            <LiquidDock
              onRandom={handleRandom}
              onLudo={() => openLudoForClass()}
              onLuckyWheel={handleOpenLuckyWheel}
              onShop={handleOpenShop}
              onGroup={() => setShowGroupModal(true)}
              onTimer={() => setShowTimerModal(true)}
              onSelectAll={handleToggleSelectAll}
              isMultiSelectMode={isMultiSelectMode}
              onToggleMultiSelect={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedStudentIds([]); }}
              onResetAura={handleResetSelectedAura}
              selectedCount={selectedStudentIds.length}
              isSyncing={isSyncing}
              lastSyncedTime={lastSyncedTime}
              onOpenFeedback={() => { setFeedbackSource('manual'); setShowSkillModal(true); }}
              onDeleteSelected={handleDeleteStudents}
            />
          </div>
        )}

        {currentScreen === 'profile' && editingStudent && (
          <div className="bg-white p-6 sm:p-10 rounded-3xl border shadow-2xl max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-2xl sm:text-3xl font-royal text-red-800">📜 Hồ Sơ Học Sĩ</h2>
              <button 
                onClick={() => setCurrentScreen('class')} 
                className="text-sm font-black uppercase text-gray-400 hover:text-red-800 transition-colors"
              >
                ← Quay lại lớp
              </button>
            </div>

            {/* Profile Tab Selector */}
            <div className="flex border-b border-gray-100 shrink-0">
              <button 
                onClick={() => setProfileTab('info')} 
                className={`flex-1 py-3 text-xs sm:text-sm font-black border-b-4 transition-all tracking-wider ${profileTab === 'info' ? 'text-red-800 border-red-800' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                📜 TIỂU SỬ & CÔNG TRẠNG
              </button>
              <button 
                onClick={() => setProfileTab('pet')} 
                className={`flex-1 py-3 text-xs sm:text-sm font-black border-b-4 transition-all tracking-wider flex items-center justify-center gap-2 ${profileTab === 'pet' ? 'text-amber-600 border-amber-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                <span>{editingStudent.pet ? '🔥' : '🥚'}</span>
                <span>{editingStudent.pet ? 'LINH THÚ HỘ MỆNH' : 'ẤP TRỨNG POKÉMON'}</span>
              </button>
              <button 
                onClick={() => {
                  setProfileTab('fusion');
                  setSelectedFusionPetDexIds([]);
                }} 
                className={`flex-1 py-3 text-xs sm:text-sm font-black border-b-4 transition-all tracking-wider flex items-center justify-center gap-2 ${profileTab === 'fusion' ? 'text-purple-700 border-purple-700' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                <span>🔮</span>
                <span>HỢP NHẤT LINH THÚ</span>
              </button>
            </div>

            {profileTab === 'info' ? (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
                  <div className="relative shrink-0 flex flex-col items-center gap-2">
                    <img 
                      referrerPolicy="no-referrer"
                      src={editingStudent.customAvatar || getRank(editingStudent.points, editingStudent.gender).avatar || 'https://api.dicebear.com/7.x/bottts/svg'} 
                      className="w-32 h-32 rounded-full border-4 border-[#D4AF37] object-cover shadow-lg" 
                    />
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <label className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all text-center w-full uppercase">
                        📷 Đổi Ảnh Riêng
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleStudentCustomAvatarUpload(editingStudent.id, e)} 
                          className="hidden" 
                        />
                      </label>
                      {editingStudent.customAvatar && (
                        <button 
                          onClick={() => handleRemoveStudentCustomAvatar(editingStudent.id)}
                          className="text-[9px] font-bold text-red-600 hover:underline uppercase"
                        >
                          Xoá ảnh riêng (Dùng Avatar cấp bậc)
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Họ Tên</label>
                      <input className="w-full border p-3 rounded-xl bg-gray-50 focus:ring-2 ring-red-800/10 outline-none text-sm font-bold" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Lớp/Cung Trấn</label>
                      <input className="w-full border p-3 rounded-xl bg-gray-50 focus:ring-2 ring-red-800/10 outline-none text-sm font-bold" value={editingStudent.className} onChange={e => setEditingStudent({...editingStudent, className: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Điểm Hiện Tại</label>
                      <input type="number" className="w-full border p-3 rounded-xl bg-gray-50 font-black text-2xl text-red-800 outline-none" value={editingStudent.points} onChange={e => setEditingStudent({...editingStudent, points: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                  <button onClick={() => { 
                    setStudents(prev => prev.map(s => s.id === editingStudent.id ? editingStudent : s)); 
                    alert("Đã lưu ý chỉ!");
                    setCurrentScreen('class');
                  }} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 hover:scale-[1.01] transition-all">Lưu Thông Tin</button>
                  <button onClick={() => { 
                    setSelectedStudentIds([editingStudent.id]); 
                    setFeedbackSource('manual');
                    setShowSkillModal(true); 
                  }} className="flex-1 bg-red-800 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-red-900 hover:scale-[1.01] transition-all">Ban Thưởng / Phạt</button>
                  <button onClick={() => {
                    if (window.confirm("Xóa học sĩ này?")) {
                      setStudents(prev => prev.filter(s => s.id !== editingStudent.id));
                      setCurrentScreen('class');
                    }
                  }} className="bg-gray-100 text-red-800 px-6 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all">Xóa</button>
                </div>

                <div className="pt-8 border-t">
                  <h3 className="text-xl font-royal mb-6 text-gray-800">Biên Niên Sử</h3>
                  <div className="space-y-3 h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {editingStudent.history.map(h => (
                      <div key={h.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center group hover:border-red-800/20">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{h.reason}</p>
                          <p className="text-[10px] opacity-40">{new Date(h.timestamp).toLocaleString()}</p>
                        </div>
                        <span className={`text-xl font-black ${h.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{h.amount > 0 ? '+' : ''}{h.amount}</span>
                      </div>
                    ))}
                    {editingStudent.history.length === 0 && <p className="text-center py-20 opacity-20 italic">Chưa có ghi chép nào...</p>}
                  </div>
                </div>
              </div>
            ) : profileTab === 'pet' ? (
              <div className="space-y-10 animate-in fade-in duration-300">
                {!editingStudent.pet ? (
                  /* EGG SCREEN WITH OWNED PETS SELECTION */
                  <div className="space-y-10">
                    <div className="text-center py-6 space-y-6 bg-gradient-to-b from-amber-50/30 to-transparent p-8 rounded-[40px] border border-amber-100/50">
                      <div className="relative inline-block">
                        <div className={`absolute inset-0 bg-amber-400/20 rounded-full blur-2xl transition-all duration-1000 ${editingStudent.egg && editingStudent.egg.progress >= Math.ceil(getEggRequiredProgress(editingStudent.egg) * 0.7) ? 'animate-ping scale-75' : ''}`} />
                        
                        <div className={`text-9xl select-none inline-block transform transition-transform ${editingStudent.egg && editingStudent.egg.progress >= Math.ceil(getEggRequiredProgress(editingStudent.egg) * 0.7) ? 'animate-bounce cursor-pointer' : 'hover:scale-105 duration-300'}`}>
                          {editingStudent.egg && editingStudent.egg.progress >= getEggRequiredProgress(editingStudent.egg) ? '🐣' : editingStudent.egg && editingStudent.egg.progress >= Math.ceil(getEggRequiredProgress(editingStudent.egg) * 0.7) ? '🥚💥' : editingStudent.egg && editingStudent.egg.progress >= Math.ceil(getEggRequiredProgress(editingStudent.egg) * 0.4) ? '🥚⚡' : '🥚'}
                        </div>
                      </div>
                      
                      <div className="max-w-md mx-auto bg-white border border-amber-200/60 p-6 rounded-3xl shadow-sm space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-black text-amber-950">Tiến Trình Ấp Quả Trứng</span>
                          <span className="font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-xs">{(editingStudent.egg ? editingStudent.egg.progress : 0)}/{getEggRequiredProgress(editingStudent.egg)}đ</span>
                        </div>
                        <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden shadow-inner border animate-pulse">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, Math.max(0, ((editingStudent.egg ? editingStudent.egg.progress : 0) / getEggRequiredProgress(editingStudent.egg)) * 100))}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 italic font-sans leading-relaxed">
                          {editingStudent.egg && editingStudent.egg.progress >= getEggRequiredProgress(editingStudent.egg)
                            ? 'Chúc mừng! Có sinh mệnh sắp vươn mình ra khỏi lớp vỏ mỏng manh!'
                            : editingStudent.egg && editingStudent.egg.progress >= Math.ceil(getEggRequiredProgress(editingStudent.egg) * 0.7)
                              ? 'Lớp vỏ trứng nứt sâu rộn ràng! Chỉ 1 vài nét khích lệ hào quang từ giáo sĩ là nở trứng ngay!'
                              : editingStudent.egg && editingStudent.egg.progress >= Math.ceil(getEggRequiredProgress(editingStudent.egg) * 0.4)
                                ? 'Vỏ trứng bắt đầu xuất hiện rạn xước lấp lánh sinh lực.'
                                : 'Trứng nguyên sơ đang chờ đợi được nạp năng lượng bằng các phản hồi tích cực.'}
                        </p>

                        <div className="pt-2 flex flex-col gap-3">
                          <button 
                            onClick={() => {
                              const currentEgg = editingStudent.egg || createEgg('normal');
                              const requiredProgress = getEggRequiredProgress(currentEgg);
                              const nextProg = currentEgg.progress + 1;
                              const isHatching = nextProg >= requiredProgress;
                              
                              let updatedEgg = { ...currentEgg, requiredProgress, progress: Math.min(requiredProgress, nextProg) };
                              let updatedPet = editingStudent.pet;

                              let historyItem: HistoryItem = { id: Date.now().toString(), amount: 1, reason: "Ủng hộ Hào Quang ấp trứng", timestamp: Date.now() };

                              if (isHatching && updatedEgg.status === 'egg') {
                                updatedEgg.status = 'hatched';
                                updatedPet = createPokemonPetFromDexId(currentEgg.assignedDexId);
                                setHatchSuccessMessage(`Tuyệt diệu! Quả trứng của học sĩ ${editingStudent.name} đã chính thức nở ra Pokémon cưng ${getPokemonDisplayName(updatedPet)}! 🎉`);
                                setShowHatchModal(true);
                              }

                              let currentMerged: Student = {
                                ...editingStudent,
                                points: editingStudent.points + 1,
                                egg: updatedEgg,
                                pet: updatedPet,
                                pets: updatedPet ? updatePetInCollection(editingStudent, updatedPet) : editingStudent.pets,
                                history: [historyItem, ...editingStudent.history].slice(0, 50)
                              };
                              setEditingStudent(currentMerged);
                              setStudents(prev => prev.map(s => s.id === editingStudent.id ? currentMerged : s));
                            }}
                            className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-2xl shadow-md hover:bg-amber-600 active:scale-95 transition-all text-xs uppercase"
                          >
                            🧪 Ủng Hộ +1đ Hào Quang Ấp Trứng
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              onClick={() => handleBuyNewEgg(editingStudent.id, 'normal')}
                              className="w-full bg-red-800 hover:bg-red-950 text-white font-bold py-3.5 rounded-2xl shadow-md active:scale-95 transition-all text-xs uppercase"
                            >
                              🥚 Trứng thường (10đ)
                            </button>
                            <button
                              onClick={() => handleBuyNewEgg(editingStudent.id, 'special')}
                              className="w-full bg-purple-700 hover:bg-purple-900 text-white font-bold py-3.5 rounded-2xl shadow-md active:scale-95 transition-all text-xs uppercase"
                            >
                              ✨ Trứng đặc biệt (20đ)
                            </button>
                          </div>

                          {editingStudent.egg && editingStudent.egg.progress >= getEggRequiredProgress(editingStudent.egg) && (
                             <button 
                               onClick={() => {
                                 const currentEgg = editingStudent.egg!;
                                 const requiredProgress = getEggRequiredProgress(currentEgg);
                                 const updatedEgg = { ...currentEgg, status: 'hatched' as const, requiredProgress, progress: requiredProgress };
                                 const updatedPet = createPokemonPetFromDexId(currentEgg.assignedDexId);
                                 
                                 const currentMerged: Student = {
                                   ...editingStudent,
                                   egg: updatedEgg,
                                   pet: updatedPet,
                                   pets: updatePetInCollection(editingStudent, updatedPet)
                                 };

                                 setEditingStudent(currentMerged);
                                 setStudents(prev => prev.map(s => s.id === editingStudent.id ? currentMerged : s));
                                 setHatchSuccessMessage(`Tin vui chấn động! Pokémon ${getPokemonDisplayName(updatedPet)} đã tung cánh bay ra từ vỏ trứng chào mừng học sĩ ${editingStudent.name}! 🐣💖`);
                                 setShowHatchModal(true);
                               }}
                               className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 animate-bounce transition-all uppercase text-xs"
                             >
                               🐣 TIẾN HÀNH GÕ VỎ - NỞ TRỨNG NGAY! 🐣
                             </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* OWNED PORTFOLIO SELECTION IN EGG SCREEN (WHEN WAITING FOR HATCH) */}
                    {editingStudent.pets && editingStudent.pets.length > 0 && (
                      <div className="bg-amber-50/30 p-6 rounded-[32px] border border-amber-200/30 space-y-4">
                        <div className="text-left font-sans">
                          <h4 className="font-royal text-lg text-amber-900 flex items-center gap-2">
                            <span>🦁</span>
                            <span>Danh Sách Linh Thú Sở Hữu ({editingStudent.pets.length})</span>
                          </h4>
                          <p className="text-xs text-amber-950/60 font-sans mt-0.5">Triệu tập linh thú hộ thân đã nở trước đó để tiếp tục phục vụ đồng hành.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                          {editingStudent.pets.map(p => (
                            <div key={p.instanceId || `${p.dexId}-${p.name}`} className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center justify-between gap-3 shadow-xs font-sans">
                              <div className="flex items-center gap-2 min-w-0">
                                <img 
                                  src={getPokemonArtworkUrl(p)}
	                                  onError={event => handlePokemonArtworkError(event, p)}
                                  className="w-10 h-10 object-contain shrink-0" 
                                />
                                <div className="min-w-0">
                                  <h5 className="font-extrabold text-xs text-gray-800 truncate">{p.isShiny ? '✨ ' : ''}{getPokemonDisplayName(p)}</h5>
                                  <span className="text-[8px] bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-black uppercase tracking-tight">{p.types.join('/')}</span>
                                  <p className="mt-1 text-[9px] font-black text-gray-400">Lv.{p.level || 1} · HP {p.hp ?? 100} · Bond {p.bond || 0}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleSelectActivePet(editingStudent.id, p)}
                                className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm transition-all shrink-0"
                              >
                                Chọn Đồng Hành ⚔️
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* PET CORNER DETAILED STORE & CUSTOMIZATION */
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-amber-50/50 rounded-3xl border border-amber-200/50 p-6 flex flex-col md:flex-row gap-6 items-center">
                      <div className="shrink-0 w-44 h-44 bg-white rounded-2xl border-4 border-amber-300 p-4 flex items-center justify-center relative shadow-lg overflow-hidden group">
                        <div className="absolute inset-0 bg-radial-gradient from-amber-200/50 via-transparent to-transparent opacity-60 group-hover:scale-125 transition-transform" />
                        <img 
                          referrerPolicy="no-referrer"
                          src={getPokemonArtworkUrl(editingStudent.pet)}
	                          onError={event => handlePokemonArtworkError(event, editingStudent.pet)}
                          className={`w-full h-full object-contain relative z-10 drop-shadow-xl animate-in duration-500 hover:rotate-6 transition-transform ${editingStudent.pet.isShiny ? 'rounded-2xl bg-amber-100/70 ring-4 ring-amber-300' : ''}`}
                          alt={getPokemonDisplayName(editingStudent.pet)}
                        />
                        
                        {/* Type Badges on bottom corner */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                          {editingStudent.pet.types.map(t => (
                            <span key={t} className="bg-amber-500 text-white font-black text-[7px] px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm border border-white">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 w-full space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                          <div>
                            <span className="bg-amber-100 text-amber-900 font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-max">Linh Thú Hộ Mệnh Đương Trực</span>
                            <h3 className="text-2xl font-black text-amber-950 mt-1">{getPokemonDisplayName(editingStudent.pet)}</h3>
                            <p className="text-xs font-bold text-amber-900/60">
                              {editingStudent.pet.speciesName || editingStudent.pet.name} · Lv.{editingStudent.pet.level || 1}
                            </p>
                            {editingStudent.pet.isShiny && (
                              <span className="mt-1 inline-flex w-max items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-800">
                                ✨ Shiny
                              </span>
                            )}
                          </div>
                          
                          <div className="text-right sm:text-right">
                            <p className="text-[9px] uppercase font-bold text-gray-400">Tài chính của bạn</p>
                            <p className="text-xl font-black text-red-800">{editingStudent.points}đ Hào Quang</p>
                          </div>
                        </div>

                        {/* Nicknaming support */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Đặt Biệt Danh Thú Cưng</label>
                          <input 
                            className="w-full border p-2.5 rounded-xl bg-white focus:ring-2 ring-amber-500/30 outline-none text-sm font-bold text-amber-950 border-amber-200" 
                            value={editingStudent.pet.nickname || ''} 
                            onChange={e => handleRenamePet(editingStudent.id, e.target.value)}
                            placeholder="Biệt danh mới cho pet..."
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-sans">
                          <div className="bg-white border border-amber-100 rounded-2xl p-3">
                            <p className="text-[9px] uppercase font-black text-gray-400">Level</p>
                            <p className="text-sm font-black text-amber-950">Lv.{editingStudent.pet.level || 1}</p>
                          </div>
                          <div className="bg-white border border-amber-100 rounded-2xl p-3">
                            <p className="text-[9px] uppercase font-black text-gray-400">HP</p>
                            <p className="text-sm font-black text-emerald-700">{editingStudent.pet.hp ?? 100}/100</p>
                          </div>
                          <div className="bg-white border border-amber-100 rounded-2xl p-3">
                            <p className="text-[9px] uppercase font-black text-gray-400">{(editingStudent.pet.level || 1) >= 30 ? 'Mastery XP' : 'XP'}</p>
                            <p className="text-sm font-black text-amber-950">
                              {(editingStudent.pet.level || 1) >= 30
                                ? `${editingStudent.pet.masteryXp || 0}/${getNextMasteryTarget(editingStudent.pet.masteryStars || 0) || 'MAX'}`
                                : `${editingStudent.pet.xp || 0}/${xpNeededForNextLevel(editingStudent.pet.level || 1)}`}
                            </p>
                          </div>
                          <div className="bg-white border border-amber-100 rounded-2xl p-3">
                            <p className="text-[9px] uppercase font-black text-gray-400">Bond</p>
                            <p className="text-sm font-black text-pink-700">{editingStudent.pet.bond || 0}/100</p>
                          </div>
                          <div className="bg-white border border-amber-100 rounded-2xl p-3">
                            <p className="text-[9px] uppercase font-black text-gray-400">Charge</p>
                            <p className="text-sm font-black text-indigo-700">{editingStudent.pet.charge || 0}/5</p>
                          </div>
                          <div className="bg-white border border-amber-100 rounded-2xl p-3 min-w-0">
                            <p className="text-[9px] uppercase font-black text-gray-400">Passive</p>
                            <div className="mt-1 min-w-0">
                              <PokemonPassiveBadge passiveId={editingStudent.pet.passiveId} compact className="max-w-full" />
                              {!editingStudent.pet.passiveId && <span className="text-[10px] font-black text-gray-400">Chưa có</span>}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-white p-3 font-sans">
                          <p className="text-[9px] uppercase font-black text-gray-400">Evolution Preview</p>
                          <p className="text-sm font-black text-amber-950">
                            {editingPetEvolutionPreview.isFinal
                              ? 'Final Evolution Reached'
                              : `Next Evolution: Lv. ${editingPetEvolutionPreview.nextLevel} · ${editingPetEvolutionPreview.nextSpeciesName}`}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-amber-50 p-4 font-sans shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[9px] uppercase font-black text-indigo-500">Passive & Quà tự động</p>
                              {(() => {
                                const passive = getPassiveDefinition(editingStudent.pet.passiveId);
                                return passive ? (
                                  <div className="mt-2">
                                    <p className="text-sm font-black text-indigo-950">
                                      {getPassiveIcon(passive.id)} {passive.name}
                                    </p>
                                    <p className="mt-1 text-xs font-bold leading-relaxed text-indigo-900/70">{passive.description}</p>
                                  </div>
                                ) : (
                                  <p className="mt-2 text-xs font-bold text-gray-400">Pokémon này chưa có passive.</p>
                                );
                              })()}
                            </div>
                            <div className="rounded-2xl border border-white bg-white/80 p-3 text-[10px] font-black text-amber-950 shadow-inner sm:w-72">
                              <p>Lv.5 / Lv.12 / Lv.20 / Lv.30: kiểm tra tiến hóa theo loài.</p>
                              <p className="mt-1">Mỗi lần lên level: Bond +1 và thông báo Level Up ở giữa màn hình.</p>
                              <p className="mt-1">Charge 5/5: câu trả lời Solo tích cực kế tiếp được tăng XP.</p>
                              <p className="mt-1">Sau Lv.30: XP chuyển thành Mastery XP để nhận sao Mastery.</p>
                            </div>
                          </div>
                        </div>

                        {(editingStudent.pet.level || 1) >= 30 && (
                          <div className="rounded-2xl border border-amber-200 bg-white p-3 font-sans">
                            <p className="text-[9px] uppercase font-black text-gray-400">Mastery</p>
                            <p className="text-xl font-black text-amber-700 tracking-widest">
                              {(editingStudent.pet.masteryStars || 0) > 0 ? '⭐'.repeat(editingStudent.pet.masteryStars || 0) : 'Chưa có sao'}
                            </p>
                            <p className="mt-1 text-[10px] font-bold text-amber-900/60">
                              XP sau Lv.30 sẽ chuyển thành Mastery XP cho danh hiệu đồng hành lâu dài.
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap justify-end gap-3 pt-1">
                          <button 
                            onClick={() => handleBuyNewEgg(editingStudent.id, 'normal')}
                            className="bg-red-800 hover:bg-red-950 text-white font-bold text-xs p-3 px-5 rounded-2xl flex items-center gap-2 shadow-md transition-all active:translate-y-px font-sans"
                          >
                            <span>🥚🌟</span>
                            <span>Trứng thường (10đ)</span>
                          </button>
                          <button 
                            onClick={() => handleBuyNewEgg(editingStudent.id, 'special')}
                            className="bg-purple-700 hover:bg-purple-900 text-white font-bold text-xs p-3 px-5 rounded-2xl flex items-center gap-2 shadow-md transition-all active:translate-y-px font-sans"
                          >
                            <span>✨🥚</span>
                            <span>Trứng đặc biệt (20đ)</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* OWNED PETS SELECTION INTERFACE (ACTIVE COMPANION SWAP) */}
                    {editingStudent.pets && editingStudent.pets.length > 0 && (
                      <div className="bg-amber-50/10 p-6 rounded-3xl border border-amber-200/20 space-y-4">
                        <div className="text-left border-b pb-2 font-sans">
                          <h4 className="font-royal text-lg text-amber-900 flex items-center gap-2">
                            <span>🦁</span>
                            <span>Trại Linh Thú Sở Hữu ({editingStudent.pets.length})</span>
                          </h4>
                          <p className="text-xs text-amber-950/60 mt-0.5">Lựa chọn một Linh thú tâm đầu ý hợp từ nông trại cổ tích để kề vai sát cánh kề vai cùng học sĩ diện kiến triều học.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[190px] overflow-y-auto pr-2 custom-scrollbar font-sans">
                          {editingStudent.pets.map(p => {
                            const isActive = isSamePokemon(editingStudent.pet, p);
                            return (
                              <div key={p.instanceId || `${p.dexId}-${p.name}`} className={`p-3 bg-white border rounded-2xl flex items-center justify-between gap-3 shadow-xs transition-all ${isActive ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <img 
                                    src={getPokemonArtworkUrl(p)}
	                                    onError={event => handlePokemonArtworkError(event, p)}
                                    className="w-10 h-10 object-contain shrink-0" 
                                  />
                                  <div className="min-w-0">
                                    <h5 className="font-extrabold text-xs text-gray-800 truncate">{p.isShiny ? '✨ ' : ''}{getPokemonDisplayName(p)}</h5>
                                    <span className="text-[8px] bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-black uppercase tracking-tight">{p.types.join('/')}</span>
                                    <p className="mt-1 text-[9px] font-black text-gray-400">Lv.{p.level || 1} · HP {p.hp ?? 100} · Bond {p.bond || 0}</p>
                                  </div>
                                </div>
                                {isActive ? (
                                  <span className="text-[9px] bg-amber-500 text-white font-extrabold px-2.5 py-1.5 rounded-full uppercase tracking-tighter shrink-0">ĐANG ĐỒNG HÀNH</span>
                                ) : (
                                  <button 
                                    onClick={() => handleSelectActivePet(editingStudent.id, p)}
                                    className="bg-gray-100 hover:bg-amber-100 text-amber-950 text-[9px] font-bold px-3 py-1.5 rounded-xl border border-amber-200 uppercase tracking-wider shadow-xs transition-all shrink-0"
                                  >
                                    Chọn Đồng Hành ⚔️
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    )}
                    {/* SECTION: YOUR NEW DIRECT PET ACTIVE SKILLS (LIMIT 2 USES) */}
                    {editingStudent.pet.skills && editingStudent.pet.skills.length > 0 && (
                      <div className="space-y-4 pt-4">
                        <h4 className="font-royal text-xl text-indigo-900 border-b pb-2 flex items-center gap-2">
                          <span>⚡</span>
                          <span>Bảo Bối Tuyệt Chiêu Hữu Dụng</span>
                        </h4>
                        <p className="text-xs text-indigo-950/70 font-sans">Kích hoạt trực tiếp quyền năng thần bí để lật ngược thế cờ kiểm tra! Mật tịch bốc hơi ngay sau 2 lần sử dụng.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {editingStudent.pet.skills.map(skId => {
                            const sk = petSkills.find(x => x.id === skId);
                            if (!sk) return null;
                            const currentUses = editingStudent.pet?.skillUses?.[skId] || 0;
                            const remainingUses = Math.max(0, 2 - currentUses);
                            return (
                              <div key={skId} className="bg-indigo-50/40 p-4 border border-indigo-200 rounded-3xl flex items-center justify-between gap-4 shadow-sm hover:bg-indigo-50/80 transition-all font-sans text-left">
                                <div className="w-10 h-10 shrink-0 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl border border-indigo-200">
                                  {sk.icon}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${remainingUses <= 1 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                                    Trạng thái: Chỉ còn {remainingUses}/2 lượt dùng
                                  </span>
                                  <h5 className="font-extrabold text-sm text-gray-800 mt-1">{sk.name}</h5>
                                  <p className="text-xs text-gray-400 mt-0.5 italic leading-tight">{sk.description}</p>
                                </div>
                                <button
                                  onClick={() => handleUsePetSkill(editingStudent.id, skId, sk.name)}
                                  className="bg-red-800 hover:bg-red-950 text-white font-black text-[9px] px-3.5 py-2.5 rounded-2xl uppercase tracking-tight shadow active:translate-y-px transition-all shrink-0 font-sans"
                                >
                                  Kích Hoạt
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SECTION: PET SKILLS DOJO */}
                    <div className="space-y-4 pt-4">
                      <h4 className="font-royal text-xl text-purple-900 border-b pb-2 flex items-center gap-2">
                        <span>🎓</span>
                        <span>Viện Bảo Học Pháp Bảo (Skills Đường Pet)</span>
                      </h4>
                      <p className="text-xs text-purple-800/70 font-sans">Huấn luyện tuyện kỹ học đường cho linh thú để trợ oai đổi đề, né câu, đỡ phạt oanh tạc triều học!</p>
                      
                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar font-sans font-[Inter]">
                        {petSkills.map(sk => {
                          const isLearned = editingStudent.pet?.skills.includes(sk.id);
                          return (
                            <div key={sk.id} className="bg-white p-4 border border-gray-100 rounded-3xl flex items-center justify-between gap-4 shadow-sm hover:border-purple-200 hover:bg-purple-50/10 transition-all font-[Inter]">
                              <div className="w-10 h-10 shrink-0 bg-purple-50 rounded-2xl flex items-center justify-center text-2xl border border-purple-100">
                                {sk.icon}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <span className="text-[8px] tracking-widest font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Bí kíp học sĩ</span>
                                <h5 className="font-extrabold text-sm text-gray-800 mt-1">{sk.name}</h5>
                                <p className="text-xs text-gray-400 mt-0.5 italic leading-relaxed">{sk.description}</p>
                              </div>
                              <div className="shrink-0 text-right font-[Inter]">
                                {isLearned ? (
                                  <span className="bg-purple-100 text-purple-800 font-extrabold border border-purple-200 text-[10px] px-4 py-2 rounded-2xl uppercase tracking-tighter">
                                    ☘️ Đã Giác Ngộ
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleBuySkill(editingStudent.id, sk.id, sk.cost, sk.name)}
                                    className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-[10px] px-4 py-2 rounded-2xl uppercase tracking-tight shadow active:translate-y-px transition-all"
                                  >
                                    Rèn ({sk.cost}đ)
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-purple-50/70 border-2 border-purple-200 rounded-[32px] p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b border-purple-200 pb-4">
                    <div>
                      <h3 className="text-2xl font-royal text-purple-900 uppercase tracking-wider">🔮 Hợp nhất Linh thú</h3>
                      <p className="text-xs text-purple-950/70 mt-1">Chọn đúng 2 Pokémon để hợp nhất thành 1 Pokémon mới. Hai Pokémon cũ sẽ biến mất, còn các skills đã mua và vẫn còn hiệu lực sẽ được giữ lại.</p>
                    </div>
                    <span className="shrink-0 bg-white text-purple-900 border border-purple-200 px-3 py-1.5 rounded-full text-xs font-black">
                      Đã chọn {selectedFusionPetDexIds.length}/2
                    </span>
                  </div>

                  {getFusionCandidates(editingStudent).length < 2 ? (
                    <div className="bg-white border border-purple-100 rounded-3xl p-8 text-center space-y-3">
                      <div className="text-5xl">🥚</div>
                      <p className="text-sm font-black text-purple-900">Cần tối thiểu 2 Pokémon để hợp nhất.</p>
                      <p className="text-xs text-purple-700/70">Hãy ấp thêm trứng hoặc chọn lại linh thú sở hữu trước khi dung hợp.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {getFusionCandidates(editingStudent).map((p, index) => {
                          const isSelected = selectedFusionPetDexIds.includes(index);
                          const skillNames = (p.skills || [])
                            .map(skillId => petSkills.find(skill => skill.id === skillId)?.name || skillId)
                            .slice(0, 3);
                          return (
                            <button
                              type="button"
                              key={`${p.dexId}-${p.name}-${index}`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedFusionPetDexIds(prev => prev.filter(x => x !== index));
                                  return;
                                }
                                if (selectedFusionPetDexIds.length >= 2) {
                                  alert("Chỉ được chọn tối đa 2 Pokémon để hợp nhất!");
                                  return;
                                }
                                setSelectedFusionPetDexIds(prev => [...prev, index]);
                              }}
                              className={`text-left bg-white p-4 rounded-3xl border-2 transition-all flex items-center gap-4 ${isSelected ? 'border-purple-700 ring-4 ring-purple-100 shadow-lg' : 'border-purple-100 hover:border-purple-300'}`}
                            >
                              <img
                                src={getPokemonArtworkUrl(p)}
	                                onError={event => handlePokemonArtworkError(event, p)}
                                className="w-16 h-16 object-contain shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-sm text-purple-950 truncate">{p.isShiny ? '✨ ' : ''}{getPokemonDisplayName(p)}</h4>
                                  {isSelected && <span className="text-[9px] bg-purple-700 text-white px-2 py-0.5 rounded-full font-black">CHỌN</span>}
                                </div>
                                <p className="text-[9px] font-black text-purple-600 uppercase mt-1">{p.types.join(' / ')}</p>
                                <p className="text-[10px] text-stone-500 mt-2 line-clamp-2">
                                  {skillNames.length > 0 ? `Skills: ${skillNames.join(', ')}` : 'Chưa có skill đã mua'}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        disabled={selectedFusionPetDexIds.length !== 2}
                        onClick={() => handleFuseSelectedPokemons(editingStudent.id)}
                        className="w-full bg-purple-700 hover:bg-purple-800 disabled:opacity-40 disabled:hover:bg-purple-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                      >
                        🔮 Hợp Nhất 2 Linh Thú Đã Chọn
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {currentScreen === 'settings' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8 pb-12">
            <h2 className="text-3xl font-royal text-red-800 text-center uppercase">Thiết Lập Triều Đình</h2>

            <SettingsSection id="sound" icon="🔊" title="Cài Đặt Âm Thanh" subtitle="Youtube hoặc audio URL cho cộng điểm, trừ điểm, timer và vòng quay may mắn." collapsedSections={settingsCollapsed} onToggle={toggleSettingsSection}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                {[
                  ['Cộng Điểm (Tích cực)', posSoundUrl, setPosSoundUrl],
                  ['Trừ Điểm (Cần cố gắng)', negSoundUrl, setNegSoundUrl],
                  ['Timer Hết Giờ', timerSoundUrl, setTimerSoundUrl],
                  ['Vòng Quay Đang Quay', wheelSpinSoundUrl, setWheelSpinSoundUrl],
                  ['Vòng Quay Kết Thúc', wheelFinishSoundUrl, setWheelFinishSoundUrl]
                ].map(([label, value, setter]) => (
                  <div key={label as string} className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">{label as string}</label>
                    <input
                      className="w-full border p-3 rounded-xl text-xs outline-none focus:ring-2 ring-red-800/20"
                      value={value as string}
                      onChange={e => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                      placeholder="Link âm thanh..."
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  localStorage.setItem('imperial_sound_pos', posSoundUrl);
                  localStorage.setItem('imperial_sound_neg', negSoundUrl);
                  localStorage.setItem('imperial_sound_tim', timerSoundUrl);
                  localStorage.setItem(WHEEL_SPIN_SOUND_KEY, wheelSpinSoundUrl);
                  localStorage.setItem(WHEEL_FINISH_SOUND_KEY, wheelFinishSoundUrl);
                  alert("Đã lưu cài đặt âm thanh!");
                }}
                className="bg-red-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-red-900 transition-all uppercase text-xs"
              >
                Lưu Âm Thanh
              </button>
            </SettingsSection>

            <SettingsSection id="ranks" icon="👑" title="Cấp Bậc" subtitle="Tùy chỉnh cấp bậc Nam/Nữ, điểm tối thiểu và avatar từng rank." collapsedSections={settingsCollapsed} onToggle={toggleSettingsSection}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[Gender.FEMALE, Gender.MALE].map(g => (
                  <div key={g} className="bg-gray-50 p-6 rounded-[32px] border shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xl font-royal text-red-800">Cấp Bậc {g}</h4>
                      <button onClick={() => {
                        const title = prompt("Tên rank mới:");
                        if (!title) return;
                        const pts = parseInt(prompt("Điểm tối thiểu:") || '0');
                        const newRank: RankInfo = { id: Date.now().toString(), level: 0, title, minPoints: pts, maxPoints: pts + 49, color: 'text-gray-600', avatar: '' };
                        if (g === Gender.MALE) setRanksMale(prev => [...prev, newRank].sort((a,b) => a.minPoints - b.minPoints));
                        else setRanksFemale(prev => [...prev, newRank].sort((a,b) => a.minPoints - b.minPoints));
                      }} className="bg-red-800 text-white w-10 h-10 rounded-full font-bold">+</button>
                    </div>
                    <div className="space-y-4">
                      {(g === Gender.MALE ? ranksMale : ranksFemale).map(r => (
                        <div key={r.id} className="flex items-center gap-4 bg-white p-4 rounded-3xl border hover:border-red-800/30 transition-all shadow-sm">
                          <div className="w-14 h-14 shrink-0 border-2 border-gray-100 rounded-full overflow-hidden relative group">
                            <img src={r.avatar || 'https://api.dicebear.com/7.x/bottts/svg'} className="w-full h-full object-cover" />
                            <label className="absolute inset-0 cursor-pointer bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[8px] text-white font-black uppercase text-center p-1">
                              Tải Ảnh
                              <input type="file" accept="image/*" onChange={e => handleAvatarUpload(g, r.id, e)} className="hidden" />
                            </label>
                          </div>
                          <div className="flex-1 space-y-2 min-w-0">
                            <input className="w-full text-base font-bold border-b-2 border-transparent focus:border-red-800 outline-none transition-all" value={r.title} onChange={e => {
                              const updater = (prev: RankInfo[]) => prev.map(x => x.id === r.id ? {...x, title: e.target.value} : x);
                              if (g === Gender.MALE) setRanksMale(updater); else setRanksFemale(updater);
                            }} />
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-bold opacity-30">Min:</span>
                              <input type="number" className="w-20 text-xs border p-1 rounded" value={r.minPoints} onChange={e => {
                                const pts = parseInt(e.target.value) || 0;
                                const updater = (prev: RankInfo[]) => prev.map(x => x.id === r.id ? {...x, minPoints: pts} : x);
                                if (g === Gender.MALE) setRanksMale(updater); else setRanksFemale(updater);
                              }} />
                            </div>
                          </div>
                          <button onClick={() => {
                            if (confirm('Xóa cấp bậc này?')) {
                              const updater = (prev: RankInfo[]) => prev.filter(x => x.id !== r.id);
                              if (g === Gender.MALE) setRanksMale(updater); else setRanksFemale(updater);
                            }
                          }} className="text-gray-300 hover:text-red-600 transition-colors">🗑️</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection id="skills" icon="✨" title="Công Trạng" subtitle="Tùy chỉnh điểm cộng/trừ trong bảng feedback." collapsedSections={settingsCollapsed} onToggle={toggleSettingsSection}>
              <div className="flex justify-end">
                <button onClick={() => {
                  const type = activeTab;
                  const newSkill: Skill = { id: Date.now().toString(), name: "Skill mới", icon: "✨", points: type === 'positive' ? 1 : -1, type };
                  setSkills(prev => [...prev, newSkill]);
                }} className="bg-purple-800 text-white px-6 py-2 rounded-xl font-bold text-xs">+ Thêm Skill</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {['positive', 'negative'].map(type => (
                  <div key={type} className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-[0.2em] opacity-40 text-purple-800">{type === 'positive' ? 'Tích Cực' : 'Cần Cố Gắng'}</h4>
                    {skills.filter(s => s.type === type).map(sk => (
                      <div key={sk.id} className="bg-white p-4 rounded-2xl border flex items-center gap-3 group shadow-sm">
                        <input value={sk.icon} onChange={e => updateSkill(sk.id, 'icon', e.target.value)} className="w-10 h-10 text-xl text-center bg-gray-50 rounded-lg outline-none focus:ring-2 ring-purple-100" />
                        <input value={sk.name} onChange={e => updateSkill(sk.id, 'name', e.target.value)} className="flex-1 min-w-0 font-bold text-sm outline-none bg-transparent border-b border-transparent focus:border-purple-200" placeholder="Tên skill..." />
                        <input type="number" value={sk.points} onChange={e => updateSkill(sk.id, 'points', parseInt(e.target.value) || 0)} className="w-14 text-center font-black text-xs p-1 bg-gray-50 rounded outline-none focus:ring-2 ring-purple-100" />
                        <button onClick={() => { if(confirm('Xóa skill này?')) setSkills(prev => prev.filter(x => x.id !== sk.id)); }} className="text-gray-300 hover:text-red-500 transition-colors p-2">🗑️</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection id="petSkills" icon="⚡" title="Skills Pokémon" subtitle="Tùy chỉnh tuyệt chiêu Pokémon, giá mua và mô tả hiển thị trong hồ sơ học sinh." collapsedSections={settingsCollapsed} onToggle={toggleSettingsSection}>
              <div className="flex flex-wrap justify-end gap-3">
                <button onClick={addPetSkill} className="bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold text-xs">+ Thêm Pokémon Skill</button>
                <button onClick={() => { if(confirm('Khôi phục danh sách Pokémon skills mặc định?')) setPetSkills(DEFAULT_PET_SKILLS); }} className="bg-indigo-100 text-indigo-900 px-6 py-2 rounded-xl font-bold text-xs border border-indigo-200">Khôi Phục Mặc Định</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {petSkills.map(sk => (
                  <div key={sk.id} className="bg-white p-4 rounded-3xl border border-indigo-100 shadow-sm space-y-3">
                    <div className="grid grid-cols-[48px_1fr_86px_auto] gap-3 items-center">
                      <input value={sk.icon} onChange={e => updatePetSkill(sk.id, 'icon', e.target.value)} className="w-12 h-12 text-2xl text-center bg-indigo-50 rounded-2xl outline-none focus:ring-2 ring-indigo-100" />
                      <input value={sk.name} onChange={e => updatePetSkill(sk.id, 'name', e.target.value)} className="min-w-0 font-black text-sm border-b border-transparent focus:border-indigo-200 outline-none" />
                      <input type="number" value={sk.cost} onChange={e => updatePetSkill(sk.id, 'cost', parseInt(e.target.value) || 0)} className="w-full text-center font-black text-xs p-2 bg-indigo-50 rounded-xl outline-none focus:ring-2 ring-indigo-100" />
                      <button onClick={() => { if(confirm('Xóa Pokémon skill này?')) setPetSkills(prev => prev.filter(x => x.id !== sk.id)); }} className="text-gray-300 hover:text-red-500 transition-colors p-2">🗑️</button>
                    </div>
                    <textarea value={sk.description} onChange={e => updatePetSkill(sk.id, 'description', e.target.value)} className="w-full min-h-20 border border-indigo-100 rounded-2xl p-3 text-xs outline-none focus:ring-2 ring-indigo-100 resize-y" />
                  </div>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection id="pokemonReset" icon="🧬" title="Reset Pokémon" subtitle="Đưa toàn bộ Pokémon hiện có về Level 1 mà vẫn giữ Hào Quang, HP, kỹ năng và phụ kiện." className="bg-emerald-50 p-6 sm:p-10 rounded-[40px] border-4 border-emerald-200 text-left space-y-6 my-8" collapsedSections={settingsCollapsed} onToggle={toggleSettingsSection}>
              <div className="bg-white p-6 rounded-3xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="text-left space-y-1">
                  <h4 className="font-black text-emerald-950 text-sm uppercase">Reset Level Pokémon</h4>
                  <p className="text-xs text-emerald-800/80 font-sans">Tất cả Pokémon của học sinh sẽ trở về Level 1, XP/Mastery về 0.</p>
                </div>
                <button
                  onClick={handleResetPokemonLevels}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                >
                  Reset Level
                </button>
              </div>
            </SettingsSection>

            <SettingsSection id="ludo" icon="🐴" title="Customize Cá Ngựa" subtitle="Thêm, chỉnh sửa hoặc xóa ô đặc biệt trên bàn cờ 0-49." className="bg-amber-50 p-6 sm:p-10 rounded-[40px] border-4 border-amber-300 text-left space-y-6 my-8" collapsedSections={settingsCollapsed} onToggle={toggleSettingsSection}>
              <div className="flex justify-end">
                <button onClick={() => setCustomLudoTiles(DEFAULT_LUDO_TILES)} className="bg-amber-200 hover:bg-amber-300 text-amber-950 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all">
                  Khôi Phục Mặc Định 🔄
                </button>
              </div>
              <div className="bg-white p-5 rounded-3xl border-2 border-amber-200 space-y-4">
                <h4 className="font-black text-amber-950 text-sm uppercase">{editingTileIndex !== null ? `Chỉnh Sửa Ô Số ${editingTileIndex}` : 'Thêm/Sửa Ô Đặc Biệt Mới'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="number" min={0} max={49} value={tileFormIndex} onChange={e => setTileFormIndex(parseInt(e.target.value) || 0)} className="w-full border-2 border-amber-200 p-2.5 rounded-xl font-bold text-xs bg-amber-50/50" />
                  <input type="text" placeholder="Tên ô đặc biệt" value={tileFormTitle} onChange={e => setTileFormTitle(e.target.value)} className="w-full border-2 border-amber-200 p-2.5 rounded-xl font-bold text-xs bg-amber-50/50" />
                  <input type="text" placeholder="🚀" value={tileFormIcon} onChange={e => setTileFormIcon(e.target.value)} className="w-full border-2 border-amber-200 p-2.5 rounded-xl font-bold text-xs bg-amber-50/50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select value={tileFormType} onChange={e => setTileFormType(e.target.value as any)} className="w-full border-2 border-amber-200 p-2.5 rounded-xl font-bold text-xs bg-amber-50/50">
                    <option value="portal">🌀 Dịch Chuyển Tiến Bước</option>
                    <option value="curse">📜 Bùa Chú Đẩy Lùi</option>
                    <option value="monster">👹 Quái Vật Chặn Đường</option>
                    <option value="treasure">💎 Rương Báu Cộng Điểm</option>
                    <option value="restart">🌀 Lùi Về Xuất Phát</option>
                  </select>
                  <input type="number" value={tileFormValue} onChange={e => setTileFormValue(parseInt(e.target.value) || 0)} className="w-full border-2 border-amber-200 p-2.5 rounded-xl font-bold text-xs bg-amber-50/50" />
                </div>
                <input type="text" placeholder="Mô tả khi dẫm vào ô..." value={tileFormDesc} onChange={e => setTileFormDesc(e.target.value)} className="w-full border-2 border-amber-200 p-2.5 rounded-xl font-bold text-xs bg-amber-50/50" />
                <div className="flex gap-2">
                  <button onClick={handleSaveCustomTile} className="bg-amber-600 hover:bg-amber-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow">{editingTileIndex !== null ? 'Cập Nhật Ô' : 'Lưu Ô Đặc Biệt'}</button>
                  {editingTileIndex !== null && <button onClick={resetTileForm} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2.5 rounded-xl text-xs uppercase">Hủy</button>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {Object.values(customLudoTiles).sort((a, b) => a.tileIndex - b.tileIndex).map(tile => (
                  <div key={tile.tileIndex} className="bg-white p-3 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">{tile.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-amber-950 truncate">Ô {tile.tileIndex}: {tile.title}</p>
                        <p className="text-[9px] text-amber-800 truncate">{tile.desc}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editCustomTile(tile)} className="text-amber-700 hover:bg-amber-100 p-1 rounded font-bold text-xs">✏️</button>
                      <button onClick={() => deleteCustomTile(tile.tileIndex)} className="text-red-600 hover:bg-red-100 p-1 rounded font-bold text-xs">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection id="luckyWheel" icon="🎡" title="Customize Vòng Quay May Mắn" subtitle="Tùy chỉnh phần thưởng, hình phạt, HP, Pokémon skill và lượt lắc Cá Ngựa." className="bg-fuchsia-50 p-6 sm:p-10 rounded-[40px] border-4 border-fuchsia-200 text-left space-y-6 my-8" collapsedSections={settingsCollapsed} onToggle={toggleSettingsSection}>
              <div className="flex flex-wrap justify-end gap-3">
                <button onClick={() => addLuckyWheelReward('points')} className="bg-fuchsia-700 hover:bg-fuchsia-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all">
                  + Thêm Mục Quay
                </button>
                <button onClick={() => addLuckyWheelReward('ludo_rolls')} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all">
                  + Thêm Lượt Cá Ngựa
                </button>
                <button onClick={() => { if(confirm('Khôi phục danh sách Vòng quay may mắn mặc định?')) setLuckyWheelRewards(DEFAULT_LUCKY_WHEEL_REWARDS); }} className="bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-950 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all border border-fuchsia-200">
                  Khôi Phục Mặc Định
                </button>
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                {luckyWheelRewards.map(reward => {
                  const needsAmount = reward.type === 'points' || reward.type === 'hp' || reward.type === 'ludo_rolls';
                  return (
                    <div key={reward.id} className="bg-white p-4 rounded-3xl border border-fuchsia-100 shadow-sm space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-[56px_1fr_150px_100px_80px_auto] gap-3 items-center">
                        <input value={reward.icon} onChange={e => updateLuckyWheelReward(reward.id, 'icon', e.target.value)} className="w-14 h-14 text-2xl text-center bg-fuchsia-50 rounded-2xl outline-none focus:ring-2 ring-fuchsia-100" />
                        <input value={reward.label} onChange={e => updateLuckyWheelReward(reward.id, 'label', e.target.value)} className="min-w-0 font-black text-sm border-b border-transparent focus:border-fuchsia-200 outline-none" />
                        <select value={reward.type} onChange={e => updateLuckyWheelReward(reward.id, 'type', e.target.value as LuckyWheelRewardType)} className="w-full bg-fuchsia-50 border border-fuchsia-100 rounded-xl p-2.5 text-xs font-black outline-none">
                          <option value="points">Điểm</option>
                          <option value="pokemon">Tặng Pokémon</option>
                          <option value="skill">Tặng Skill Pokémon</option>
                          <option value="hp">HP Pokémon</option>
                          <option value="ludo_rolls">Lượt Cá Ngựa</option>
                        </select>
                        <input
                          type="number"
                          min={reward.type === 'ludo_rolls' ? 1 : undefined}
                          max={reward.type === 'ludo_rolls' ? 5 : undefined}
                          disabled={!needsAmount}
                          value={reward.amount ?? 0}
                          onChange={e => {
                            const raw = parseInt(e.target.value) || 0;
                            const value = reward.type === 'ludo_rolls' ? Math.min(5, Math.max(1, raw)) : raw;
                            updateLuckyWheelReward(reward.id, 'amount', value);
                          }}
                          className="w-full text-center font-black text-xs p-2.5 bg-fuchsia-50 rounded-xl outline-none focus:ring-2 ring-fuchsia-100 disabled:opacity-30"
                        />
                        <input type="color" value={reward.color} onChange={e => updateLuckyWheelReward(reward.id, 'color', e.target.value)} className="w-20 h-11 bg-white border border-fuchsia-100 rounded-xl p-1" />
                        <button onClick={() => { if(confirm('Xóa mục vòng quay này?')) setLuckyWheelRewards(prev => prev.filter(x => x.id !== reward.id)); }} className="text-gray-300 hover:text-red-500 transition-colors p-2">🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SettingsSection>

            <SettingsSection id="data" icon="☁️" title="Dữ Liệu Quốc Gia" subtitle="Import/export danh sách học sinh và JSON backup toàn bộ hệ thống." className="bg-red-50 p-6 sm:p-12 rounded-[50px] border-4 border-red-100 text-center space-y-8" collapsedSections={settingsCollapsed} onToggle={toggleSettingsSection}>
              <div className="bg-white p-6 rounded-3xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left space-y-1">
                  <h4 className="font-bold text-red-950 text-sm">Danh Sách Học Sĩ (CSV / Excel)</h4>
                  <p className="text-xs text-red-800/80 font-sans">Nhập danh sách học sinh từ bảng CSV.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-4 shrink-0 font-sans">
                  <button onClick={() => {
                    const BOM = '\uFEFF';
                    const csv = "Họ tên, Lớp, Số điểm hiện tại, Giới tính (Nam/Nữ)\nNguyễn Văn A, 10A1, 100, Nam\nTrần Thị B, 10A1, 80, Nữ";
                    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.setAttribute("download", "mau_csv_cung_dinh.csv");
                    link.click();
                  }} className="bg-white border-2 border-red-800 text-red-800 p-3 px-6 rounded-2xl font-bold hover:bg-red-800 hover:text-white transition-all text-xs shadow-md">Mẫu Excel 📥</button>
                  <label className="bg-red-800 hover:bg-red-950 text-white p-3 px-6 rounded-2xl font-bold cursor-pointer transition-all text-xs shadow-md">
                    Tải Lên Danh Sách 📤
                    <input type="file" accept=".csv" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const text = event.target?.result as string;
                        const lines = text.split('\n').filter(l => l.trim());
                        const newItems: Student[] = lines.slice(1).map(line => {
                          const [name, cls, pts, gender] = line.split(',').map(v => v.trim());
                          return { id: Math.random().toString(36).substr(2, 9), name: name || 'Ẩn danh', className: cls || 'Học sĩ', points: parseInt(pts) || 0, gender: gender === 'Nữ' ? Gender.FEMALE : Gender.MALE, history: [], egg: createEgg('normal') };
                        });
                        setStudents(prev => [...prev, ...newItems]);
                        alert("Đã tiếp nhận!");
                      };
                      reader.readAsText(file);
                    }} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left space-y-1">
                  <h4 className="font-bold text-red-950 text-sm">Sao Lưu Toàn Bộ Hệ Thống (JSON Backup)</h4>
                  <p className="text-xs text-red-800/80 font-sans">Bao gồm học sinh, điểm, lịch sử, linh thú, công trạng, Pokémon skills, âm thanh và cấp bậc.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-4 shrink-0 font-sans">
                  <button onClick={handleExportJSON} className="bg-[#D4AF37] hover:bg-amber-600 text-white p-3 px-6 rounded-2xl font-bold transition-all text-xs shadow-md">Export JSON Backup 📦</button>
                  <label className="bg-teal-700 hover:bg-teal-900 text-white p-3 px-6 rounded-2xl font-bold cursor-pointer transition-all text-xs shadow-md">
                    Import JSON Restore 📥
                    <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                  </label>
                </div>
              </div>
            </SettingsSection>
          </div>
        )}
      </main>

      {/* MODAL: SKILL POINT BOARD */}
      {showSkillModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl rounded-3xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-300 shadow-2xl">
            
            {/* Sidebar Profile details from screenshot request */}
            <div className="bg-gray-50 border-r w-full md:w-80 shrink-0 p-8 flex flex-col items-center">
              {sidebarData ? (
                <>
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="relative">
                      <img 
                        src={sidebarData.student.customAvatar || sidebarData.rank.avatar || 'https://api.dicebear.com/7.x/bottts/svg'} 
                        className="w-28 h-28 rounded-full border-4 border-white shadow-xl object-cover" 
                      />
                      <div className="absolute top-0 right-0 bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md text-xs">
                        {sidebarData.student.points}
                      </div>
                    </div>

                    {sidebarData.student.pet && (
                      <div className="flex flex-col items-center bg-amber-50 p-2 rounded-2xl border border-amber-200 shadow-sm relative">
                        <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white shadow">
                          ❤️ {sidebarData.student.pet.hp ?? 100}/100
                        </div>
                        <img 
                          referrerPolicy="no-referrer"
                          src={getPokemonArtworkUrl(sidebarData.student.pet)}
	                          onError={event => handlePokemonArtworkError(event, sidebarData.student.pet)}
                          className="w-20 h-20 object-contain drop-shadow"
                          alt={getPokemonDisplayName(sidebarData.student.pet)}
                        />
                        <span className="text-[9px] font-black text-amber-900 truncate max-w-[80px]">{getPokemonDisplayName(sidebarData.student.pet)}</span>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${(sidebarData.student.pet.hp ?? 100) > 50 ? 'bg-emerald-500' : (sidebarData.student.pet.hp ?? 100) > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, sidebarData.student.pet.hp ?? 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <h3 className="text-2xl font-bold text-gray-800 mb-1 text-center">{sidebarData.student.name}</h3>
                  <p className="text-xs font-black uppercase text-gray-400 mb-4">{sidebarData.student.className}</p>
                  
                  <div className="w-full space-y-4 pt-6 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-gray-400">Level Hiện Tại</p>
                      <p className={`text-sm font-bold uppercase tracking-widest ${sidebarData.rank.color}`}>{sidebarData.rank.title}</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-2xl text-center border border-green-200">
                      <p className="text-[10px] font-black uppercase text-green-700">Điểm lên Level</p>
                      <p className="text-xl font-black text-green-800">+{sidebarData.pointsToNext}</p>
                    </div>
                    <div className="bg-red-100 p-4 rounded-2xl text-center border border-red-200">
                      <p className="text-[10px] font-black uppercase text-red-700">Điểm xuống Level</p>
                      <p className="text-xl font-black text-red-800">-{sidebarData.pointsToDemote}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 opacity-20 italic">Chọn 1 học sĩ để xem chi tiết thăng hạng...</div>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                <div className="flex-1 flex items-center gap-4">
                  <h2 className="text-xl font-bold text-gray-800 shrink-0">
                    Feedback for {selectedStudentIds.length === 1 ? sidebarData?.student.name : `${selectedStudentIds.length} students`}
                  </h2>
                  <div className="flex items-center gap-2 bg-white border p-1 pl-3 rounded-full flex-1 max-w-[280px]">
                    <input 
                      type="number" 
                      placeholder="Gõ điểm..." 
                      className="bg-transparent text-sm font-bold flex-1 outline-none" 
                      value={manualPoints} 
                      onChange={e => setManualPoints(e.target.value)}
                    />
                    <button 
                      onClick={() => handleUpdatePoints(selectedStudentIds, parseInt(manualPoints), "Điều chỉnh thủ công", feedbackSource)}
                      className="bg-purple-600 text-white text-[10px] px-4 py-2 rounded-full font-bold hover:bg-purple-700 transition-all uppercase"
                    >
                      Lưu điểm
                    </button>
                  </div>
                </div>
                <button onClick={() => { setFeedbackSource('manual'); setShowSkillModal(false); }} className="ml-4 text-4xl text-gray-300 hover:text-red-800 transition-colors">&times;</button>
              </div>

              <div className="flex border-b px-6 bg-white shrink-0 overflow-x-auto">
                <button onClick={() => setActiveTab('positive')} className={`px-8 py-5 font-bold transition-all whitespace-nowrap ${activeTab === 'positive' ? 'text-purple-600 border-b-4 border-purple-600' : 'opacity-40 hover:opacity-100'}`}>Positive</button>
                <button onClick={() => setActiveTab('negative')} className={`px-8 py-5 font-bold transition-all whitespace-nowrap ${activeTab === 'negative' ? 'text-purple-600 border-b-4 border-purple-600' : 'opacity-40 hover:opacity-100'}`}>Needs work</button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pb-20">
                  {skills.filter(s => s.type === (activeTab === 'positive' ? 'positive' : 'negative')).map(sk => (
                    <button 
                      key={sk.id} 
                      onClick={() => handleUpdatePoints(selectedStudentIds, sk.points, sk.name, feedbackSource)} 
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group relative aspect-square"
                    >
                      <div className="text-5xl group-hover:scale-125 transition-transform duration-300">{sk.icon}</div>
                      <span className="text-xs font-bold text-center text-gray-600 uppercase tracking-tight leading-tight px-2">{sk.name}</span>
                      <span className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${sk.points > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {sk.points > 0 ? '+' : ''}{sk.points}
                      </span>
                    </button>
                  ))}
                  <button onClick={() => setCurrentScreen('settings')} className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed border-gray-200 opacity-40 hover:opacity-100 transition-all aspect-square">
                     <div className="w-12 h-12 rounded-full border-2 border-purple-600 flex items-center justify-center text-3xl text-purple-600">+</div>
                     <span className="text-[10px] font-bold uppercase text-purple-600">Add skills</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RANDOM */}
      {showRandomModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowRandomModal(false); }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto"
        >
          <div className="bg-white p-6 sm:p-8 rounded-[40px] w-full max-w-2xl text-center shadow-2xl animate-in zoom-in duration-300 relative border-4 border-red-800 my-auto">
            <button 
              onClick={() => setShowRandomModal(false)} 
              className="absolute top-5 right-5 text-3xl text-gray-400 hover:text-red-800 transition-colors z-20"
            >
              &times;
            </button>

            {/* MODE SWITCHER TABS */}
            <div className="flex items-center justify-center gap-2 mb-6 bg-red-50 p-1.5 rounded-full border border-red-200 w-fit mx-auto">
              <button 
                onClick={() => handleRandom('solo')} 
                className={`px-5 py-2 rounded-full font-bold text-xs transition-all uppercase tracking-wider ${randomMode === 'solo' ? 'bg-red-800 text-white shadow-md' : 'text-red-900 hover:bg-red-100'}`}
              >
                👤 Chế độ Solo
              </button>
              <button 
                onClick={() => handleRandom('battle')} 
                className={`px-5 py-2 rounded-full font-bold text-xs transition-all uppercase tracking-wider ${randomMode === 'battle' ? 'bg-red-800 text-white shadow-md' : 'text-red-900 hover:bg-red-100'}`}
              >
                ⚔️ Chế độ Battle
              </button>
            </div>

            {/* SOLO MODE */}
            {randomMode === 'solo' && randomStudent && (
              <>
                <h2 className="text-2xl font-royal text-red-800 mb-6 uppercase tracking-wider">Kén Chọn Ngẫu Nhiên (Solo)</h2>

                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="relative">
                    <img 
                      src={randomStudent.customAvatar || getRank(randomStudent.points, randomStudent.gender).avatar || 'https://api.dicebear.com/7.x/bottts/svg'} 
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-red-800 shadow-xl object-cover" 
                    />
                    <div className="absolute top-0 right-0 bg-red-800 text-white w-9 h-9 rounded-full flex items-center justify-center font-bold border-2 border-white shadow text-sm">
                      {randomStudent.points}
                    </div>
                  </div>

                  <PokemonMiniStatus
                    pet={randomStudent.pet}
                    progress={randomStudent.pokemonProgress}
                    tone="amber"
                    className="w-64 max-w-[58vw]"
                  />
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-800">{randomStudent.name}</h3>
                  <p className="opacity-50 font-black uppercase tracking-widest text-xs mt-1">{randomStudent.className}</p>
                </div>

                {/* SKILLS BOUGHT FOR POKEMON DISPLAY & USE DIRECTLY */}
                {randomStudent.pet?.skills && randomStudent.pet.skills.length > 0 && (
                  <div className="mb-6 p-4 bg-indigo-50/60 rounded-3xl border border-indigo-100 text-left">
                    <p className="text-[10px] font-black uppercase text-indigo-900 tracking-wider mb-2">⚡ Tuyệt Chiêu Pokémon Có Thể Kích Hoạt (Tối Đa 2 Lần):</p>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                      {randomStudent.pet.skills.map(skId => {
                        const sk = petSkills.find(x => x.id === skId);
                        if (!sk) return null;
                        const currentUses = randomStudent.pet?.skillUses?.[skId] || 0;
                        const remainingUses = Math.max(0, 2 - currentUses);
                        return (
                          <div key={skId} className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-indigo-200 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xl">{sk.icon}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate">{sk.name}</p>
                                <span className="text-[9px] text-indigo-600 font-semibold">Còn {remainingUses}/2 lượt</span>
                              </div>
                            </div>
                            <button
                              disabled={remainingUses <= 0}
                              onClick={() => {
                                handleUsePetSkill(randomStudent.id, skId, sk.name);
                                const updated = students.find(s => s.id === randomStudent.id);
                                if (updated) setRandomStudent(updated);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-[9px] px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0"
                            >
                              Sử Dụng
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => { setFeedbackSource('solo'); setShowSkillModal(true); }} 
                    className="flex-1 bg-red-800 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg hover:bg-red-900 uppercase tracking-wider"
                  >
                    Ban Thưởng / Phạt
                  </button>
                  <button 
                    onClick={() => handleRandom()} 
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <span>🎲</span> Random Tiếp
                  </button>
                </div>
                <button 
                  onClick={() => setShowRandomModal(false)} 
                  className="mt-3 text-gray-400 font-bold py-1 uppercase text-xs hover:text-gray-600"
                >
                  Đóng lại
                </button>
              </>
            )}

            {/* BATTLE MODE */}
            {randomMode === 'battle' && battleStudentA && battleStudentB && (
              <>
                <h2 className="text-2xl font-royal text-red-800 mb-2 uppercase tracking-wider">⚡ Trận Quyết Đấu (Battle) ⚡</h2>
                <p className="text-xs text-gray-500 mb-6 italic">Nhập điểm hoặc bấm nút cộng điểm cho mỗi học sinh. Người thắng được cộng HP theo điểm chênh lệch, người thua bị trừ HP chênh lệch!</p>

                {battleResultSummary ? (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border-4 border-amber-400 space-y-6 shadow-xl animate-in zoom-in-95 duration-200 text-left">
                    <div className="text-center space-y-2">
                      <span className="text-4xl">🏆</span>
                      <h3 className="text-2xl font-black text-amber-950 uppercase tracking-wide">
                        {battleResultSummary.winner ? `Chiến Thắng: ${battleResultSummary.winner.name}` : 'Trận Đấu Hòa!'}
                      </h3>
                      <p className="text-sm font-bold text-amber-900 whitespace-pre-line bg-white/90 p-4 rounded-2xl border border-amber-200 shadow-xs">
                        {battleResultSummary.resultMsg}
                      </p>
                    </div>

                    {/* Ordered Cá Ngựa turns after Battle */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-amber-300 space-y-3">
                      <p className="text-xs font-black uppercase text-amber-950 tracking-wider text-center">
                        🎲 Thứ Tự Lắc Cá Ngựa Sau Battle:
                      </p>
                      {battleResultSummary.ludoTurns.length > 0 ? (
                        <>
                          <div className="space-y-2">
                            {battleResultSummary.ludoTurns.map((turn, index) => {
                              const turnStudent = [battleResultSummary.studentA, battleResultSummary.studentB].find(s => s.id === turn.studentId);
                              if (!turnStudent) return null;
                              return (
                                <div key={`${turn.studentId}-${index}`} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                  <span className="text-xs font-black text-amber-950">{index + 1}. {turnStudent.name}</span>
                                  <span className="text-[10px] font-black uppercase text-amber-700">
                                    {turn.role === 'winner' ? 'Thắng - lắc trước' : turn.role === 'loser' ? 'Thua - lắc sau' : 'Hòa'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => {
                              setShowRandomModal(false);
                              openBattleLudoTurns(battleResultSummary.ludoTurns);
                            }}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all border-2 border-amber-400"
                          >
                            <span>🎲</span> Mở Cá Ngựa Theo Thứ Tự
                          </button>
                        </>
                      ) : (
                        <p className="rounded-xl bg-rose-50 p-3 text-center text-xs font-black text-rose-700">
                          Không có lượt Cá Ngựa hợp lệ vì điểm Battle bị âm.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleRandom('battle')} 
                        className="flex-1 bg-red-800 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-red-900 shadow"
                      >
                        ⚔️ Quyết Đấu Trận Mới
                      </button>
                      <button 
                        onClick={() => setShowRandomModal(false)} 
                        className="px-5 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-xs uppercase hover:bg-gray-300"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      {/* STUDENT A CARD */}
                      <div className="bg-amber-50/80 p-4 rounded-3xl border-2 border-amber-300 flex flex-col items-center">
                        <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                          Học Sĩ A
                        </span>
                        <img 
                          src={battleStudentA.customAvatar || getRank(battleStudentA.points, battleStudentA.gender).avatar || 'https://api.dicebear.com/7.x/bottts/svg'} 
                          className="w-20 h-20 rounded-full border-4 border-amber-400 object-cover shadow-md mb-2" 
                        />
                        <h4 className="font-extrabold text-gray-800 text-base">{battleStudentA.name}</h4>
                        <p className="text-[10px] text-gray-500 font-bold mb-2">Hào quang: {battleStudentA.points}đ</p>

                        <PokemonMiniStatus
                          pet={battleStudentA.pet}
                          progress={battleStudentA.pokemonProgress}
                          tone="amber"
                          showImage
                          streakLabel="Battle"
                          streakValue={battleStudentA.pokemonProgress?.battleWinStreak || 0}
                          className="mb-3 w-full"
                        />

                        <div className="w-full">
                          <p className="text-[10px] font-black uppercase text-amber-800 mb-1">Điểm Battle Vòng Này:</p>
                          <div className="flex items-center justify-center gap-1 mb-2">
                            {[-1, +1, +2, +3, +5].map(pts => (
                              <button
                                key={pts}
                                onClick={() => setBattleScoreA(prev => Math.max(-10, prev + pts))}
                                className={`px-2 py-1 rounded-lg text-xs font-black ${pts > 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
                              >
                                {pts > 0 ? `+${pts}` : pts}
                              </button>
                            ))}
                          </div>
                          <input 
                            type="number"
                            value={battleScoreA}
                            onChange={e => setBattleScoreA(parseInt(e.target.value) || 0)}
                            className="w-20 mx-auto text-center font-black text-lg border-2 border-amber-400 rounded-xl py-1 bg-white"
                          />
                        </div>
                      </div>

                      {/* STUDENT B CARD */}
                      <div className="bg-purple-50/80 p-4 rounded-3xl border-2 border-purple-300 flex flex-col items-center">
                        <span className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                          Học Sĩ B
                        </span>
                        <img 
                          src={battleStudentB.customAvatar || getRank(battleStudentB.points, battleStudentB.gender).avatar || 'https://api.dicebear.com/7.x/bottts/svg'} 
                          className="w-20 h-20 rounded-full border-4 border-purple-400 object-cover shadow-md mb-2" 
                        />
                        <h4 className="font-extrabold text-gray-800 text-base">{battleStudentB.name}</h4>
                        <p className="text-[10px] text-gray-500 font-bold mb-2">Hào quang: {battleStudentB.points}đ</p>

                        <PokemonMiniStatus
                          pet={battleStudentB.pet}
                          progress={battleStudentB.pokemonProgress}
                          tone="purple"
                          showImage
                          streakLabel="Battle"
                          streakValue={battleStudentB.pokemonProgress?.battleWinStreak || 0}
                          className="mb-3 w-full"
                        />

                        <div className="w-full">
                          <p className="text-[10px] font-black uppercase text-purple-800 mb-1">Điểm Battle Vòng Này:</p>
                          <div className="flex items-center justify-center gap-1 mb-2">
                            {[-1, +1, +2, +3, +5].map(pts => (
                              <button
                                key={pts}
                                onClick={() => setBattleScoreB(prev => Math.max(-10, prev + pts))}
                                className={`px-2 py-1 rounded-lg text-xs font-black ${pts > 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
                              >
                                {pts > 0 ? `+${pts}` : pts}
                              </button>
                            ))}
                          </div>
                          <input 
                            type="number"
                            value={battleScoreB}
                            onChange={e => setBattleScoreB(parseInt(e.target.value) || 0)}
                            className="w-20 mx-auto text-center font-black text-lg border-2 border-purple-400 rounded-xl py-1 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={handleResolveBattle} 
                        className="flex-1 bg-red-800 text-white py-3.5 rounded-2xl font-black text-sm shadow-xl hover:bg-red-900 uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <span>⚔️</span> Chốt Trận & Trao Thưởng
                      </button>
                      <button 
                        onClick={() => handleRandom()} 
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <span>🎲</span> Random Tiếp
                      </button>
                    </div>
                  </>
                )}
                <button 
                  onClick={() => setShowRandomModal(false)} 
                  className="mt-3 text-gray-400 font-bold py-1 uppercase text-xs hover:text-gray-600"
                >
                  Đóng lại
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: LUCKY WHEEL */}
      {showLuckyWheelModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLuckyWheelSpinning) {
              setLuckyWheelMode('normal');
              setShowLuckyWheelModal(false);
            }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto"
        >
          <div className="bg-[#17051f] w-full max-w-5xl rounded-[40px] shadow-[0_0_80px_rgba(217,70,239,0.55)] overflow-hidden animate-in zoom-in duration-300 relative border-4 border-fuchsia-500 my-auto">
            <button
              onClick={() => {
                if (!isLuckyWheelSpinning) {
                  setLuckyWheelMode('normal');
                  setShowLuckyWheelModal(false);
                }
              }}
              disabled={isLuckyWheelSpinning}
              className="absolute top-5 right-5 text-3xl text-white/70 hover:text-white disabled:opacity-30 transition-colors z-20"
            >
              &times;
            </button>

            <div className="bg-gradient-to-r from-red-950 via-fuchsia-900 to-purple-950 text-white p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_30%,rgba(250,204,21,0.45),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.35),transparent_24%),radial-gradient(circle_at_50%_90%,rgba(217,70,239,0.45),transparent_30%)]" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-3xl bg-white/15 border border-white/30 flex items-center justify-center text-4xl shadow-inner">
                  🎡
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-royal uppercase tracking-wider text-amber-200">Vòng Quay May Mắn</h2>
                  <p className="text-xs sm:text-sm text-fuchsia-100 font-bold mt-1">
                    {isLuckyWheelSpinning
                      ? 'Đang quay trong 10 giây...'
                      : luckyWheelMode === 'ludo-finish'
                        ? 'Cán đích Cá Ngựa: 60% quà tốt, 40% quà thử thách.'
                        : 'Bấm quay để bắt đầu chọn học sĩ và phần thưởng ngẫu nhiên.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 p-6 sm:p-8 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.22),transparent_34%),linear-gradient(135deg,#3b0764,#701a75_45%,#111827)]">
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="relative w-[min(82vw,380px)] aspect-square">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 w-0 h-0 border-l-[16px] border-r-[16px] border-t-[34px] border-l-transparent border-r-transparent border-t-red-800 drop-shadow-lg" />
                  <div
                    ref={luckyWheelRef}
                    className="absolute inset-0 rounded-full border-[10px] border-amber-300 shadow-[0_0_45px_rgba(250,204,21,0.85),0_0_90px_rgba(217,70,239,0.5)] overflow-hidden"
                    style={{
                      background: luckyWheelBackground,
                      transform: `rotate(${luckyWheelRotation}deg)`
                    }}
                  >
                    {(luckyWheelDisplayRewards.length > 0 ? luckyWheelDisplayRewards : luckyWheelRewards).map((reward, idx, arr) => {
                      const angle = idx * (360 / arr.length) + (180 / arr.length);
                      const label = reward.type === 'points' || reward.type === 'hp'
                        ? `${reward.icon}${reward.amount && reward.amount > 0 ? '+' : ''}${reward.amount}`
                        : reward.type === 'ludo_rolls'
                          ? `${reward.icon}x${Math.min(5, Math.max(1, reward.amount || 1))}`
                        : reward.icon;
                      return (
                        <span
                          key={reward.id}
                          className="absolute left-1/2 top-1/2 text-sm sm:text-base font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none"
                          style={{
                            transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(-1 * min(34vw, 150px))) rotate(${-angle}deg)`
                          }}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                  <div className="absolute inset-[35%] rounded-full bg-white border-8 border-amber-300 shadow-xl flex items-center justify-center text-5xl z-20">
                    {isLuckyWheelSpinning ? '🎲' : (luckyWheelResult?.reward.icon || luckyWheelPendingResult?.reward.icon || '🎡')}
                  </div>
                  <div className="absolute -inset-6 rounded-full border border-amber-300/30 shadow-[0_0_60px_rgba(250,204,21,0.55)] pointer-events-none" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-xl text-xs font-black uppercase tracking-wide">
                  <div className="bg-emerald-100 text-emerald-800 rounded-2xl px-3 py-2 text-center">+ Điểm tối đa 10</div>
                  <div className="bg-red-100 text-red-800 rounded-2xl px-3 py-2 text-center">- Điểm tối đa 10</div>
                  <div className="bg-amber-100 text-amber-900 rounded-2xl px-3 py-2 text-center">Tặng Pokemon</div>
                  <div className="bg-purple-100 text-purple-900 rounded-2xl px-3 py-2 text-center">Tặng Skill</div>
                  <div className="bg-teal-100 text-teal-900 rounded-2xl px-3 py-2 text-center">Cộng HP</div>
                  <div className="bg-blue-100 text-blue-900 rounded-2xl px-3 py-2 text-center">Lượt Cá Ngựa</div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-white/95 rounded-3xl border border-fuchsia-100 p-5 shadow-[0_0_24px_rgba(255,255,255,0.22)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-900 mb-3">Danh sách được quay</p>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar pr-1">
                    {luckyWheelCandidateIds.map(id => {
                      const candidate = students.find(s => s.id === id);
                      if (!candidate) return null;
                      return (
                        <span key={id} className="bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-950 px-3 py-1.5 rounded-full text-xs font-black">
                          {candidate.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-[32px] border-2 border-amber-200 p-6 min-h-[360px] flex flex-col items-center justify-center text-center shadow-[0_0_36px_rgba(250,204,21,0.35)]">
                  {!isLuckyWheelSpinning && !luckyWheelResult && (
                    <div className="w-full space-y-5 animate-in zoom-in-95 duration-300">
                      <div className="text-6xl drop-shadow">🎡</div>
                      <h3 className="text-3xl font-royal text-fuchsia-900 uppercase">Sẵn sàng quay</h3>
                      <p className="text-sm font-bold text-gray-500">
                        {luckyWheelMode === 'ludo-finish'
                          ? 'Lượt cán đích ưu tiên 60% phần quà tốt và 40% phần quà không tốt.'
                          : 'Kết quả sẽ được random sau khi bấm nút bên dưới.'}
                      </p>
                      <button
                        onClick={startLuckyWheelSpin}
                        className="w-full bg-gradient-to-r from-amber-500 via-fuchsia-600 to-cyan-500 hover:brightness-110 text-white py-4 rounded-2xl font-black uppercase tracking-wider shadow-[0_0_28px_rgba(217,70,239,0.6)] transition-all"
                      >
                        Bắt Đầu Quay
                      </button>
                    </div>
                  )}

                  {isLuckyWheelSpinning && (
                    <div className="space-y-4 animate-pulse">
                      <div className="text-6xl">🎡</div>
                      <h3 className="text-2xl font-royal text-fuchsia-900 uppercase">Đang quay...</h3>
                      <p className="text-sm font-bold text-gray-500">Bánh xe đang tăng tốc rồi chậm lại trong 3 giây cuối.</p>
                    </div>
                  )}

                  {!isLuckyWheelSpinning && luckyWheelResult && (
                    <div className="w-full space-y-5 animate-in zoom-in-95 duration-300">
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={luckyWheelResult.student.customAvatar || getRank(luckyWheelResult.student.points, luckyWheelResult.student.gender).avatar || 'https://api.dicebear.com/7.x/bottts/svg'}
                          className="w-24 h-24 rounded-full border-4 border-fuchsia-700 object-cover shadow-xl"
                        />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-700">Học sĩ trúng thưởng</p>
                          <h3 className="text-3xl font-black text-gray-900">{luckyWheelResult.student.name}</h3>
                          <p className="text-xs font-bold text-gray-400 uppercase">{luckyWheelResult.student.className}</p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-50 to-fuchsia-50 rounded-3xl border border-amber-200 p-5">
                        <div className="text-5xl mb-2">{luckyWheelResult.reward.icon}</div>
                        <p className="text-2xl font-black text-fuchsia-950">{luckyWheelResult.reward.label}</p>
                        <p className="mt-2 text-base font-black text-gray-700">{luckyWheelResult.message}</p>

                        {luckyWheelResult.pokemon && (
                          <img
                            referrerPolicy="no-referrer"
                            src={getPokemonArtworkUrl(luckyWheelResult.pokemon)}
	                            onError={event => handlePokemonArtworkError(event, luckyWheelResult.pokemon)}
                            className={`w-28 h-28 object-contain mx-auto mt-3 drop-shadow ${luckyWheelResult.pokemon.isShiny ? 'rounded-3xl bg-amber-100 ring-4 ring-amber-300' : ''}`}
                            alt={getPokemonDisplayName(luckyWheelResult.pokemon)}
                          />
                        )}
                        {luckyWheelResult.pokemon?.isShiny && (
                          <span className="mt-2 inline-flex rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800">
                            ✨ Shiny
                          </span>
                        )}

                        {luckyWheelResult.skill && (
                          <div className="mt-3 inline-flex items-center gap-2 bg-white border border-purple-200 rounded-2xl px-4 py-2 text-purple-950 font-black text-sm">
                            <span className="text-2xl">{luckyWheelResult.skill.icon}</span>
                            <span>{luckyWheelResult.skill.name}</span>
                          </div>
                        )}

                        {luckyWheelResult.reward.type === 'ludo_rolls' && (
                          <button
                            onClick={() => {
                              setLuckyWheelMode('normal');
                              setShowLuckyWheelModal(false);
                              openLudoForClass(luckyWheelResult.student.className, luckyWheelResult.student);
                            }}
                            className="mt-4 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow"
                          >
                            Mở Đường Đua Cá Ngựa
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setLuckyWheelMode('normal');
                          setShowLuckyWheelModal(false);
                        }}
                        className="w-full bg-fuchsia-800 hover:bg-fuchsia-900 text-white py-3.5 rounded-2xl font-black uppercase tracking-wider shadow-lg transition-all"
                      >
                        Hoàn tất
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GROUP MAKER */}
      {showGroupModal && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden animate-in fade-in duration-300">
           <div className="bg-red-800 text-white p-6 flex justify-between items-center shadow-lg shrink-0">
             <div className="flex items-center gap-3">
               <span className="text-3xl">👥</span>
               <h2 className="text-2xl font-royal uppercase tracking-wider">Chia Nhóm Tự Động</h2>
             </div>
             <button onClick={() => setShowGroupModal(false)} className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-xl font-bold text-sm uppercase transition-all">← Quay Lại</button>
           </div>

           <div className="flex-1 p-6 sm:p-10 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
             <div className="bg-red-50 p-6 rounded-3xl border border-red-200 text-center space-y-4">
               <h3 className="text-xl font-bold text-red-900">Chọn Số Lượng Học Sinh Tối Đa Trong 1 Nhóm:</h3>
               <div className="flex flex-wrap justify-center gap-3">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button 
                      key={n} 
                      onClick={() => setGroupSize(n)} 
                      className={`w-14 h-14 rounded-2xl border-2 text-xl font-black transition-all ${groupSize === n ? 'border-red-800 text-white bg-red-800 shadow-md scale-110' : 'border-gray-200 text-gray-700 bg-white hover:border-red-400'}`}
                    >
                      {n}
                    </button>
                  ))}
               </div>
               <button onClick={handleMakeGroups} className="bg-red-800 text-white p-4 px-10 rounded-2xl font-extrabold text-lg shadow-xl hover:bg-red-900 uppercase tracking-wider transition-all">Tạo Nhóm Ngay 🎲</button>
             </div>

             {generatedGroups.length > 0 && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedGroups.map((g, idx) => (
                    <div key={idx} className="p-6 rounded-3xl border-2 border-red-200 bg-gradient-to-b from-red-50/50 to-white shadow-md">
                       <p className="font-black text-red-800 text-lg mb-4 border-b-2 border-red-200 pb-2 flex justify-between items-center">
                         <span>NHÓM {idx+1}</span>
                         <span className="text-xs bg-red-800 text-white px-3 py-1 rounded-full font-sans">{g.length} Học Sinh</span>
                       </p>
                       <div className="space-y-2.5">
                         {g.map(s => (
                           <div key={s.id} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
                             <img src={s.customAvatar || getRank(s.points, s.gender).avatar || 'https://api.dicebear.com/7.x/bottts/svg'} className="w-10 h-10 rounded-full border border-red-200 object-cover" />
                             <span className="text-xl md:text-2xl font-bold text-gray-800">{s.name}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  ))}
               </div>
             )}
           </div>
        </div>
      )}

      {/* MODAL: TIMER */}
      {showTimerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
           <div className="bg-white w-full max-w-sm rounded-[36px] shadow-2xl overflow-hidden animate-in zoom-in relative border-4 border-purple-600">
              <button onClick={() => setShowTimerModal(false)} className="absolute top-4 right-4 text-white hover:text-amber-300 text-3xl font-bold z-10 transition-colors">&times;</button>
              <div className="bg-purple-600 p-8 text-center text-white relative">
                 <div className="text-5xl mb-2">⌛</div>
                 <h2 className="text-2xl font-black uppercase tracking-wider">Đồng Hồ Đếm Giờ</h2>
              </div>
              <div className="p-8 space-y-6">
                 <div className="text-6xl font-black text-center text-purple-950 tabular-nums bg-purple-50 p-4 rounded-3xl border border-purple-100 shadow-inner">
                   {Math.floor(timerTime / 60)}:{String(timerTime % 60).padStart(2, '0')}
                 </div>
                 
                 <div className="flex gap-2 items-center bg-gray-50 border p-2 rounded-2xl">
                    <input 
                      type="number" 
                      placeholder="Nhập số phút..." 
                      className="flex-1 bg-transparent p-2 text-sm font-bold outline-none" 
                      value={customMinutes}
                      onChange={e => setCustomMinutes(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        const mins = parseInt(customMinutes);
                        if (!isNaN(mins)) startTimer(mins * 60);
                        setCustomMinutes('');
                      }}
                      className="bg-purple-600 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase"
                    >Cài Giờ</button>
                 </div>

                 <div className="grid grid-cols-3 gap-2">
                   {[15, 30, 60, 180, 300, 600].map(s => (
                     <button key={s} onClick={() => startTimer(s)} className="p-3 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-600 hover:border-purple-300 hover:text-purple-700 transition-all">
                       {s < 60 ? `${s}s` : `${s/60}p`}
                     </button>
                   ))}
                 </div>
                 <button onClick={() => { if(timerRunning) { setTimerRunning(false); clearInterval(timerRef.current!); } else { startTimer(timerTime); } }} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-bold text-lg shadow-xl uppercase tracking-wider transition-all">
                   {timerRunning ? 'Tạm Dừng ⏸️' : 'Bắt Đầu 🔴'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: CÁ NGỰA BOARD GAME */}
      {showLudoModal && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-amber-50/95 backdrop-blur-md overflow-hidden animate-in fade-in duration-300">
          <div className="bg-amber-900 text-amber-100 p-4 px-6 flex justify-between items-center shadow-md shrink-0 border-b-4 border-amber-600">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🐴</span>
              <div>
                <h2 className="text-xl font-royal uppercase tracking-widest text-amber-300">Đường Đua Cá Ngựa Triều Đình (50 Ô)</h2>
                <p className="text-[10px] text-amber-200">Lớp {activeLudoClassName || 'Chưa chọn'} - chỉ học sinh cùng lớp đua với nhau.</p>
              </div>
            </div>
            <button onClick={() => { setBattleLudoQueue([]); setShowLudoModal(false); }} className="bg-amber-800 hover:bg-amber-700 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider border border-amber-600">
              ← Quay Lại Lớp
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6">
            {/* Left side: Interactive Board */}
            <div className="flex-1 bg-white p-6 rounded-3xl border-4 border-amber-300 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center border-b border-amber-200 pb-3">
                <h3 className="font-extrabold text-amber-950 text-base">Bàn Cờ Hoàng Gia (Ô 0 đến 49)</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={activeLudoClassName}
                    onChange={e => {
                      setLudoClassName(e.target.value);
                      setLudoActiveStudent(null);
                      setBattleLudoQueue([]);
                      setLudoDice(null);
                    }}
                    className="bg-amber-100 text-amber-950 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-black outline-none"
                  >
                    {classOptions.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">Tổng sỹ tử: {ludoRaceStudents.length}</span>
                </div>
              </div>

              {/* Grid of 50 tiles */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {Array.from({ length: 50 }).map((_, tileIdx) => {
                  const spec = customLudoTiles[tileIdx] || DEFAULT_LUDO_TILES[tileIdx];
                  const studentsOnTile = ludoRaceStudents.filter(s => (ludoPositions[s.id] || 0) === tileIdx);

                  return (
                    <div 
                      key={tileIdx} 
                      className={`min-h-[76px] sm:min-h-[84px] p-1.5 rounded-2xl border-2 flex flex-col items-center justify-between relative transition-all shadow-xs hover:shadow-md ${
                        tileIdx === 0 ? 'bg-gradient-to-b from-green-100 to-emerald-50 border-green-500' :
                        spec?.type === 'monster' ? 'bg-gradient-to-b from-red-100 to-rose-50 border-red-500' :
                        spec?.type === 'curse' ? 'bg-gradient-to-b from-purple-100 to-fuchsia-50 border-purple-500' :
                        spec?.type === 'portal' ? 'bg-gradient-to-b from-blue-100 to-sky-50 border-blue-500' :
                        spec?.type === 'treasure' ? 'bg-gradient-to-b from-amber-100 to-yellow-50 border-amber-500' : 'bg-gradient-to-b from-stone-50 to-amber-50/30 border-stone-200 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full px-1">
                        <span className="text-[10px] font-black text-amber-950">{tileIdx}</span>
                        {spec && <span className="text-sm drop-shadow-xs">{spec.icon}</span>}
                        {tileIdx === 0 && <span className="text-[7px] font-black bg-green-700 text-white px-1 py-0.2 rounded uppercase tracking-wider">XUẤT PHÁT</span>}
                      </div>

                      <div className="flex flex-wrap justify-center gap-1 my-1 z-10">
                        {studentsOnTile.map(st => (
                          <motion.div 
                            key={st.id} 
                            layout 
                            initial={{ scale: 0.6, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="relative group"
                          >
                            <img 
                              src={st.customAvatar || getRank(st.points, st.gender).avatar || 'https://api.dicebear.com/7.x/bottts/svg'} 
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-amber-900 shadow-md object-cover ring-2 ring-amber-300 transform group-hover:scale-125 transition-transform duration-200" 
                              alt={st.name}
                            />
                            <div className="absolute -bottom-1 -right-1 bg-amber-900 text-amber-100 text-[8px] font-black px-1 rounded-full border border-white shadow-xs max-w-[36px] truncate">
                              {st.name.split(' ').pop()}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Logs area - High contrast & readable */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-300 shadow-md space-y-2">
                <p className="text-amber-950 font-black text-xs uppercase tracking-wider border-b border-amber-200 pb-1 flex items-center gap-1.5">
                  <span>📜</span> Nhật Ký Đua Cá Ngựa Triều Đình:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {ludoLogs.map((log, i) => (
                    <div key={i} className="text-xs font-bold text-amber-950 bg-white/90 p-2.5 rounded-xl border border-amber-200 shadow-2xs leading-snug">
                      {log}
                    </div>
                  ))}
                  {ludoLogs.length === 0 && <p className="text-amber-800/60 italic text-xs">Chưa có lượt lắc xí ngầu nào...</p>}
                </div>
              </div>
            </div>

            {/* Right side: Dice Roller Control */}
            <div className="w-full lg:w-80 shrink-0 bg-white p-6 rounded-3xl border-4 border-amber-300 shadow-xl space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-amber-950 text-lg border-b border-amber-200 pb-3 mb-4">Lượt Đua Tiếp Theo</h3>

                <div className="space-y-3">
                  {battleLudoQueue.length > 0 ? (
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-amber-900">Queue Battle tự động</p>
                      <div className="space-y-1.5">
                        {battleLudoQueue.map((turn, index) => {
                          const queuedStudent = ludoRaceStudents.find(s => s.id === turn.studentId) || students.find(s => s.id === turn.studentId);
                          if (!queuedStudent) return null;
                          return (
                            <div key={`${turn.studentId}-${index}`} className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-black ${index === 0 ? 'bg-amber-600 text-white' : 'bg-white text-amber-950 border border-amber-200'}`}>
                              <span>{index + 1}. {queuedStudent.name}</span>
                              <span className="text-[9px] uppercase">{turn.role === 'winner' ? 'Thắng' : turn.role === 'loser' ? 'Thua' : 'Hòa'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="text-[10px] font-black uppercase text-amber-900 block">Chọn Học Sinh Trả Lời Đúng:</label>
                      <select
                        value={ludoActiveStudent?.id || ''}
                        onChange={e => {
                          const st = ludoRaceStudents.find(s => s.id === e.target.value) || null;
                          setLudoActiveStudent(st);
                        }}
                        className="w-full border-2 border-amber-300 p-3 rounded-2xl text-sm font-bold outline-none bg-amber-50/50"
                      >
                        <option value="">-- Chọn học sinh lắc xí ngầu --</option>
                        {ludoRaceStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.className}) - Ô {ludoPositions[s.id] || 0}</option>
                        ))}
                      </select>
                    </>
                  )}

                  {ludoActiveStudent && (
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-center gap-3">
                      <img src={ludoActiveStudent.customAvatar || getRank(ludoActiveStudent.points, ludoActiveStudent.gender).avatar || 'https://api.dicebear.com/7.x/bottts/svg'} className="w-12 h-12 rounded-full border-2 border-amber-600 object-cover" />
                      <div>
                        <h4 className="font-extrabold text-amber-950 text-sm">{ludoActiveStudent.name}</h4>
                        <p className="text-[10px] font-bold text-amber-800">Đang ở ô: {ludoPositions[ludoActiveStudent.id] || 0} / 50</p>
                        {(ludoBonusRolls[ludoActiveStudent.id] || 0) > 0 && (
                          <span className="text-[9px] font-black text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded">🎁 Còn {ludoBonusRolls[ludoActiveStudent.id]} lượt lắc bonus</span>
                        )}
                        {ludoMonsterStuck[ludoActiveStudent.id] && (
                          <span className="text-[9px] font-black text-red-600 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded">👹 Đang bị Quái vật kẹt! Cần lắc xí ngầu 6</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dice Box */}
              <div className="text-center space-y-4 py-4 border-t border-amber-200">
                <div className={`w-24 h-24 mx-auto rounded-3xl border-4 border-amber-800 flex items-center justify-center text-5xl font-black shadow-inner transition-transform ${ludoRolling ? 'animate-spin bg-amber-200' : 'bg-amber-100 text-amber-950'}`}>
                  {ludoRolling ? '🎲' : ludoDice !== null ? ludoDice : '🎲'}
                </div>

                <button 
                  disabled={!ludoActiveStudent || ludoRolling}
                  onClick={() => {
                    if (!ludoActiveStudent) return;
                    handleLudoRollDice(ludoActiveStudent, { isBonusRoll: (ludoBonusRolls[ludoActiveStudent.id] || 0) > 0 });
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-sm shadow-xl transition-all"
                >
                  {ludoRolling
                    ? 'Đang Đổ Xí Ngầu...'
                    : ludoActiveStudent && (ludoBonusRolls[ludoActiveStudent.id] || 0) > 0
                      ? `🎁 Lắc Bonus (còn ${ludoBonusRolls[ludoActiveStudent.id]} lượt)`
                      : '🎲 Trả Lời Đúng & Lắc Xí Ngầu (+1đ)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LUDO EVENT ACTION POPUP */}
      {ludoEventPopup && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-8 rounded-[40px] max-w-md w-full border-4 border-amber-500 shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="text-6xl animate-bounce">{ludoEventPopup.icon || '🌟'}</div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-amber-950 uppercase tracking-wide">
                {ludoEventPopup.title}
              </h3>
              <p className="text-sm font-bold text-amber-900 bg-white/90 p-4 rounded-2xl border border-amber-300 shadow-xs leading-relaxed">
                {ludoEventPopup.message}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 bg-white/70 p-3 rounded-2xl border border-amber-200 shadow-xs">
              <img 
                src={ludoEventPopup.actor.customAvatar || getRank(ludoEventPopup.actor.points, ludoEventPopup.actor.gender).avatar || 'https://api.dicebear.com/7.x/bottts/svg'} 
                className="w-12 h-12 rounded-full border-2 border-amber-600 object-cover" 
              />
              <div className="text-left">
                <p className="text-xs font-black text-amber-950">{ludoEventPopup.actor.name}</p>
                <p className="text-[10px] text-amber-800 font-bold">Vị trí hiện tại: Ô {ludoPositions[ludoEventPopup.actor.id] || 0}</p>
              </div>
            </div>

            <button
              onClick={() => setLudoEventPopup(null)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3.5 rounded-2xl text-sm uppercase tracking-wider shadow-lg transition-all border-2 border-amber-400"
            >
              Đã Hiểu & Tiếp Tục 🎲
            </button>
          </div>
        </div>
      )}

      {/*聖旨 EDICT DISPLAY */}
      {edict && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-6 animate-in fade-in duration-500">
          <div className="bg-[#fdf3e7] text-[#5d4037] p-12 max-w-xl w-full border-[12px] border-[#5d4037] relative shadow-[0_0_100px_rgba(255,215,0,0.4)]">
            <div className="absolute top-4 right-4 cursor-pointer text-4xl opacity-50 hover:opacity-100" onClick={() => setEdict(null)}>&times;</div>
            <div className="text-center mb-10">
               <h2 className="text-5xl font-royal font-bold border-b-8 border-[#5d4037] pb-6 inline-block uppercase tracking-[0.3em]">Thánh Chỉ</h2>
            </div>
            <div className="bg-white/50 p-8 rounded-lg mb-10 border border-[#5d4037]/20">
              <p className="text-3xl font-royal italic leading-relaxed text-center">"{edict}"</p>
            </div>
            <div className="flex justify-center">
              <button onClick={() => setEdict(null)} className="bg-[#5d4037] text-white px-16 py-5 rounded-full font-bold uppercase tracking-[0.2em] hover:scale-110 transition-transform shadow-2xl">Khấu Đầu Tuân Chỉ</button>
            </div>
            <div className="mt-12 text-center text-[10px] opacity-40 uppercase font-black tracking-widest">Phụng Thiên Thừa Vận - Hoàng Đế Chiếu Viết</div>
          </div>
        </div>
      )}

      {/* MODAL: CHÚC MỪNG POKEMON NỞ */}
      {showHatchModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-amber-50/95 max-w-md w-full rounded-[45px] border-[10px] border-amber-400 p-8 shadow-[0_0_120px_rgba(245,158,11,0.6)] text-center space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-500">
            {/* Ambient burst bg */}
            <div className="absolute inset-0 bg-radial-gradient from-amber-300/30 via-transparent to-transparent pointer-events-none" />
            
            <h3 className="text-3xl font-royal text-amber-800 uppercase tracking-widest">🐣 Linh Thú Thức Giấc 🐣</h3>
            
            <div className="relative inline-block py-6">
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-3xl animate-pulse" />
              <div className="text-8xl select-none animate-bounce relative z-10">🦖🧬🔥</div>
            </div>

            <div className="bg-white/90 p-6 rounded-3xl border border-amber-200/50 relative z-10 shadow-inner">
              <p className="font-extrabold text-amber-950 text-sm leading-relaxed whitespace-pre-line">
                {hatchSuccessMessage}
              </p>
            </div>

            <div className="relative z-10 pt-2">
              <button 
                onClick={() => {
                  setShowHatchModal(false);
                  new Audio(posSoundUrl).play().catch(() => {});
                }} 
                className="bg-amber-500 text-white px-10 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-amber-600 hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-2xl border-b-4 border-amber-700"
              >
                Cực Kỳ Đáng Yêu
              </button>
            </div>
            
            <div className="text-[9px] uppercase font-bold text-amber-900/40 tracking-wider">Cung điện Hoàng Gia - Bảo học Linh thú đồng hành</div>
          </div>
        </div>
      )}

      {showAttendanceModal && (
        <AttendanceCheckModal
          students={currentClassStudents}
          statuses={attendanceStatuses}
          lessonDateKey={getLocalDateKey()}
          getRank={getRank}
          onSetStatus={setAttendanceStatus}
          onConfirm={handleConfirmAttendanceCheck}
          onClose={() => setShowAttendanceModal(false)}
        />
      )}

      {showShopModal && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md animate-in fade-in duration-200"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
                setShowShopModal(false);
                setShopReview(null);
                setSelectedShopSkill(null);
              }
            }}
        >
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border-2 border-white/80 bg-white/90 shadow-[0_30px_90px_rgba(15,118,110,0.28)] backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-100 bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-teal-600">Class Shop</p>
                <h2 className="font-royal text-3xl text-teal-950">Shop Linh Thú & Tuyệt Chiêu</h2>
              </div>
              <button
                onClick={() => {
                  setShowShopModal(false);
                  setShopReview(null);
                  setSelectedShopSkill(null);
                }}
                className="grid h-10 w-10 place-items-center rounded-full border border-teal-200 bg-white text-lg font-black text-teal-900 hover:bg-teal-50"
                aria-label="Đóng Shop"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4 custom-scrollbar">
              <table
                className="w-max min-w-full border-separate border-spacing-2 text-xs"
                style={{ minWidth: `${540 + Math.max(1, petSkills.length) * 150}px` }}
              >
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-40 w-[220px] min-w-[220px] rounded-2xl bg-teal-950 px-3 py-3 text-left font-black uppercase text-white shadow-[10px_0_22px_rgba(15,118,110,0.22)]">
                      Học sinh
                    </th>
                    <th className="sticky top-0 z-20 w-[150px] min-w-[150px] rounded-2xl bg-teal-900 px-3 py-3 text-center font-black uppercase text-white">
                      Trứng thường
                    </th>
                    <th className="sticky top-0 z-20 w-[150px] min-w-[150px] rounded-2xl bg-teal-900 px-3 py-3 text-center font-black uppercase text-white">
                      Trứng đặc biệt
                    </th>
                    {petSkills.map(skill => (
                      <th key={skill.id} className="sticky top-0 z-20 w-[150px] min-w-[150px] rounded-2xl bg-teal-900 p-0 text-center font-black uppercase text-white">
                        <button
                          type="button"
                          onClick={() => setSelectedShopSkill(skill)}
                          className="h-full w-full rounded-2xl px-3 py-3 font-black uppercase text-white transition-all hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-200"
                          title={`Bấm để xem chi tiết ${skill.name}`}
                        >
                          <span>{skill.icon}</span> {skill.name}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentClassStudents.map(student => {
                    const selection = shopSelections[student.id] || { skills: [] };
                    const ownedSkillIds = student.pet?.skills || [];
                    const rank = getRank(student.points, student.gender);
                    return (
                      <tr key={student.id}>
                        <td className="sticky left-0 z-30 w-[220px] min-w-[220px] rounded-2xl border border-teal-100 bg-white p-3 shadow-[10px_0_22px_rgba(15,118,110,0.16)]">
                          <div className="flex items-center gap-3">
                            <img
                              src={student.customAvatar || rank.avatar || 'https://api.dicebear.com/7.x/bottts/svg'}
                              className="h-10 w-10 shrink-0 rounded-xl border-2 border-white object-cover shadow-sm"
                              alt={student.name}
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-black text-teal-950">{student.name}</p>
                              <p className="mt-0.5 truncate text-[10px] font-bold text-teal-700/70">{student.points}đ Hào Quang · {student.pet ? getPokemonDisplayName(student.pet) : 'Đang ấp trứng'}</p>
                            </div>
                          </div>
                        </td>
                        {(['normal', 'special'] as const).map(kind => (
                          <td key={kind} className="w-[150px] min-w-[150px]">
                            <label className={`flex min-h-[68px] cursor-pointer items-center justify-center rounded-2xl border p-3 font-black transition-all ${selection.egg === kind ? 'border-teal-500 bg-teal-50 text-teal-800 ring-2 ring-teal-100' : 'border-teal-100 bg-white text-stone-400 hover:border-teal-300'}`}>
                              <input
                                type="checkbox"
                                checked={selection.egg === kind}
                                onChange={() => toggleShopEgg(student.id, kind)}
                                className="mr-2 h-4 w-4 accent-teal-600"
                              />
                              {kind === 'special' ? '20đ' : '10đ'}
                            </label>
                          </td>
                        ))}
                        {petSkills.map(skill => {
                          const disabled = !student.pet || ownedSkillIds.includes(skill.id);
                          const checked = selection.skills.includes(skill.id);
                          return (
                            <td key={skill.id} className="w-[150px] min-w-[150px]">
                              <label
                                title={`${skill.name}: ${skill.description} · Giá ${skill.cost}đ${disabled ? student.pet ? ' · Đã sở hữu' : ' · Cần có Pokémon active' : ''}`}
                                className={`flex min-h-[68px] cursor-pointer items-center justify-center rounded-2xl border p-3 text-center font-black transition-all ${checked ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100' : 'border-teal-100 bg-white text-stone-400 hover:border-indigo-300'} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => toggleShopSkill(student.id, skill.id)}
                                  className="mr-2 h-4 w-4 accent-indigo-600"
                                />
                                {skill.cost}đ
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-teal-100 bg-white/80 p-5">
              <p className="text-xs font-bold text-teal-900/70">Trứng thường: 80% thường, 20% đặc biệt. Trứng đặc biệt: 100% đặc biệt/rare/legend.</p>
              <button
                onClick={handlePrepareShopPurchase}
                className="rounded-2xl bg-teal-700 px-8 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all hover:bg-teal-900 active:scale-95"
              >
                Mua
              </button>
            </div>
          </div>

          {selectedShopSkill && (
            <div
              className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-in fade-in duration-150"
              onMouseDown={event => {
                if (event.target === event.currentTarget) setSelectedShopSkill(null);
              }}
            >
              <div className="w-full max-w-xl rounded-[32px] border-2 border-white/80 bg-white p-6 shadow-[0_30px_90px_rgba(49,46,129,0.35)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-500">Skill Detail</p>
                    <h3 className="mt-1 flex items-center gap-2 font-royal text-3xl text-indigo-950">
                      <span>{selectedShopSkill.icon}</span>
                      <span>{selectedShopSkill.name}</span>
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedShopSkill(null)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-indigo-100 bg-indigo-50 text-lg font-black text-indigo-900 hover:bg-indigo-100"
                    aria-label="Đóng chi tiết skill"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 space-y-4 font-sans">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Chức năng</p>
                    <p className="mt-1 text-sm font-bold leading-relaxed text-indigo-950">{selectedShopSkill.description}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Giá mua</p>
                      <p className="mt-1 text-2xl font-black text-amber-950">{selectedShopSkill.cost}đ Hào Quang</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Lượt dùng</p>
                      <p className="mt-1 text-sm font-black text-emerald-950">Mỗi skill bắt đầu từ 0 lượt đã dùng và tuân theo giới hạn trong hệ thống skill hiện tại.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ví dụ</p>
                    <p className="mt-1 text-sm font-bold leading-relaxed text-slate-700">
                      Nếu học sinh mua {selectedShopSkill.name}, skill sẽ được gắn vào Pokémon đang đồng hành. Khi đến lượt cần dùng, giáo viên mở hồ sơ Linh thú của học sinh và kích hoạt skill đó theo mô tả ở trên.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {shopReview && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-[32px] border-2 border-white/80 bg-white p-6 shadow-[0_30px_90px_rgba(15,118,110,0.32)]">
            <h3 className="font-royal text-2xl text-teal-950">Xác nhận đơn Shop</h3>
            <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {shopReview.map(item => (
                <div key={item.studentId} className={`rounded-2xl border p-4 ${item.canAfford ? 'border-teal-100 bg-teal-50/50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-teal-950">{item.studentName}</p>
                    <p className={`text-sm font-black ${item.canAfford ? 'text-red-700' : 'text-red-900'}`}>-{item.totalCost}đ</p>
                  </div>
                  <p className="mt-1 text-xs font-bold text-stone-600">{item.itemLabels.join(', ')}</p>
                  {!item.canAfford && <p className="mt-1 text-[10px] font-black uppercase text-red-700">Không đủ Hào Quang ({item.pointBalance}đ)</p>}
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button onClick={() => setShopReview(null)} className="rounded-2xl border border-stone-200 bg-white px-6 py-3 text-xs font-black uppercase text-stone-500 hover:bg-stone-50">Quay lại</button>
              <button onClick={handleConfirmShopPurchase} className="rounded-2xl bg-teal-700 px-6 py-3 text-xs font-black uppercase text-white shadow-lg hover:bg-teal-900">Xác nhận mua</button>
            </div>
          </div>
        </div>
      )}

      {showHomeworkModal && (
        <HomeworkCheckModal
          students={presentStudents}
          statuses={homeworkStatuses}
          lessonDateKey={homeworkLessonDateKey}
          getRank={getRank}
          onToggle={toggleHomeworkStatus}
          onSetStatus={setHomeworkStatus}
          onConfirm={handleConfirmHomeworkCheck}
          onClose={() => setShowHomeworkModal(false)}
        />
      )}

      {/* MODAL: POKEMON RELEASED WHEN HP REACHES 0 */}
      {pokemonReleaseEvent && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/92 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-rose-50 max-w-2xl w-full rounded-[36px] border-[8px] border-rose-700 p-6 sm:p-8 shadow-[0_0_90px_rgba(190,18,60,0.38)] text-center space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(244,63,94,0.18),transparent_36%)] pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-800">Linh thú rời đội hình</p>
              <h3 className="text-3xl sm:text-4xl font-royal text-rose-950 uppercase">Pokémon đã rời đội hình</h3>

              <div className="bg-white/90 rounded-[28px] border border-rose-200 p-5 shadow-inner">
                <img
                  referrerPolicy="no-referrer"
                  src={getPokemonArtworkUrl(pokemonReleaseEvent.releasedPet)}
	                  onError={event => handlePokemonArtworkError(event, pokemonReleaseEvent.releasedPet)}
                  className={`w-36 h-36 object-contain mx-auto drop-shadow-xl grayscale-[20%] ${pokemonReleaseEvent.releasedPet.isShiny ? 'rounded-3xl bg-amber-100 ring-4 ring-amber-300' : ''}`}
                  alt={getPokemonDisplayName(pokemonReleaseEvent.releasedPet)}
                />
                <p className="text-lg font-black text-rose-950">
                  {pokemonReleaseEvent.releasedPet.isShiny ? '✨ ' : ''}{getPokemonDisplayName(pokemonReleaseEvent.releasedPet)} của {pokemonReleaseEvent.studentName} đã cạn HP và rời đội hình.
                </p>
                {pokemonReleaseEvent.cause && (
                  <p className="mt-2 text-xs font-bold text-rose-700">{pokemonReleaseEvent.cause}</p>
                )}
              </div>

              {pokemonReleaseEvent.remainingPets.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-800">Chọn Pokémon đồng hành mới</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {pokemonReleaseEvent.remainingPets.map(pet => (
                      <button
                        key={pet.instanceId || `${pet.dexId}-${pet.name}-${pet.baseDexId || pet.dexId}`}
                        onClick={() => handleSelectReplacementPokemon(pet)}
                        className="bg-white hover:bg-rose-50 border-2 border-rose-200 hover:border-rose-600 rounded-3xl p-3 transition-all shadow-sm"
                      >
                        <img
                          referrerPolicy="no-referrer"
                          src={getPokemonArtworkUrl(pet)}
	                          onError={event => handlePokemonArtworkError(event, pet)}
                          className="w-20 h-20 object-contain mx-auto"
                          alt={getPokemonDisplayName(pet)}
                        />
                        <p className="text-xs font-black text-emerald-950 truncate">{pet.isShiny ? '✨ ' : ''}{getPokemonDisplayName(pet)}</p>
                        <div className="mt-1 grid grid-cols-3 gap-1 text-[9px] font-black text-rose-800">
                          <span className="rounded-lg bg-rose-50 px-1 py-0.5">Lv.{pet.level || 1}</span>
                          <span className="rounded-lg bg-emerald-50 px-1 py-0.5 text-emerald-700">HP {pet.hp ?? 100}</span>
                          <span className="rounded-lg bg-pink-50 px-1 py-0.5 text-pink-700">B{pet.bond || 0}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-rose-900">Bạn không còn Pokémon nào trong bộ sưu tập.</p>
                  {releaseEggShortfall > 0 && (
                    <p className="rounded-2xl bg-white/85 p-3 text-xs font-black text-rose-700 border border-rose-200">
                      Cần thêm {releaseEggShortfall} Hào Quang để mua trứng.
                    </p>
                  )}
                  <button
                    disabled={!releaseStudent || releaseEggShortfall > 0}
                    onClick={() => {
                      if (!releaseStudent) return;
                      const bought = handleBuyNewEgg(releaseStudent.id);
                      if (bought) setPokemonReleaseEvent(null);
                    }}
                    className="bg-rose-700 hover:bg-rose-800 disabled:bg-gray-300 disabled:text-gray-500 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-wider shadow-lg transition-all"
                  >
                    Mua trứng Pokémon mới — 10 Hào Quang
                  </button>
                  <div>
                    <button
                      onClick={handleOpenEggAfterRelease}
                      className="text-xs font-black uppercase tracking-wider text-rose-700 hover:text-rose-950"
                    >
                      Mở hồ sơ ấp trứng
                    </button>
                  </div>
                  <button
                    onClick={() => setPokemonReleaseEvent(null)}
                    className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800"
                  >
                    Tiếp tục học không có Pokémon
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: USER PROFILE / AUTH / LOGOUT */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border-4 border-[#D4AF37]">
            <div className="bg-red-800 p-6 text-center text-white relative">
              <button onClick={() => setShowUserModal(false)} className="absolute top-4 right-5 text-2xl text-white/70 hover:text-white transition-colors">&times;</button>
              
              {user ? (
                <>
                  <div className="relative inline-block mb-3 mt-1">
                    <img 
                      src={editingPhotoURL || 'https://api.dicebear.com/7.x/bottts/svg'} 
                      className="w-20 h-20 rounded-full border-4 border-amber-400 shadow-xl object-cover mx-auto" 
                      referrerPolicy="no-referrer"
                      alt="Review Avatar"
                    />
                  </div>
                  <h2 className="text-xl font-royal font-bold uppercase tracking-wide">Danh Tính Sỹ Phu</h2>
                  <p className="text-[10px] text-amber-300 font-mono mt-0.5 opacity-80">{user.email}</p>
                </>
              ) : (
                <div className="py-2">
                  <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-2 border-2 border-amber-200">
                    🏮
                  </div>
                  <h2 className="text-xl font-royal font-bold uppercase tracking-wide">Đăng Nhập Sỹ Phu</h2>
                  <p className="text-[10px] text-amber-200 mt-0.5">Kết nối tài khoản để tự động sao lưu đám mây</p>
                </div>
              )}
            </div>
            
            <div className="p-6 space-y-5">
              {!user ? (
                <AuthLoginForm onSuccess={() => setShowUserModal(false)} />
              ) : (
                <>
                  {/* Change Display Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 font-sans">Tôn Hiệu / Tên Hiển Thị</label>
                    <input 
                      type="text" 
                      className="w-full border p-2.5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-red-800/20 font-sans" 
                      value={editingDisplayName} 
                      onChange={e => setEditingDisplayName(e.target.value)}
                      placeholder="Gõ tên hiển thị..."
                    />
                  </div>

                  {/* Change Photo URL */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 font-sans">Ảnh Đại Diện (URL)</label>
                    <input 
                      type="text" 
                      className="w-full border p-2.5 rounded-2xl text-xs font-medium outline-none focus:ring-2 ring-red-800/20 font-sans" 
                      value={editingPhotoURL} 
                      onChange={e => setEditingPhotoURL(e.target.value)}
                      placeholder="Dán link ảnh bảo ảnh..."
                    />
                  </div>

                  {/* Quick Avatars Picker */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block font-sans text-center">Thần Tướng Gợi Ý</label>
                    <div className="flex gap-2 justify-center">
                      {[
                        "https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky",
                        "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
                        "https://api.dicebear.com/7.x/bottts/svg?seed=Sparks",
                        "https://api.dicebear.com/7.x/lorelei/svg?seed=Willow"
                      ].map((url, i) => (
                        <button 
                          key={i} 
                          onClick={() => setEditingPhotoURL(url)} 
                          className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all p-0.5 bg-gray-50 hover:scale-110 active:scale-95 ${editingPhotoURL === url ? 'border-red-800 scale-110 shadow-md' : 'border-gray-200'}`}
                        >
                          <img src={url} className="w-full h-full object-cover rounded-full" alt="option" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cloud Sync Status Info */}
                  <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-left text-[11px] font-sans text-amber-900 space-y-1">
                    <div className="font-bold flex items-center justify-between text-amber-950">
                      <span>⚡ Trạng thái Auto Sync:</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">ĐÃ KÍCH HOẠT</span>
                    </div>
                    <p className="leading-snug text-[10px] text-amber-800">
                      Tự động sao lưu sau 1.5s khi có thay đổi mới. Dữ liệu cũ không đổi sẽ được giữ nguyên (Differential Sync).
                    </p>
                  </div>

                  <div className="pt-2 space-y-2.5 font-sans">
                    <button 
                      onClick={async () => {
                        if (!editingDisplayName.trim()) {
                          alert("Vui lòng nhập tên hiển thị.");
                          return;
                        }
                        setProfileSaving(true);
                        try {
                          await updateUserProfile(editingDisplayName, editingPhotoURL);
                          alert("Đã lưu thông tin sỹ phu thành công!");
                          setShowUserModal(false);
                        } catch (err) {
                          alert("Có lỗi xảy ra: " + (err instanceof Error ? err.message : String(err)));
                        } finally {
                          setProfileSaving(false);
                        }
                      }}
                      disabled={profileSaving}
                      className="w-full bg-red-800 text-white py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-red-900 shadow-lg text-xs transition-all disabled:opacity-50"
                    >
                      {profileSaving ? "Đang Ghi Sách..." : "Lưu Thay Đổi"}
                    </button>

                    {!confirmLogout ? (
                      <button 
                        onClick={() => setConfirmLogout(true)}
                        className="w-full bg-[#fcf8e3] hover:bg-amber-100/50 text-amber-800 border border-amber-300 py-2.5 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all text-center leading-normal"
                      >
                        🚪 Đăng Xuất Khỏi Triều Đình
                      </button>
                    ) : (
                      <div className="flex gap-2 w-full animate-in fade-in duration-200">
                        <button 
                          onClick={async () => {
                            await logout();
                            setShowUserModal(false);
                            setConfirmLogout(false);
                            // Clear states
                            setStudents([]);
                            setRanksMale(DEFAULT_RANKS_MALE);
                            setRanksFemale(DEFAULT_RANKS_FEMALE);
                            setSkills(DEFAULT_SKILLS);
                            setInitialCloudLoadComplete(false);
                          }}
                          className="flex-1 bg-red-800 text-white py-2.5 rounded-xl font-bold uppercase text-[9px] tracking-widest hover:bg-red-900 transition-all text-center"
                        >
                          Xác nhận đăng xuất
                        </button>
                        <button 
                          onClick={() => setConfirmLogout(false)}
                          className="flex-1 bg-stone-100 text-stone-600 border border-stone-200 py-2.5 rounded-xl font-bold uppercase text-[9px] tracking-widest hover:bg-stone-200 transition-all text-center"
                        >
                          Quay Lại
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
