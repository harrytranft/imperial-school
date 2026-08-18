
import { Gender, LuckyWheelReward, RankInfo, Skill } from './types';

export const STORAGE_KEY = 'imperial_school_data_v6';
export const RANKS_KEY_MALE = 'imperial_ranks_male_v6';
export const RANKS_KEY_FEMALE = 'imperial_ranks_female_v6';
export const SKILLS_KEY = 'imperial_skills_v6';
export const PET_SKILLS_KEY = 'imperial_pet_skills_v1';
export const LUCKY_WHEEL_REWARDS_KEY = 'imperial_lucky_wheel_rewards_v1';
export const WHEEL_SPIN_SOUND_KEY = 'imperial_sound_wheel_spin';
export const WHEEL_FINISH_SOUND_KEY = 'imperial_sound_wheel_finish';

export const DEFAULT_RANKS_MALE: RankInfo[] = [
  { id: 'm1', level: -1, title: 'Nô tài', minPoints: -999, maxPoints: -1, color: 'text-gray-500', avatar: '' },
  { id: 'm2', level: 0, title: 'Thường dân', minPoints: 0, maxPoints: 49, color: 'text-green-600', avatar: '' },
  { id: 'm3', level: 1, title: 'Thị vệ', minPoints: 50, maxPoints: 99, color: 'text-blue-600', avatar: '' },
  { id: 'm4', level: 2, title: 'Trainer Pro', minPoints: 100, maxPoints: 149, color: 'text-cyan-700', avatar: '' },
  { id: 'm5', level: 3, title: 'Ace Trainer', minPoints: 150, maxPoints: 199, color: 'text-indigo-700', avatar: '' },
  { id: 'm6', level: 4, title: 'Thân vương', minPoints: 200, maxPoints: 249, color: 'text-orange-600', avatar: '' },
  { id: 'm7', level: 5, title: 'Champion Trainer', minPoints: 250, maxPoints: 99999, color: 'text-red-600 font-bold', avatar: '' },
];

export const DEFAULT_RANKS_FEMALE: RankInfo[] = [
  { id: 'f1', level: -1, title: 'Nô tì', minPoints: -999, maxPoints: -1, color: 'text-gray-500', avatar: '' },
  { id: 'f2', level: 0, title: 'Thường dân', minPoints: 0, maxPoints: 49, color: 'text-green-600', avatar: '' },
  { id: 'f3', level: 1, title: 'Tú nữ', minPoints: 50, maxPoints: 99, color: 'text-pink-600', avatar: '' },
  { id: 'f4', level: 2, title: 'Trainer Pro', minPoints: 100, maxPoints: 149, color: 'text-red-500', avatar: '' },
  { id: 'f5', level: 3, title: 'Quý phi', minPoints: 150, maxPoints: 199, color: 'text-rose-600', avatar: '' },
  { id: 'f6', level: 4, title: 'Elite Trainer', minPoints: 200, maxPoints: 249, color: 'text-orange-600', avatar: '' },
  { id: 'f7', level: 5, title: 'Champion Trainer', minPoints: 250, maxPoints: 99999, color: 'text-red-600 font-bold', avatar: '' },
];

