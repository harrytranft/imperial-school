
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Gender, HistoryItem, RankInfo, Skill, PokemonPet, LudoTileSpec } from './types';
import { 
  STORAGE_KEY, DEFAULT_RANKS_MALE, DEFAULT_RANKS_FEMALE, 
  RANKS_KEY_MALE, RANKS_KEY_FEMALE, DEFAULT_SKILLS, SKILLS_KEY,
  DEFAULT_LUDO_TILES, PET_SKILLS_KEY
} from './constants';
import { StudentCard } from './components/StudentCard';
import { LiquidDock } from './components/LiquidDock';
import { generateEdict } from './geminiService';
import { LIST_POKEMONS, LIST_PET_SKILLS as DEFAULT_PET_SKILLS, PetSkill, getRandomPokemon, getEvolvedForm } from './pokemonData';
import { useAuth } from './AuthContext';
import { fetchUserSettings, upsertUserSettings } from './supabaseData';


type Screen = 'school' | 'class' | 'profile' | 'settings';

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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<'name' | 'points-desc' | 'points-asc'>('points-desc');
  const [filterClass, setFilterClass] = useState<string>('Tất cả');

  // Manual points state
  const [manualPoints, setManualPoints] = useState<string>('');

  // Modals
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);
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
  } | null>(null);
  const [uncalledMap, setUncalledMap] = useState<Record<string, string[]>>({}); // Fair round-robin random queue

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

  // Audio settings
  const [posSoundUrl, setPosSoundUrl] = useState('https://actions.google.com/sounds/v1/foley/ting.ogg');
  const [negSoundUrl, setNegSoundUrl] = useState('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  const [timerSoundUrl, setTimerSoundUrl] = useState('https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg');

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
    ludo: false,
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
          if (cloudData.students && Array.isArray(cloudData.students)) setStudents(cloudData.students);
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
          if (cloudData.customLudoTiles && typeof cloudData.customLudoTiles === 'object') {
            setCustomLudoTiles(cloudData.customLudoTiles);
            localStorage.setItem('custom_ludo_tiles', JSON.stringify(cloudData.customLudoTiles));
          }
          setLastSyncedTime(cloudData.updatedAt || Date.now());

          // Save snapshot ref to prevent immediate re-sync of unchanged data
          lastSyncedSnapshotRef.current = JSON.stringify({
            students: cloudData.students || [],
            ranksMale: cloudData.ranksMale || [],
            ranksFemale: cloudData.ranksFemale || [],
            skills: cloudData.skills || [],
            petSkills: cloudData.petSkills || DEFAULT_PET_SKILLS,
            posSoundUrl: cloudData.posSoundUrl || '',
            negSoundUrl: cloudData.negSoundUrl || '',
            timerSoundUrl: cloudData.timerSoundUrl || '',
            customLudoTiles: cloudData.customLudoTiles || {}
          });

          // Also save a fallback local copy
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData.students || []));
          if (cloudData.ranksMale) localStorage.setItem(RANKS_KEY_MALE, JSON.stringify(cloudData.ranksMale));
          if (cloudData.ranksFemale) localStorage.setItem(RANKS_KEY_FEMALE, JSON.stringify(cloudData.ranksFemale));
          if (cloudData.skills) localStorage.setItem(SKILLS_KEY, JSON.stringify(cloudData.skills));
          if (cloudData.petSkills) localStorage.setItem(PET_SKILLS_KEY, JSON.stringify(cloudData.petSkills));
          if (cloudData.posSoundUrl) localStorage.setItem('imperial_sound_pos', cloudData.posSoundUrl);
          if (cloudData.negSoundUrl) localStorage.setItem('imperial_sound_neg', cloudData.negSoundUrl);
          if (cloudData.timerSoundUrl) localStorage.setItem('imperial_sound_tim', cloudData.timerSoundUrl);
        } else {
          // First time logging in: check if there's any local storage data to migrate
          const saved = localStorage.getItem(STORAGE_KEY);
          let localStudents: Student[] = [];
          if (saved) {
            try {
              localStudents = JSON.parse(saved);
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
            customLudoTiles
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
            customLudoTiles
          });
          
          setStudents(localStudents);
          setRanksMale(localMaleRanks);
          setRanksFemale(localFemaleRanks);
          setSkills(localSkills);
          setPetSkills(localPetSkills);
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
      customLudoTiles
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
          customLudoTiles,
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
  }, [students, ranksMale, ranksFemale, skills, petSkills, posSoundUrl, negSoundUrl, timerSoundUrl, customLudoTiles, user, initialCloudLoadComplete, cloudLoadSuccess]);

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

  // Remind user to backup to cloud before leaving/closing tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Hãy chắc chắn quý Quan trường đã sao lưu dữ liệu lên Đám mây (Backup to Cloud) trước khi thoát điện!";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);


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
              const randomDexId = LIST_POKEMONS[Math.floor(Math.random() * LIST_POKEMONS.length)].dexId;
              return {
                ...s,
                egg: {
                  progress: 0,
                  status: 'egg' as const,
                  assignedDexId: randomDexId
                }
              };
            }
            return s;
          });
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
      if (sPos) setPosSoundUrl(sPos);
      if (sNeg) setNegSoundUrl(sNeg);
      if (sTim) setTimerSoundUrl(sTim);
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
  const classOptions = useMemo(() => classes.filter(c => c !== 'Tất cả'), [classes]);
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

  const handleUpdatePoints = async (ids: string[], amount: number, reason: string) => {
    if (isNaN(amount)) return;

    // Play Sound using dynamic URLs
    const sound = new Audio(amount >= 0 ? posSoundUrl : negSoundUrl);
    sound.play().catch(() => {});

    let hatchedNames: string[] = [];
    let evolvedMessages: string[] = [];

    const updatedStudents = students.map(s => {
      if (ids.includes(s.id)) {
        const oldRank = getRank(s.points, s.gender);
        const newPoints = s.points + amount;
        const newRank = getRank(newPoints, s.gender);
        
        const history: HistoryItem = { id: Date.now().toString() + Math.random(), amount, reason, timestamp: Date.now() };
        
        // Instant check for edict on first student if rank changed
        if (ids.length === 1 && oldRank.id !== newRank.id) {
          generateEdict(s.name, newRank.title, newPoints > s.points).then(setEdict);
        }

        // Egg and Pet logic
        let currentEgg = s.egg ? { ...s.egg } : { progress: 0, status: 'egg' as const, assignedDexId: LIST_POKEMONS[Math.floor(Math.random() * LIST_POKEMONS.length)].dexId };
        let currentPet = s.pet ? { ...s.pet } : undefined;

        if (amount > 0 && currentEgg.status === 'egg') {
          const nextProgress = currentEgg.progress + amount;
          currentEgg.progress = Math.min(10, nextProgress);
          
          if (currentEgg.progress >= 10) {
            currentEgg.status = 'hatched';
            const pokeMeta = LIST_POKEMONS.find(p => p.dexId === currentEgg.assignedDexId) || LIST_POKEMONS[0];
            
            const originalBaseId = pokeMeta.dexId;
            const evolved = getEvolvedForm(originalBaseId, newPoints);
            
            currentPet = {
              dexId: evolved.dexId,
              name: evolved.name,
              types: evolved.types,
              hp: 100,
              accessories: [],
              skills: [],
              baseDexId: originalBaseId
            };
            hatchedNames.push(s.name);
          }
        } else if (currentPet) {
          // Evolution & HP update on point change (+3 pts -> +3 HP, -3 pts -> -3 HP)
          const originalBaseId = currentPet.baseDexId || currentPet.dexId;
          const evolved = getEvolvedForm(originalBaseId, newPoints);
          const oldHp = currentPet.hp ?? 100;
          const newHp = Math.min(100, Math.max(0, oldHp + amount));

          if (evolved.dexId !== currentPet.dexId) {
            currentPet = {
              ...currentPet,
              baseDexId: originalBaseId,
              dexId: evolved.dexId,
              name: evolved.name,
              types: evolved.types,
              hp: newHp
            };
            evolvedMessages.push(`Linh thú của ${s.name} đã tiến hóa thành ${evolved.name}! 🔥🧬`);
          } else {
            currentPet = {
              ...currentPet,
              baseDexId: originalBaseId,
              hp: newHp
            };
          }
        }

        return { 
          ...s, 
          points: newPoints, 
          history: [history, ...s.history].slice(0, 50),
          egg: currentEgg,
          pet: currentPet
        };
      }
      return s;
    });

    setStudents(updatedStudents);

    // Keep profile details in sync if points were changed while viewing them
    if (editingStudent && ids.includes(editingStudent.id)) {
      const updatedSelf = updatedStudents.find(x => x.id === editingStudent.id);
      if (updatedSelf) setEditingStudent(updatedSelf);
    }

    if (hatchedNames.length > 0) {
      setHatchSuccessMessage(`Tin vui chấn động triều đình! Quả trứng của học sĩ ${hatchedNames.join(', ')} đã nứt vỡ ra một Pokémon Cưng vô cùng đáng yêu! 🥚🐣💖`);
      setShowHatchModal(true);
    } else if (evolvedMessages.length > 0) {
      setHatchSuccessMessage(`✨ TIẾN HÓA THĂNG HOA ✨\n\n${evolvedMessages.join('\n')}\nĐạo pháp thâm sâu, linh khí đong đầy! Hãy vinh danh học sĩ.`);
      setShowHatchModal(true);
    }

    setShowSkillModal(false);
    setShowRandomModal(false);
    setManualPoints('');
    setSelectedStudentIds([]);
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
        const updatedPet = { ...s.pet, name: newName };
        const updatedS = { ...s, pet: updatedPet };
        setEditingStudent(updatedS);
        return updatedS;
      }
      return s;
    });
    setStudents(updatedStudents);
  };

  const handleBuyNewEgg = (studentId: string) => {
    const s = students.find(x => x.id === studentId);
    if (!s) return;
    const cost = 10;
    if (s.points < cost) {
      alert(`Không đủ Hào quang! Học sĩ cần tối thiểu ${cost} điểm để thỉnh Quả trứng mới.`);
      return;
    }
    if (!window.confirm(`Bạn có đồng ý thỉnh thêm một quả Quả Trứng Pokemon mới bằng cách tiêu hao 10đ Hào Quang?`)) return;

    const randomDexId = LIST_POKEMONS[Math.floor(Math.random() * LIST_POKEMONS.length)].dexId;
    
    // Save current companion in collection
    const currentActivePet = s.pet;
    let ownedPets = s.pets ? [...s.pets] : [];
    if (currentActivePet) {
      const exists = ownedPets.some(p => p.dexId === currentActivePet.dexId);
      if (!exists) {
        ownedPets.push(currentActivePet);
      }
    }

    const nextPoints = s.points - cost;
    const historyItem: HistoryItem = {
      id: Date.now().toString() + Math.random(),
      amount: -cost,
      reason: "Thỉnh Quả Trứng Pokemon cổ đại mới",
      timestamp: Date.now()
    };

    const updatedS: Student = {
      ...s,
      points: nextPoints,
      egg: {
        progress: 0,
        status: 'egg' as const,
        assignedDexId: randomDexId
      },
      pet: undefined, // Clear active pet so they see incubating layout
      pets: ownedPets,
      history: [historyItem, ...s.history].slice(0, 50)
    };

    setStudents(prev => prev.map(x => x.id === studentId ? updatedS : x));
    setEditingStudent(updatedS);
    new Audio(posSoundUrl).play().catch(() => {});
    alert("Mua trứng cổ đại thế hệ mới thành công! Hãy tích cực cộng điểm giúp sinh linh sớm thức tỉnh vỏ trứng.");
  };

  const handleSelectActivePet = (studentId: string, chosenPet: PokemonPet) => {
    const s = students.find(x => x.id === studentId);
    if (!s) return;

    let ownedPets = s.pets ? [...s.pets] : [];
    
    // Backup active pet if any
    if (s.pet) {
      const exists = ownedPets.some(p => p.dexId === s.pet!.dexId);
      if (!exists) {
        ownedPets.push(s.pet);
      }
    }

    // Load selected pet as active
    const nextPet = { ...chosenPet };
    const nextPoints = s.points; // preserve points
    
    // Ensure pet is evolved to match current points level!
    const originalBaseId = nextPet.baseDexId || nextPet.dexId;
    const evolved = getEvolvedForm(originalBaseId, nextPoints);
    nextPet.dexId = evolved.dexId;
    nextPet.name = evolved.name;
    nextPet.types = evolved.types;
    nextPet.baseDexId = originalBaseId;

    const updatedS: Student = {
      ...s,
      pet: nextPet,
      pets: ownedPets
    };

    setStudents(prev => prev.map(x => x.id === studentId ? updatedS : x));
    setEditingStudent(updatedS);
    alert(`Linh thú ${nextPet.name} đã hiện diện kề vai sát cánh cùng học sĩ!`);
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

        if (data.students && Array.isArray(data.students)) {
          setStudents(data.students);
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

        // Trigger immediate sync to Supabase if user is authenticated
        if (user) {
          setIsSyncing(true);
          upsertUserSettings(user.uid, {
              students: data.students || [],
              ranksMale: data.ranksMale || [],
              ranksFemale: data.ranksFemale || [],
              skills: data.skills || [],
              petSkills: data.petSkills || petSkills,
              posSoundUrl: data.posSoundUrl || "",
              negSoundUrl: data.negSoundUrl || "",
              timerSoundUrl: data.timerSoundUrl || "",
              customLudoTiles: data.customLudoTiles || customLudoTiles
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
        customLudoTiles
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
        if (cloudData.customLudoTiles && typeof cloudData.customLudoTiles === 'object') {
          setCustomLudoTiles(cloudData.customLudoTiles);
          localStorage.setItem('custom_ludo_tiles', JSON.stringify(cloudData.customLudoTiles));
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

  const toggleAttendance = (id: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, isAbsent: !s.isAbsent } : s));
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

  const handleResolveBattle = () => {
    if (!battleStudentA || !battleStudentB) return;

    const scoreA = battleScoreA;
    const scoreB = battleScoreB;
    const diff = Math.abs(scoreA - scoreB);

    let updatedStudents = [...students];
    let resultMsg = "";
    let winner: Student | null = null;

    if (scoreA > scoreB) {
      winner = battleStudentA;
      // A wins: A gets +scoreA points, Pokemon gets +diff HP. B gets +scoreB points, Pokemon loses diff HP (-diff HP).
      updatedStudents = updatedStudents.map(s => {
        if (s.id === battleStudentA.id) {
          const newPts = s.points + scoreA;
          const oldHp = s.pet?.hp ?? 100;
          const newHp = Math.min(100, Math.max(0, oldHp + diff));
          const newPet = s.pet ? { ...s.pet, hp: newHp } : undefined;
          return {
            ...s,
            points: newPts,
            pet: newPet,
            history: [{ id: Date.now().toString() + Math.random(), amount: scoreA, reason: `🏆 Thắng Battle: +${scoreA}đ (Pokemon +${diff} HP)`, timestamp: Date.now() }, ...s.history]
          };
        }
        if (s.id === battleStudentB.id) {
          const newPts = s.points + scoreB;
          const oldHp = s.pet?.hp ?? 100;
          const newHp = Math.min(100, Math.max(0, oldHp - diff));
          const newPet = s.pet ? { ...s.pet, hp: newHp } : undefined;
          return {
            ...s,
            points: newPts,
            pet: newPet,
            history: [{ id: Date.now().toString() + Math.random(), amount: scoreB, reason: `⚔️ Thua Battle: +${scoreB}đ (Pokemon -${diff} HP)`, timestamp: Date.now() }, ...s.history]
          };
        }
        return s;
      });

      resultMsg = `🏆 ${battleStudentA.name} CHIẾN THẮNG BATTLE!\n\n• ${battleStudentA.name}: +${scoreA} điểm Hào quang (Pokemon hồi +${diff} HP)\n• ${battleStudentB.name}: +${scoreB} điểm Hào quang (Pokemon tổn hại -${diff} HP).`;
    } else if (scoreB > scoreA) {
      winner = battleStudentB;
      // B wins: B gets +scoreB points, Pokemon gets +diff HP. A gets +scoreA points, Pokemon loses diff HP (-diff HP).
      updatedStudents = updatedStudents.map(s => {
        if (s.id === battleStudentB.id) {
          const newPts = s.points + scoreB;
          const oldHp = s.pet?.hp ?? 100;
          const newHp = Math.min(100, Math.max(0, oldHp + diff));
          const newPet = s.pet ? { ...s.pet, hp: newHp } : undefined;
          return {
            ...s,
            points: newPts,
            pet: newPet,
            history: [{ id: Date.now().toString() + Math.random(), amount: scoreB, reason: `🏆 Thắng Battle: +${scoreB}đ (Pokemon +${diff} HP)`, timestamp: Date.now() }, ...s.history]
          };
        }
        if (s.id === battleStudentA.id) {
          const newPts = s.points + scoreA;
          const oldHp = s.pet?.hp ?? 100;
          const newHp = Math.min(100, Math.max(0, oldHp - diff));
          const newPet = s.pet ? { ...s.pet, hp: newHp } : undefined;
          return {
            ...s,
            points: newPts,
            pet: newPet,
            history: [{ id: Date.now().toString() + Math.random(), amount: scoreA, reason: `⚔️ Thua Battle: +${scoreA}đ (Pokemon -${diff} HP)`, timestamp: Date.now() }, ...s.history]
          };
        }
        return s;
      });

      resultMsg = `🏆 ${battleStudentB.name} CHIẾN THẮNG BATTLE!\n\n• ${battleStudentB.name}: +${scoreB} điểm Hào quang (Pokemon hồi +${diff} HP)\n• ${battleStudentA.name}: +${scoreA} điểm Hào quang (Pokemon tổn hại -${diff} HP).`;
    } else {
      // Tie
      updatedStudents = updatedStudents.map(s => {
        if (s.id === battleStudentA.id) {
          const newPts = s.points + scoreA;
          return {
            ...s,
            points: newPts,
            history: [{ id: Date.now().toString() + Math.random(), amount: scoreA, reason: `⚔️ Hòa Battle: +${scoreA}đ`, timestamp: Date.now() }, ...s.history]
          };
        }
        if (s.id === battleStudentB.id) {
          const newPts = s.points + scoreB;
          return {
            ...s,
            points: newPts,
            history: [{ id: Date.now().toString() + Math.random(), amount: scoreB, reason: `⚔️ Hòa Battle: +${scoreB}đ`, timestamp: Date.now() }, ...s.history]
          };
        }
        return s;
      });

      resultMsg = `🤝 TRẬN BATTLE HÒA NHAU!\n\nCả 2 học sĩ đều được cộng điểm và bảo toàn HP cho Pokemon.`;
    }

    setStudents(updatedStudents);
    new Audio(posSoundUrl).play().catch(() => {});

    const updatedA = updatedStudents.find(s => s.id === battleStudentA.id) || battleStudentA;
    const updatedB = updatedStudents.find(s => s.id === battleStudentB.id) || battleStudentB;
    setBattleStudentA(updatedA);
    setBattleStudentB(updatedB);

    setBattleResultSummary({
      studentA: updatedA,
      studentB: updatedB,
      winner: winner ? (updatedStudents.find(s => s.id === winner!.id) || winner) : null,
      scoreA,
      scoreB,
      diff,
      resultMsg
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
    if (student.pet && !candidates.some(p => p.dexId === student.pet?.dexId && p.name === student.pet?.name)) {
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

    const fusedPet: PokemonPet = {
      dexId: randomNewPokemon.dexId,
      name: `Hợp Thể ${randomNewPokemon.name}`,
      types: Array.from(new Set(petsToFuse.flatMap(p => p.types))),
      accessories: [],
      skills: combinedSkills,
      skillUses: combinedSkillUses,
      baseDexId: randomNewPokemon.dexId
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
    alert(`🔮 HỢP NHẤT THÀNH CÔNG!\n\nĐã dung hợp các Pokémon để tái sinh linh thú [${fusedPet.name}] tích tụ ${combinedSkills.length} tuyệt chiêu thần bí!`);
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

  const handleLudoRollDice = (student: Student) => {
    if (ludoRolling) return;
    setLudoRolling(true);
    setLudoDice(null);
    playDiceSound();

    // 1. Award +1 point for answering correctly
    let updatedStudents = students.map(s => {
      if (s.id === student.id) {
        return {
          ...s,
          points: s.points + 1,
          history: [{ id: Date.now().toString() + Math.random(), amount: 1, reason: '🎲 Trả lời đúng câu hỏi Cá Ngựa (+1đ)', timestamp: Date.now() }, ...s.history]
        };
      }
      return s;
    });

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setLudoDice(roll);
      setLudoRolling(false);

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

      // Lap completion check (+20 points)
      if (newLap > oldLap) {
        updatedStudents = updatedStudents.map(s => {
          if (s.id === student.id) {
            return {
              ...s,
              points: s.points + 20,
              history: [{ id: Date.now().toString() + Math.random(), amount: 20, reason: '🎉 Hoàn thành 1 vòng bàn cờ Cá Ngựa (+20đ)', timestamp: Date.now() }, ...s.history]
            };
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
              return {
                ...s,
                points: s.points + val,
                history: [{ id: Date.now().toString() + Math.random(), amount: val, reason: `💎 Nhặt được ${tileSpec.title} (+${val}đ)`, timestamp: Date.now() }, ...s.history]
              };
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
      setLudoLogs(prev => [...logs, ...prev].slice(0, 40));

      if (popupEvent) {
        setLudoEventPopup(popupEvent);
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#fffbf2_0%,#f5ebe0_100%)] pb-32">
      {/* NAVIGATION BAR */}
      <nav className="sticky top-0 z-40 p-3 sm:p-4 backdrop-blur-xl bg-gradient-to-r from-red-950/95 via-red-900/95 to-amber-950/95 border-b-2 border-amber-400/50 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Left: Brand */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentScreen('school')}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg group-hover:scale-105 transition-transform flex items-center justify-center">
              <span className="text-2xl">🏮</span>
            </div>
            <div className="text-white">
              <h1 className="text-lg sm:text-xl font-royal font-black uppercase tracking-tight text-amber-200 drop-shadow-sm">Đại Triều Đình</h1>
              <p className="text-[10px] text-amber-300/80 font-bold uppercase tracking-widest">Vietnamese Imperial Academy</p>
            </div>
          </div>

          {/* CENTER: LARGE ROUNDED NAV BAR - EASY TO TAP & HIGH VISIBILITY */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-full border border-white/20 shadow-inner">
            <button 
              onClick={() => setCurrentScreen('school')} 
              className={`px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-300 ${
                currentScreen === 'school' 
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-red-950 shadow-lg shadow-amber-500/30 scale-105 ring-2 ring-white/50' 
                  : 'text-amber-100 hover:bg-white/15 hover:text-white'
              }`}
            >
              <span className="text-base sm:text-lg">🏛️</span>
              <span>Kim Tự Tháp</span>
            </button>

            <button 
              onClick={() => setCurrentScreen('class')} 
              className={`px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-300 ${
                currentScreen === 'class' 
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-red-950 shadow-lg shadow-amber-500/30 scale-105 ring-2 ring-white/50' 
                  : 'text-amber-100 hover:bg-white/15 hover:text-white'
              }`}
            >
              <span className="text-base sm:text-lg">📚</span>
              <span>Lớp Học</span>
            </button>

            <button 
              onClick={() => setCurrentScreen('settings')} 
              className={`px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-300 ${
                currentScreen === 'settings' 
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-red-950 shadow-lg shadow-amber-500/30 scale-105 ring-2 ring-white/50' 
                  : 'text-amber-100 hover:bg-white/15 hover:text-white'
              }`}
            >
              <span className="text-base sm:text-lg">⚙️</span>
              <span>Cài Đặt</span>
            </button>
          </div>

          {/* Right Controls: Class Dropdown & User Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Class Dropdown */}
            <div className="relative">
              <select 
                value={filterClass} 
                onChange={e => {
                  setFilterClass(e.target.value);
                  if (currentScreen === 'school') setCurrentScreen('class');
                }} 
                className="bg-black/40 text-amber-200 border border-amber-400/40 px-3 py-2 pr-7 rounded-2xl outline-none font-black text-xs text-center appearance-none hover:bg-black/60 transition-all cursor-pointer shadow-inner"
              >
                <option value="Tất cả" className="text-black font-bold">Tất cả học sĩ</option>
                {classes.filter(c => c !== 'Tất cả').map(c => (
                  <option key={c} value={c} className="text-black font-bold">{c}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-amber-300 opacity-80">
                <span className="text-[10px]">▼</span>
              </div>
            </div>

            {/* Sync feedback dot */}
            {(lastSyncedTime || isSyncing) && (
              <div className="hidden lg:flex bg-black/40 px-3 py-1.5 rounded-full border border-amber-400/30 items-center" title={lastSyncedTime ? `Cập nhật: ${new Date(lastSyncedTime).toLocaleTimeString()}` : 'Đang kết nối...'}>
                <div className="text-[9px] font-mono text-amber-300 font-black select-none flex items-center gap-1.5">
                  {isSyncing ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>SYNC</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      <span>CLOUD: {new Date(lastSyncedTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* User Profile Button */}
            <button 
              onClick={() => setShowUserModal(true)} 
              className="flex items-center gap-2 p-1 pr-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-red-950 font-black rounded-full transition-all border border-amber-200 shadow-md active:scale-95 shrink-0"
              title="Thành viên triều đình"
            >
              <img 
                src={profile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} 
                className="w-7 h-7 rounded-full border border-white/80 object-cover" 
                alt="Avatar"
                referrerPolicy="no-referrer"
              />
              <span className="hidden sm:inline text-xs font-black max-w-[90px] truncate">{profile?.displayName || 'Sỹ Phu'}</span>
            </button>
          </div>

        </div>
      </nav>

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
              
              <button onClick={() => {
                const name = prompt("Họ tên học sĩ:");
                if (!name) return;
                const gender = confirm("Nhấn OK cho Nam, Cancel cho Nữ") ? Gender.MALE : Gender.FEMALE;
                const cls = prompt("Lớp:", filterClass !== 'Tất cả' ? filterClass : 'Mới');
                const randomDexId = LIST_POKEMONS[Math.floor(Math.random() * LIST_POKEMONS.length)].dexId;
                setStudents(prev => [...prev, { 
                  id: Date.now().toString(), 
                  name, 
                  gender, 
                  className: cls || 'Triều Đình', 
                  points: 0, 
                  history: [],
                  egg: {
                    progress: 0,
                    status: 'egg' as const,
                    assignedDexId: randomDexId
                  }
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
                    <button onClick={(e) => { e.stopPropagation(); setSelectedStudentIds([s.id]); setActiveTab('positive'); setShowSkillModal(true); }} className="bg-green-500 text-white w-10 h-10 rounded-full shadow-lg font-bold text-xl">+</button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedStudentIds([s.id]); setActiveTab('negative'); setShowSkillModal(true); }} className="bg-red-500 text-white w-10 h-10 rounded-full shadow-lg font-bold text-xl">-</button>
                  </div>
                </div>
              ))}
            </div>

            {/* CLASS BOTTOM TOOLS - LIQUID GLASS FLOATING DOCK WITH MAGNIFICATION */}
            <LiquidDock
              onRandom={handleRandom}
              onLudo={() => openLudoForClass()}
              onGroup={() => setShowGroupModal(true)}
              onTimer={() => setShowTimerModal(true)}
              onSelectAll={handleToggleSelectAll}
              isMultiSelectMode={isMultiSelectMode}
              onToggleMultiSelect={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedStudentIds([]); }}
              selectedCount={selectedStudentIds.length}
              user={user}
              isSyncing={isSyncing}
              onBackup={handleBackupToCloud}
              onRestore={handleRestoreFromCloud}
              onOpenFeedback={() => setShowSkillModal(true)}
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
                        <div className={`absolute inset-0 bg-amber-400/20 rounded-full blur-2xl transition-all duration-1000 ${editingStudent.egg && editingStudent.egg.progress >= 7 ? 'animate-ping scale-75' : ''}`} />
                        
                        <div className={`text-9xl select-none inline-block transform transition-transform ${editingStudent.egg && editingStudent.egg.progress >= 7 ? 'animate-bounce cursor-pointer' : 'hover:scale-105 duration-300'}`}>
                          {editingStudent.egg && editingStudent.egg.progress >= 10 ? '🐣' : editingStudent.egg && editingStudent.egg.progress >= 7 ? '🥚💥' : editingStudent.egg && editingStudent.egg.progress >= 4 ? '🥚⚡' : '🥚'}
                        </div>
                      </div>
                      
                      <div className="max-w-md mx-auto bg-white border border-amber-200/60 p-6 rounded-3xl shadow-sm space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-black text-amber-950">Tiến Trình Ấp Quả Trứng</span>
                          <span className="font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-xs">{(editingStudent.egg ? editingStudent.egg.progress : 0)}/10đ</span>
                        </div>
                        <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden shadow-inner border animate-pulse">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, Math.max(0, ((editingStudent.egg ? editingStudent.egg.progress : 0) / 10) * 100))}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 italic font-sans leading-relaxed">
                          {editingStudent.egg && editingStudent.egg.progress >= 10 
                            ? 'Chúc mừng! Có sinh mệnh sắp vươn mình ra khỏi lớp vỏ mỏng manh!'
                            : editingStudent.egg && editingStudent.egg.progress >= 7
                              ? 'Lớp vỏ trứng nứt sâu rộn ràng! Chỉ 1 vài nét khích lệ hào quang từ giáo sĩ là nở trứng ngay!'
                              : editingStudent.egg && editingStudent.egg.progress >= 4
                                ? 'Vỏ trứng bắt đầu xuất hiện rạn xước lấp lánh sinh lực.'
                                : 'Trứng nguyên sơ đang chờ đợi được nạp năng lượng bằng các phản hồi tích cực.'}
                        </p>

                        <div className="pt-2 flex flex-col gap-3">
                          <button 
                            onClick={() => {
                              const currentEgg = editingStudent.egg || { progress: 0, status: 'egg' as const, assignedDexId: LIST_POKEMONS[Math.floor(Math.random()*LIST_POKEMONS.length)].dexId };
                              const nextProg = currentEgg.progress + 1;
                              const isHatching = nextProg >= 10;
                              
                              let updatedEgg = { ...currentEgg, progress: Math.min(10, nextProg) };
                              let updatedPet = editingStudent.pet;

                              let historyItem: HistoryItem = { id: Date.now().toString(), amount: 1, reason: "Ủng hộ Hào Quang ấp trứng", timestamp: Date.now() };

                              if (isHatching && updatedEgg.status === 'egg') {
                                updatedEgg.status = 'hatched';
                                const meta = LIST_POKEMONS.find(p => p.dexId === currentEgg.assignedDexId) || LIST_POKEMONS[0];
                                
                                const originalBaseId = meta.dexId;
                                const evolved = getEvolvedForm(originalBaseId, editingStudent.points + 1);
                                
                                updatedPet = {
                                  dexId: evolved.dexId,
                                  name: evolved.name,
                                  types: evolved.types,
                                  accessories: [],
                                  skills: [],
                                  baseDexId: originalBaseId
                                };
                                setHatchSuccessMessage(`Tuyệt diệu! Quả trứng của học sĩ ${editingStudent.name} đã chính thức nở ra Pokémon cưng ${evolved.name}! 🎉`);
                                setShowHatchModal(true);
                              }

                              const currentMerged: Student = {
                                ...editingStudent,
                                points: editingStudent.points + 1,
                                egg: updatedEgg,
                                pet: updatedPet,
                                history: [historyItem, ...editingStudent.history].slice(0, 50)
                              };

                              setEditingStudent(currentMerged);
                              setStudents(prev => prev.map(s => s.id === editingStudent.id ? currentMerged : s));
                            }}
                            className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-2xl shadow-md hover:bg-amber-600 active:scale-95 transition-all text-xs uppercase"
                          >
                            🧪 Ủng Hộ +1đ Hào Quang Ấp Trứng
                          </button>

                          {editingStudent.egg && editingStudent.egg.progress >= 10 && (
                             <button 
                               onClick={() => {
                                 const currentEgg = editingStudent.egg!;
                                 const meta = LIST_POKEMONS.find(p => p.dexId === currentEgg.assignedDexId) || LIST_POKEMONS[0];
                                 const updatedEgg = { ...currentEgg, status: 'hatched' as const, progress: 10 };
                                 
                                 const originalBaseId = meta.dexId;
                                 const evolved = getEvolvedForm(originalBaseId, editingStudent.points);
                                 
                                 const updatedPet = {
                                   dexId: evolved.dexId,
                                   name: evolved.name,
                                   types: evolved.types,
                                   accessories: [],
                                   skills: [],
                                   baseDexId: originalBaseId
                                  };
                                 
                                 const currentMerged: Student = {
                                   ...editingStudent,
                                   egg: updatedEgg,
                                   pet: updatedPet
                                 };

                                 setEditingStudent(currentMerged);
                                 setStudents(prev => prev.map(s => s.id === editingStudent.id ? currentMerged : s));
                                 setHatchSuccessMessage(`Tin vui chấn động! Pokémon ${evolved.name} đã tung cánh bay ra từ vỏ trứng chào mừng học sĩ ${editingStudent.name}! 🐣💖`);
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
                            <div key={p.dexId} className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center justify-between gap-3 shadow-xs font-sans">
                              <div className="flex items-center gap-2 min-w-0">
                                <img 
                                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.dexId}.png`} 
                                  className="w-10 h-10 object-contain shrink-0" 
                                />
                                <div className="min-w-0">
                                  <h5 className="font-extrabold text-xs text-gray-800 truncate">{p.name}</h5>
                                  <span className="text-[8px] bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-black uppercase tracking-tight">{p.types.join('/')}</span>
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
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${editingStudent.pet.dexId}.png`}
                          className="w-full h-full object-contain relative z-10 drop-shadow-xl animate-in duration-500 hover:rotate-6 transition-transform"
                          alt={editingStudent.pet.name}
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
                            <h3 className="text-2xl font-black text-amber-950 mt-1">{editingStudent.pet.name}</h3>
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
                            value={editingStudent.pet.name} 
                            onChange={e => handleRenamePet(editingStudent.id, e.target.value)}
                            placeholder="Biệt danh mới cho pet..."
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button 
                            onClick={() => handleBuyNewEgg(editingStudent.id)}
                            className="bg-red-800 hover:bg-red-950 text-white font-bold text-xs p-3 px-5 rounded-2xl flex items-center gap-2 shadow-md transition-all active:translate-y-px font-sans"
                          >
                            <span>🥚🌟</span>
                            <span>Thỉnh Trứng Pokémon Mới (10đ)</span>
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
                            const isActive = editingStudent.pet?.dexId === p.dexId;
                            return (
                              <div key={p.dexId} className={`p-3 bg-white border rounded-2xl flex items-center justify-between gap-3 shadow-xs transition-all ${isActive ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <img 
                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.dexId}.png`} 
                                    className="w-10 h-10 object-contain shrink-0" 
                                  />
                                  <div className="min-w-0">
                                    <h5 className="font-extrabold text-xs text-gray-800 truncate">{p.name}</h5>
                                    <span className="text-[8px] bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-black uppercase tracking-tight">{p.types.join('/')}</span>
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
                              <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.dexId}.png`} className="w-16 h-16 object-contain shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-sm text-purple-950 truncate">{p.name}</h4>
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

            <SettingsSection id="sound" icon="🔊" title="Cài Đặt Âm Thanh" subtitle="Youtube hoặc audio URL cho cộng điểm, trừ điểm và timer." collapsedSections={settingsCollapsed} onToggle={toggleSettingsSection}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  ['Cộng Điểm (Tích cực)', posSoundUrl, setPosSoundUrl],
                  ['Trừ Điểm (Cần cố gắng)', negSoundUrl, setNegSoundUrl],
                  ['Timer Hết Giờ', timerSoundUrl, setTimerSoundUrl]
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
                          const randomDexId = LIST_POKEMONS[Math.floor(Math.random() * LIST_POKEMONS.length)].dexId;
                          return { id: Math.random().toString(36).substr(2, 9), name: name || 'Ẩn danh', className: cls || 'Học sĩ', points: parseInt(pts) || 0, gender: gender === 'Nữ' ? Gender.FEMALE : Gender.MALE, history: [], egg: { progress: 0, status: 'egg' as const, assignedDexId: randomDexId } };
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
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${sidebarData.student.pet.dexId}.png`}
                          className="w-20 h-20 object-contain drop-shadow"
                          alt={sidebarData.student.pet.name}
                        />
                        <span className="text-[9px] font-black text-amber-900 truncate max-w-[80px]">{sidebarData.student.pet.name}</span>
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
                      onClick={() => handleUpdatePoints(selectedStudentIds, parseInt(manualPoints), "Điều chỉnh thủ công")}
                      className="bg-purple-600 text-white text-[10px] px-4 py-2 rounded-full font-bold hover:bg-purple-700 transition-all uppercase"
                    >
                      Lưu điểm
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowSkillModal(false)} className="ml-4 text-4xl text-gray-300 hover:text-red-800 transition-colors">&times;</button>
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
                      onClick={() => handleUpdatePoints(selectedStudentIds, sk.points, sk.name)} 
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

                  {randomStudent.pet && (
                    <div className="flex flex-col items-center bg-amber-50 p-3 rounded-3xl border border-amber-200 shadow-md relative">
                      <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white shadow">
                        ❤️ {randomStudent.pet.hp ?? 100}/100
                      </div>
                      <img 
                        referrerPolicy="no-referrer"
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${randomStudent.pet.dexId}.png`}
                        className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow"
                        alt={randomStudent.pet.name}
                      />
                      <span className="text-xs font-black text-amber-950 truncate max-w-[100px] mt-1">{randomStudent.pet.name}</span>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full rounded-full ${(randomStudent.pet.hp ?? 100) > 50 ? 'bg-emerald-500' : (randomStudent.pet.hp ?? 100) > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, randomStudent.pet.hp ?? 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
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
                    onClick={() => { setShowRandomModal(false); setShowSkillModal(true); }} 
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

                    {/* Both students can roll Cá Ngựa buttons */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-amber-300 space-y-3">
                      <p className="text-xs font-black uppercase text-amber-950 tracking-wider text-center">
                        🎲 Luân Phiên Lắc Cá Ngựa (Cả 2 Học Sinh Đều Được Lắc):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setShowRandomModal(false);
                            openLudoForClass(battleResultSummary.studentA.className, battleResultSummary.studentA);
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all border-2 border-amber-400"
                        >
                          <span>🎲</span> Cho {battleResultSummary.studentA.name} Lắc Cá Ngựa
                        </button>
                        <button
                          onClick={() => {
                            setShowRandomModal(false);
                            openLudoForClass(battleResultSummary.studentB.className, battleResultSummary.studentB);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all border-2 border-purple-400"
                        >
                          <span>🎲</span> Cho {battleResultSummary.studentB.name} Lắc Cá Ngựa
                        </button>
                      </div>
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

                        {battleStudentA.pet ? (
                          <div className="bg-white p-2 rounded-2xl border border-amber-200 w-full flex items-center gap-2 mb-3">
                            <img 
                              referrerPolicy="no-referrer"
                              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${battleStudentA.pet.dexId}.png`}
                              className="w-10 h-10 object-contain shrink-0"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-[10px] font-black text-amber-900 truncate">{battleStudentA.pet.name}</p>
                              <p className="text-[9px] font-bold text-emerald-600">❤️ HP: {battleStudentA.pet.hp ?? 100}/100</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[9px] text-gray-400 italic mb-3">Chưa có Linh thú</p>
                        )}

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

                        {battleStudentB.pet ? (
                          <div className="bg-white p-2 rounded-2xl border border-purple-200 w-full flex items-center gap-2 mb-3">
                            <img 
                              referrerPolicy="no-referrer"
                              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${battleStudentB.pet.dexId}.png`}
                              className="w-10 h-10 object-contain shrink-0"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-[10px] font-black text-purple-900 truncate">{battleStudentB.pet.name}</p>
                              <p className="text-[9px] font-bold text-emerald-600">❤️ HP: {battleStudentB.pet.hp ?? 100}/100</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[9px] text-gray-400 italic mb-3">Chưa có Linh thú</p>
                        )}

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
            <button onClick={() => setShowLudoModal(false)} className="bg-amber-800 hover:bg-amber-700 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider border border-amber-600">
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

                  {ludoActiveStudent && (
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-center gap-3">
                      <img src={ludoActiveStudent.customAvatar || getRank(ludoActiveStudent.points, ludoActiveStudent.gender).avatar || 'https://api.dicebear.com/7.x/bottts/svg'} className="w-12 h-12 rounded-full border-2 border-amber-600 object-cover" />
                      <div>
                        <h4 className="font-extrabold text-amber-950 text-sm">{ludoActiveStudent.name}</h4>
                        <p className="text-[10px] font-bold text-amber-800">Đang ở ô: {ludoPositions[ludoActiveStudent.id] || 0} / 50</p>
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
                  onClick={() => ludoActiveStudent && handleLudoRollDice(ludoActiveStudent)}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-sm shadow-xl transition-all"
                >
                  {ludoRolling ? 'Đang Đổ Xí Ngầu...' : '🎲 Trả Lời Đúng & Lắc Xí Ngầu (+1đ)'}
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
