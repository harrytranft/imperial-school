
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

export interface StudentEgg {
  progress: number; // For egg status: 0-10. At 10, it hatches.
  status: 'egg' | 'hatched';
  assignedDexId: number; // Pre-rolled so they get a specific Pokémon
}

export interface PokemonPet {
  dexId: number;
  name: string;
  types: string[];
  hp?: number; // Health points (0 - 100)
  accessories: string[]; // List of accessory IDs
  skills: string[]; // List of skill IDs
  skillUses?: Record<string, number>; // Maps skillId to number of times used (max 2)
  baseDexId?: number; // Original base Pokemon dexId for evolution stages
}

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  className: string;
  points: number;
  history: HistoryItem[];
  isAbsent?: boolean;
  customAvatar?: string; // Custom Base64 avatar photo uploaded for student
  egg?: StudentEgg;
  pet?: PokemonPet;
  pets?: PokemonPet[]; // List of all acquired pets
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