export const DEFAULT_SKILLS: Skill[] = [
  // Positive
  { id: 'p1', name: 'Trả lời đúng', icon: '✅', points: 2, type: 'positive' },
  { id: 'p2', name: '+1', icon: '👍', points: 1, type: 'positive' },
  { id: 'p3', name: '+2', icon: '🔄', points: 2, type: 'positive' },
  { id: 'p4', name: '+3', icon: '🥳', points: 3, type: 'positive' },
  { id: 'p5', name: '+4', icon: '🖐️', points: 4, type: 'positive' },
  { id: 'p6', name: '+5', icon: '🎨', points: 5, type: 'positive' },
  { id: 'p7', name: 'Học tốt', icon: '🏅', points: 5, type: 'positive' },
  { id: 'p8', name: 'Giải thích được', icon: '🛡️', points: 3, type: 'positive' },
  { id: 'p9', name: 'Tập trung vào bài', icon: '📖', points: 3, type: 'positive' },
  { id: 'p10', name: 'Đi học đúng giờ', icon: '🔍', points: 3, type: 'positive' },
  { id: 'p11', name: 'Quay video sớm nhất', icon: '💎', points: 5, type: 'positive' },
  { id: 'p12', name: 'Trực nhật', icon: '⭐', points: 3, type: 'positive' },
  { id: 'p13', name: 'Đội thắng', icon: '👑', points: 5, type: 'positive' },
  { id: 'p14', name: 'Hoàn thành Quizlet', icon: '✈️', points: 5, type: 'positive' },
  { id: 'p15', name: 'Hoàn thành BTVN', icon: '📔', points: 5, type: 'positive' },
  { id: 'p16', name: 'Thuyết trình hay', icon: '🎓', points: 5, type: 'positive' },
  // Negative
  { id: 'n1', name: 'Không trả lời được', icon: '❓', points: -2, type: 'negative' },
  { id: 'n2', name: '-1', icon: '🔔', points: -1, type: 'negative' },
  { id: 'n3', name: '-2', icon: '🔔', points: -2, type: 'negative' },
  { id: 'n4', name: '-3', icon: '🔔', points: -3, type: 'negative' },
  { id: 'n5', name: '-4', icon: '🔔', points: -4, type: 'negative' },
  { id: 'n6', name: '-5', icon: '🔔', points: -5, type: 'negative' },
  { id: 'n7', name: 'Không giải thích được', icon: '🧪', points: -3, type: 'negative' },
  { id: 'n8', name: 'Không tập trung', icon: '🌲', points: -3, type: 'negative' },
  { id: 'n9', name: 'Nói chuyện', icon: '🗣️', points: -3, type: 'negative' },
  { id: 'n10', name: 'Không quay video', icon: '🎤', points: -5, type: 'negative' },
  { id: 'n11', name: 'Chưa làm Quizlet', icon: '✈️', points: -5, type: 'negative' },
  { id: 'n12', name: 'Làm việc riêng', icon: '🪐', points: -3, type: 'negative' },
  { id: 'n13', name: 'Chuẩn bị bài chưa tốt', icon: '♻️', points: -3, type: 'negative' },
  { id: 'n14', name: 'Cãi nhau', icon: '🎒', points: -5, type: 'negative' },
  { id: 'n15', name: 'Không tham gia games', icon: '🐲', points: -5, type: 'negative' },
  { id: 'n16', name: 'Nghịch đồ dạy học', icon: '👎', points: -5, type: 'negative' },
  { id: 'n17', name: 'Ngồi không đẹp', icon: '🍦', points: -4, type: 'negative' },
  { id: 'n18', name: 'Nói bậy', icon: '🗑️', points: -5, type: 'negative' },
  { id: 'n19', name: 'Đi học muộn', icon: '💬', points: -3, type: 'negative' },
  { id: 'n20', name: 'Không mang sách vở', icon: '✈️', points: -4, type: 'negative' },
];

export const DEFAULT_LUCKY_WHEEL_REWARDS: LuckyWheelReward[] = [
  ...Array.from({ length: 10 }, (_, idx) => ({
    id: `points_plus_${idx + 1}`,
    label: `Cộng ${idx + 1} điểm`,
    icon: '✨',
    type: 'points' as const,
    amount: idx + 1,
    color: idx % 2 === 0 ? '#16a34a' : '#22c55e'
  })),
  ...Array.from({ length: 10 }, (_, idx) => ({
    id: `points_minus_${idx + 1}`,
    label: `Trừ ${idx + 1} điểm`,
    icon: '⚡',
    type: 'points' as const,
    amount: -(idx + 1),
    color: idx % 2 === 0 ? '#dc2626' : '#f97316'
  })),
  { id: 'pokemon_gift_1', label: 'Tặng Pokemon', icon: '🎁', type: 'pokemon', color: '#f59e0b' },
  { id: 'pokemon_gift_2', label: 'Tặng Pokemon hiếm', icon: '🥚', type: 'pokemon', color: '#d97706' },
  { id: 'pokemon_gift_3', label: 'Tặng Pokemon mới', icon: '🌟', type: 'pokemon', color: '#fbbf24' },
  { id: 'skill_gift_1', label: 'Tặng skill Pokemon', icon: '📜', type: 'skill', color: '#7c3aed' },
  { id: 'skill_gift_2', label: 'Tặng bí kíp Pet', icon: '🔮', type: 'skill', color: '#9333ea' },
  { id: 'skill_gift_3', label: 'Tặng tuyệt chiêu', icon: '💫', type: 'skill', color: '#a855f7' },
  { id: 'hp_plus_5', label: 'Cộng 5 HP', icon: '❤️', type: 'hp', amount: 5, color: '#059669' },
  { id: 'hp_plus_10', label: 'Cộng 10 HP', icon: '💚', type: 'hp', amount: 10, color: '#10b981' },
  { id: 'hp_plus_15', label: 'Cộng 15 HP', icon: '💖', type: 'hp', amount: 15, color: '#34d399' },
  { id: 'hp_plus_20', label: 'Cộng 20 HP', icon: '💎', type: 'hp', amount: 20, color: '#2dd4bf' },
  { id: 'hp_minus_5', label: 'Trừ 5 HP', icon: '💔', type: 'hp', amount: -5, color: '#be123c' },
  { id: 'hp_minus_10', label: 'Trừ 10 HP', icon: '🩹', type: 'hp', amount: -10, color: '#e11d48' },
  { id: 'hp_minus_15', label: 'Trừ 15 HP', icon: '🔥', type: 'hp', amount: -15, color: '#ea580c' },
  { id: 'hp_minus_20', label: 'Trừ 20 HP', icon: '🌩️', type: 'hp', amount: -20, color: '#b91c1c' },
  { id: 'ludo_rolls_1', label: 'Lắc Cá Ngựa 1 lần', icon: '🎲', type: 'ludo_rolls', amount: 1, color: '#2563eb' },
  { id: 'ludo_rolls_2', label: 'Lắc Cá Ngựa 2 lần', icon: '🎲', type: 'ludo_rolls', amount: 2, color: '#0ea5e9' },
  { id: 'ludo_rolls_3', label: 'Lắc Cá Ngựa 3 lần', icon: '🎲', type: 'ludo_rolls', amount: 3, color: '#0891b2' },
  { id: 'ludo_rolls_4', label: 'Lắc Cá Ngựa 4 lần', icon: '🎲', type: 'ludo_rolls', amount: 4, color: '#7c3aed' },
  { id: 'ludo_rolls_5', label: 'Lắc Cá Ngựa 5 lần', icon: '🎲', type: 'ludo_rolls', amount: 5, color: '#c026d3' }
];

