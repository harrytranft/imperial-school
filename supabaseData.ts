import { supabase } from './supabaseClient';
import { ClassBossState, LuckyWheelReward, RankInfo, Skill, Student, LudoTileSpec } from './types';
import { PetSkill } from './pokemonData';

export interface UserSettingsData {
  students: Student[];
  ranksMale: RankInfo[];
  ranksFemale: RankInfo[];
  skills: Skill[];
  petSkills?: PetSkill[];
  posSoundUrl: string;
  negSoundUrl: string;
  timerSoundUrl: string;
  wheelSpinSoundUrl?: string;
  wheelFinishSoundUrl?: string;
  customLudoTiles?: Record<number, LudoTileSpec>;
  luckyWheelRewards?: LuckyWheelReward[];
  bossStatesByClass?: Record<string, ClassBossState>;
  updatedAt?: number;
}

export const sanitizeForSupabase = (val: any): any => {
  if (val === undefined) return null;
  if (val === null) return null;
  if (Array.isArray(val)) {
    return val.map(sanitizeForSupabase);
  }
  if (typeof val === 'object') {
    if (val instanceof Date) return val.toISOString();
    const clean: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        const v = val[key];
        if (v !== undefined) {
          clean[key] = sanitizeForSupabase(v);
        }
      }
    }
    return clean;
  }
  return val;
};

export const fetchUserSettings = async (userId: string): Promise<UserSettingsData | null> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    students: Array.isArray(data.students) ? data.students : [],
    ranksMale: Array.isArray(data.ranks_male) ? data.ranks_male : [],
    ranksFemale: Array.isArray(data.ranks_female) ? data.ranks_female : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    petSkills: Array.isArray(data.pet_skills) ? data.pet_skills : undefined,
    posSoundUrl: data.pos_sound_url || '',
    negSoundUrl: data.neg_sound_url || '',
    timerSoundUrl: data.timer_sound_url || '',
    wheelSpinSoundUrl: data.wheel_spin_sound_url || '',
    wheelFinishSoundUrl: data.wheel_finish_sound_url || '',
    customLudoTiles: data.custom_ludo_tiles || {},
    luckyWheelRewards: Array.isArray(data.lucky_wheel_rewards) ? data.lucky_wheel_rewards : undefined,
    bossStatesByClass: data.boss_states_by_class || {},
    updatedAt: data.updated_at_ms || undefined
  };
};

export const upsertUserSettings = async (userId: string, settings: UserSettingsData): Promise<number> => {
  const updatedAt = Date.now();
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      students: sanitizeForSupabase(settings.students || []),
      ranks_male: sanitizeForSupabase(settings.ranksMale || []),
      ranks_female: sanitizeForSupabase(settings.ranksFemale || []),
      skills: sanitizeForSupabase(settings.skills || []),
      pet_skills: sanitizeForSupabase(settings.petSkills || []),
      pos_sound_url: settings.posSoundUrl || '',
      neg_sound_url: settings.negSoundUrl || '',
      timer_sound_url: settings.timerSoundUrl || '',
      wheel_spin_sound_url: settings.wheelSpinSoundUrl || '',
      wheel_finish_sound_url: settings.wheelFinishSoundUrl || '',
      custom_ludo_tiles: sanitizeForSupabase(settings.customLudoTiles || {}),
      lucky_wheel_rewards: sanitizeForSupabase(settings.luckyWheelRewards || []),
      boss_states_by_class: sanitizeForSupabase(settings.bossStatesByClass || {}),
      updated_at_ms: updatedAt,
      updated_at: new Date(updatedAt).toISOString()
    }, { onConflict: 'user_id' });

  if (error) throw error;
  return updatedAt;
};