export const DEFAULT_LUDO_TILES: Record<number, { tileIndex: number; title: string; desc: string; icon: string; type: 'portal' | 'curse' | 'treasure' | 'monster' | 'restart'; value?: number }> = {
  3: { tileIndex: 3, title: '🚀 Turbo Boost', desc: 'Phóng vọt 4 bước về phía trước!', icon: '🚀', type: 'portal', value: 4 },
  5: { tileIndex: 5, title: '🌀 Cổng Dịch Chuyển', desc: 'Cuồng phong thần tốc kéo bạn tiến nhanh 3 bước!', icon: '🌀', type: 'portal', value: 3 },
  8: { tileIndex: 8, title: '⚠️ Chướng Ngại Vật', desc: 'Gặp chướng ngại vật! Lượt sau phải tung xúc xắc 6 điểm mới vượt qua!', icon: '⚠️', type: 'monster' },
  12: { tileIndex: 12, title: '⚡ Giày Thần Kỳ', desc: 'Nhảy vọt 3 bước thần tốc!', icon: '⚡', type: 'portal', value: 3 },
  14: { tileIndex: 14, title: '📜 Bùa Chú Thoái Lùi', desc: 'Dẫm phải bùa chú cổ đại! Bị đẩy lùi 5 bước.', icon: '📜', type: 'curse', value: -5 },
  18: { tileIndex: 18, title: '💎 Rương Châu Báu', desc: 'Nhặt được rương châu báu Trạng nguyên! Thưởng +5 điểm Hào quang!', icon: '💎', type: 'treasure', value: 5 },
  22: { tileIndex: 22, title: '👹 Quái Vật Rồng Lửa', desc: 'Rồng Lửa chặn đường! Phải lắc Xúc sắc 6 điểm lượt sau mới thoát.', icon: '👹', type: 'monster' },
  25: { tileIndex: 25, title: '🍌 Vỏ Chuối Trơn Trượt', desc: 'Trượt vỏ chuối! Bị giật lùi 3 bước!', icon: '🍌', type: 'curse', value: -3 },
  27: { tileIndex: 27, title: '🌀 Cổng Thần Tốc', desc: 'Cổng không gian đưa bạn vượt 3 bước.', icon: '🌀', type: 'portal', value: 3 },
  30: { tileIndex: 30, title: '⭐ Trainer Badge', desc: 'Nhận huy hiệu trainer! Thưởng ngay +8 điểm Hào quang!', icon: '⭐', type: 'treasure', value: 8 },
  32: { tileIndex: 32, title: '📜 Bùa Ngải Hãm Hại', desc: 'Bùa ngải che mắt! Bị giật lùi 5 bước.', icon: '📜', type: 'curse', value: -5 },
  35: { tileIndex: 35, title: '💣 Bom Nổ Bùng Nổ', desc: 'Sức ép bùng nổ hất văng lùi 4 bước!', icon: '💣', type: 'curse', value: -4 },
  38: { tileIndex: 38, title: '👹 Quái Vật Bóng Đêm', desc: 'Quái vật bóng đêm! Cần lắc 6 điểm ở lượt kế tiếp để bứt phá.', icon: '👹', type: 'monster' },
  41: { tileIndex: 41, title: '💎 Kho Báu Trainer', desc: 'Bảo vật vinh quang ban thưởng +5 điểm Hào quang!', icon: '💎', type: 'treasure', value: 5 },
  45: { tileIndex: 45, title: '📜 Bùa Chú Lùi Bước', desc: 'Chạm trán bùa phong ấn! Thu lùi 5 bước.', icon: '📜', type: 'curse', value: -5 },
  48: { tileIndex: 48, title: '✨ Final Sprint', desc: 'Bứt tốc cuối đường! Tiến thẳng 1 bước chạm đích vinh quang!', icon: '✨', type: 'portal', value: 1 }
};
