# PLAN.md — Imperial School 3.0: Trainer Journey + Boss Raid

> Tài liệu triển khai dành cho Codex, viết dựa trên code mới nhất của Imperial School.
>
> Mục tiêu: tiếp tục mở rộng hệ Pokémon theo hướng **passive / automatic**, tăng attachment và mục tiêu dài hạn cho học sinh nhưng **không làm giáo viên mất thêm thời gian trong 60 phút chữa bài**.
>
> Tính năng trọng tâm mới của phiên bản này: **BOSS RAID trong Random**.

---

# 0. PRODUCT CONTEXT

Imperial School dùng trong lesson 90 phút:

- Khoảng 30 phút: Listening Dictation, không dùng Imperial School.
- Khoảng 60 phút: giáo viên chữa nhiều bài tập.
- Workflow chính hiện tại là:
  1. Random Solo hoặc Battle.
  2. Học sinh trả lời.
  3. Giáo viên cộng/trừ điểm hoặc chốt Battle.
  4. Tiếp tục chữa bài.

Do đó mọi tính năng mới phải tuân theo nguyên tắc:

> **Teacher Interaction Budget ≈ 0**

Không biến Imperial School thành một game cần dừng tiết học lâu để thao tác.

---

# 1. CURRENT CODEBASE — NHỮNG GÌ ĐÃ CÓ

Code mới nhất hiện đã có:

- React + TypeScript + Vite.
- Supabase cloud sync.
- JSON backup/import.
- Student management theo lớp.
- Attendance Check.
- Homework Check.
- Hào Quang + Rank.
- Random Solo.
- Random Battle.
- Fair round-robin queue cho Solo (`uncalledMap`).
- Pokémon active `student.pet`.
- Pokémon collection `student.pets[]`.
- `PokemonPet.instanceId`.
- HP Pokémon.
- Pokémon bị mất khi HP = 0.
- Modal chọn Pokémon khác sau khi Pokémon bị mất.
- Mua/ấp trứng khi không còn Pokémon.
- Normal Egg / Special Egg.
- Pokémon XP + Level.
- Bond.
- Charge.
- Passive Ability.
- Answer Streak.
- Battle Win Streak.
- Homework Streak.
- Attendance Streak.
- Random Drop.
- Shiny.
- Mastery.
- Evolution.
- Pokémon Skills.
- Lucky Wheel.
- Cá Ngựa.

Các file quan trọng hiện tại:

- `App.tsx`
- `types.ts`
- `pokemonData.ts`
- `pokemonProgression.ts`
- `pokemonPassives.ts`
- `gameEvents.ts`
- `gameEvents.test.ts`
- `components/PokemonMiniStatus.tsx`
- `components/PokemonReactionToast.tsx`
- `components/HomeworkCheckModal.tsx`
- `components/AttendanceCheckModal.tsx`
- `supabaseData.ts`

Không được phá các flow hiện tại khi triển khai phiên bản này.

---

# 2. NON-NEGOTIABLE GAME RULES

## 2.1. Hào Quang ↔ HP Pokémon

Giữ nguyên triết lý hiện tại:

- Thưởng `+N Hào Quang` từ học tập → Pokémon active hồi `+N HP`.
- Phạt `-N Hào Quang` → Pokémon active mất `N HP`.
- HP clamp trong `0..100`.

Không gây HP damage khi học sinh **tiêu** Hào Quang để mua item/skill/trứng.

## 2.2. Battle

Giữ nguyên Battle hiện tại:

- Winner/loser HP theo chênh lệch Battle.
- Không double-apply Aura→HP lần thứ hai.

## 2.3. Pokémon HP = 0

Giữ nguyên luật lõi:

- Pokémon HP <= 0 → Pokémon đó mất khỏi collection.
- Không revive.
- Nếu còn Pokémon → bắt buộc chọn Pokémon khác.
- Nếu hết Pokémon → có thể mua trứng.
- Nếu không đủ Hào Quang → không khóa app.

Boss Raid cũng phải dùng đúng luật này.

## 2.4. Không Global Pokédex

**Không phát triển Global Pokédex.**

Không thêm:

- Pokédex toàn hệ thống.
- Tỷ lệ collection toàn server.
- So sánh Pokédex giữa lớp.
- Global collection leaderboard.

Collection cá nhân hiện có (`pets[]`) vẫn được giữ vì đó là tài sản Pokémon của từng học sinh.

---

# 3. FEATURE PRIORITIES FOR IMPERIAL SCHOOL 3.0

Thứ tự ưu tiên:

1. **Boss Raid trong Random — PRIORITY P0**
2. Legendary Egg + Egg Inventory — P0, dependency của Boss reward.
3. Pokémon Nature / Personality — P1.
4. Trainer Level + Trainer Titles — P1.
5. Gym Badges — P1.
6. Pokémon Expedition — P1.
7. Weekly Chest — P2.
8. Adventure Journal — P2.
9. Support Pokémon + Synergy — P3.
10. Cosmetic Aura / Mastery visuals — P3.

Không làm tất cả cùng một commit.

---

# 4. BOSS RAID — PRODUCT DESIGN

## 4.1. Mục tiêu

Boss phải tạo cảm giác:

> “Sau nhiều lượt Random bình thường, Boss bất ngờ xuất hiện. 5 trainer phải phối hợp. Chỉ cần 1 người sai là cả đội bị Boss phản công.”

Boss là một **rare encounter**, không phải mode giáo viên spam liên tục.

Một Boss có HP rất lớn và tồn tại qua nhiều lesson cho đến khi bị tiêu diệt.

---

# 5. RANDOM MODAL — THÊM TAB BOSS

Hiện tại:

```ts
type RandomMode = 'solo' | 'battle'
```

Đổi thành:

```ts
type RandomMode = 'solo' | 'battle' | 'boss'
```

Random modal có 3 tab:

- 👤 Solo
- ⚔️ Battle
- 👹 Boss

### Boss tab khi Boss chưa xuất hiện

Không cho giáo viên force Boss tùy ý.

Hiển thị dạng preview:

```text
👹 BOSS ĐANG ẨN NẤP

Boss vẫn đang ở đâu đó...
Tiếp tục Random Solo/Battle để tìm Boss.

Normal Random since last encounter: 7
```

Không cần hiển thị exact threshold để giữ yếu tố bất ngờ.

### Boss tab khi encounter đã trigger

Hiển thị Boss Battle UI và 5 học sinh vừa được random.

---

# 6. BOSS ENCOUNTER SYSTEM

Boss không được xuất hiện ở mọi lần Random.

## 6.1. Per-class Boss state

Boss state phải lưu **theo class**, không dùng chung toàn app.

Ví dụ:

```ts
export interface ClassBossState {
  className: string;
  boss: BossInstance;
  randomsSinceLastEncounter: number;
  nextEncounterAt: number;
  encounterReady: boolean;
  contributionByStudentId: Record<string, BossContribution>;
  participantQueue: string[];
  defeatedBosses: number;
  updatedAt: number;
}
```

## 6.2. Pre-rolled encounter threshold

Không dùng pure `% chance` vì có thể Boss xuất hiện quá sớm hoặc quá lâu không xuất hiện.

Mỗi lần Boss encounter kết thúc, pre-roll lượt xuất hiện tiếp theo:

```ts
const BOSS_MIN_RANDOM_GAP = 8;
const BOSS_MAX_RANDOM_GAP = 14;
```

Ví dụ:

```ts
nextEncounterAt = randomIntInclusive(8, 14)
```

Sau mỗi **resolved Solo hoặc Battle**:

```ts
randomsSinceLastEncounter += 1
```

Khi:

```ts
randomsSinceLastEncounter >= nextEncounterAt
```

thì **lần bấm Random kế tiếp** phải mở Boss mode thay vì Solo/Battle.

Sau khi Boss round được resolve:

```ts
randomsSinceLastEncounter = 0
nextEncounterAt = randomIntInclusive(8, 14)
encounterReady = false
```

### Quan trọng

Không tăng counter khi:

- giáo viên mở Random rồi đóng mà chưa resolve.
- mở profile.
- mở Shop.
- Lucky Wheel.
- Homework Check.
- Attendance Check.

Chỉ tính lượt Random thực sự hoàn tất.

---

# 7. ACTIVE BOSS LIFECYCLE

Mỗi class có **1 Boss active tại một thời điểm**.

Boss không biến mất sau một lesson.

Boss state persist qua:

- refresh.
- logout/login.
- chuyển class.
- mở app ở thiết bị khác sau sync.

Ví dụ Boss mặc định:

```ts
export interface BossDefinition {
  id: string;
  name: string;
  image?: string;
  icon: string;
  maxHp: number;
  failDamage: number;
  damagePerSuccessfulStudent: number;
  tier: 'standard' | 'elite' | 'legendary';
}
```

Suggested presets:

```ts
const BOSS_PRESETS: BossDefinition[] = [
  {
    id: 'shadow-dragon',
    name: 'Shadow Dragon',
    icon: '🐲',
    maxHp: 500,
    failDamage: 10,
    damagePerSuccessfulStudent: 5,
    tier: 'standard'
  },
  {
    id: 'ancient-tyrant',
    name: 'Ancient Tyrant',
    icon: '👹',
    maxHp: 750,
    failDamage: 12,
    damagePerSuccessfulStudent: 5,
    tier: 'elite'
  },
  {
    id: 'void-emperor',
    name: 'Void Emperor',
    icon: '🌌',
    maxHp: 1000,
    failDamage: 15,
    damagePerSuccessfulStudent: 5,
    tier: 'legendary'
  }
];
```

Initial implementation chỉ cần 1 Boss mặc định cũng được.

**Không bắt buộc tạo artwork mới trong Milestone 1.** Có thể dùng icon + CSS trước.

---

# 8. BOSS HP

Boss instance:

```ts
export interface BossInstance {
  instanceId: string;
  definitionId: string;
  name: string;
  maxHp: number;
  currentHp: number;
  failDamage: number;
  damagePerSuccessfulStudent: number;
  spawnedAt: number;
  defeatedAt?: number;
}
```

Default Standard Boss:

```text
Max HP = 500
Party size = 5
Damage/student = 5
Successful round damage = 25
```

Do đó cần khoảng:

```text
500 / 25 = 20 successful Boss encounters
```

Boss phải là mục tiêu kéo dài qua nhiều lesson.

Không reset HP khi kết thúc lesson.

---

# 9. RANDOM 5 TRAINERS FOR BOSS

## 9.1. Eligibility

Một trainer đủ điều kiện vào Boss party khi:

```ts
!student.isAbsent
&& student.attendanceStatus !== 'absent'
&& !!student.pet
&& (student.pet.hp ?? 0) > 0
```

Lý do phải có active Pokémon:

- Boss failure gây HP damage.
- Trainer không có Pokémon sẽ không chịu cùng mức risk với các bạn khác.

## 9.2. Phải đủ 5 trainer

Nếu class hiện có < 5 trainer eligible:

- Không consume Boss encounter.
- Không reset counter.
- Hiện message:

```text
Boss đã xuất hiện nhưng cần ít nhất 5 trainer đang có Pokémon để chiến đấu.
```

Boss encounter vẫn ở trạng thái ready cho lần sau.

## 9.3. Fair Boss Queue

Không dùng hoàn toàn random mỗi lần vì có thể một số học sinh liên tục bị chọn và dễ thống trị contribution leaderboard.

Tạo queue riêng:

```ts
bossParticipantQueueByClass: Record<string, string[]>
```

Nguyên tắc:

1. Queue chứa tất cả eligible trainer IDs theo thứ tự shuffle.
2. Mỗi Boss encounter lấy 5 ID đầu.
3. Remove 5 ID đó khỏi queue.
4. Khi queue còn < 5:
   - tạo cycle mới bằng cách shuffle toàn bộ eligible trainer.
   - tránh chọn lại ngay các trainer ở party trước nếu đủ số lượng học sinh.

Mục tiêu:

> Random nhưng gần như mọi học sinh đều có cơ hội tương đương.

---

# 10. BOSS ROUND UI

Khi Boss xuất hiện, modal phải rõ nhưng nhanh.

Suggested layout:

```text
                 👹 SHADOW DRAGON
                HP 375 / 500
          ███████████████░░░░░

   [Trainer 1] [Trainer 2] [Trainer 3] [Trainer 4] [Trainer 5]
   Pokémon      Pokémon      Pokémon      Pokémon      Pokémon
   HP 72        HP 48        HP 96        HP 31        HP 84

          CẢ 5 TRAINER PHẢI TRẢ LỜI ĐÚNG

   ✅ CẢ 5 ĐỀU ĐÚNG          ❌ CÓ ÍT NHẤT 1 BẠN SAI
```

Không bắt giáo viên nhập điểm cho từng học sinh.

Không bắt click từng học sinh đúng/sai.

Chỉ có **2 nút resolve chính**.

### Success

```text
✅ CẢ 5 ĐỀU ĐÚNG
```

### Failure

```text
❌ CÓ ÍT NHẤT 1 BẠN SAI
```

Đây là workflow nhanh nhất và đúng yêu cầu:

> Chỉ cần 1 trong 5 trả lời sai thì cả đội thất bại.

---

# 11. BOSS ROUND — SUCCESS RULE

Khi giáo viên bấm:

```text
✅ CẢ 5 ĐỀU ĐÚNG
```

## 11.1. Học sinh

Mỗi trong 5 trainer:

```text
+5 Hào Quang
```

Phải đi qua shared Aura update logic để giữ đúng cơ chế hiện tại:

```text
+5 Aura → active Pokémon +5 HP
```

Không bypass HP healing.

History:

```text
👹 Boss Raid thành công: +5 Hào Quang
```

## 11.2. Boss damage

Mỗi trainer đóng góp:

```ts
damagePerSuccessfulStudent = 5
```

Party 5 người:

```ts
roundDamage = 5 * 5 = 25
```

Boss:

```ts
boss.currentHp = Math.max(0, boss.currentHp - 25)
```

UI animation/toast:

```text
💥 PERFECT TEAM ATTACK!
Shadow Dragon -25 HP

Minh +5 Hào Quang
Lan +5 Hào Quang
...
```

Animation tối đa khoảng 1–1.5 giây và không block lâu.

---

# 12. BOSS ROUND — FAILURE RULE

Khi giáo viên bấm:

```text
❌ CÓ ÍT NHẤT 1 BẠN SAI
```

## 12.1. Không trừ Hào Quang

Failure **không trừ Hào Quang**.

Boss trực tiếp gây damage Pokémon.

Ví dụ Standard Boss:

```ts
failDamage = 10
```

Mỗi trong 5 active Pokémon:

```text
-10 HP
```

History:

```text
👹 Boss phản công: Pokémon -10 HP
```

Boss không mất HP.

## 12.2. Không giảm XP/Bond/Streak

Không punishment stacking.

Failure chỉ gây:

- Pokémon HP damage.

Không gây:

- Aura penalty.
- Pokémon XP loss.
- Bond loss.
- Trainer XP loss.
- Homework Streak reset.

---

# 13. MULTIPLE POKÉMON DEATHS IN ONE BOSS ROUND

Đây là edge case bắt buộc xử lý.

Boss failure có thể làm **nhiều Pokémon cùng về 0 HP**.

Code hiện tại dùng một `pokemonReleaseEvent`.

Boss cần hỗ trợ queue:

```ts
const [pokemonReleaseQueue, setPokemonReleaseQueue] = useState<PokemonReleaseEvent[]>([])
```

Flow:

1. Apply Boss damage cho cả 5.
2. Thu tất cả `releaseEvent`.
3. Push vào queue.
4. Hiển thị release modal cho event đầu tiên.
5. Học sinh chọn Pokémon khác / mua trứng / đóng theo flow hiện tại.
6. Sau khi xử lý event đó → pop queue → hiện event tiếp theo.
7. Chỉ khi queue hết mới quay lại normal Random flow.

Không được bỏ mất event nếu 2–5 Pokémon chết cùng lúc.

---

# 14. BOSS CONTRIBUTION SYSTEM

Cần xác định chính xác Top 5 người có công nhất khi Boss chết.

```ts
export interface BossContribution {
  studentId: string;
  successfulRounds: number;
  damageDealt: number;
  appearances: number;
  failedRounds: number;
  firstContributionAt?: number;
  lastContributionAt?: number;
}
```

## 14.1. Khi student xuất hiện trong Boss party

```ts
appearances += 1
```

## 14.2. Success

Mỗi người:

```ts
successfulRounds += 1
damageDealt += boss.damagePerSuccessfulStudent // default 5
```

## 14.3. Failure

Mỗi người:

```ts
failedRounds += 1
```

Không cộng damage.

## 14.4. Top 5 ranking

Sort:

1. `damageDealt DESC`
2. `successfulRounds DESC`
3. `appearances ASC` — cùng damage nhưng làm được với ít lượt hơn thì ưu tiên.
4. `firstContributionAt ASC`
5. `studentId ASC` deterministic fallback.

UI Boss tab có thể hiển thị compact leaderboard:

```text
🏆 TOP CONTRIBUTORS
1. Minh      45 DMG
2. Lan       40 DMG
3. Huy       35 DMG
4. An        35 DMG
5. Phương    30 DMG
```

Không cần mở leaderboard riêng trong lesson.

---

# 15. BOSS DEFEATED FLOW

Khi:

```ts
boss.currentHp <= 0
```

Không random Boss mới ngay lập tức.

Hiện Boss Defeated modal:

```text
🏆 BOSS DEFEATED!

Shadow Dragon đã bị đánh bại!

TOP 5 CONTRIBUTORS
🥇 Minh — 45 DMG
🥈 Lan — 40 DMG
🥉 Huy — 35 DMG
4. An — 35 DMG
5. Phương — 30 DMG

Mỗi trainer Top 5 nhận:
✨ +5 Hào Quang
🥚 1 Legendary Egg
```

## 15.1. Reward Top 5

Mỗi Top 5:

```text
+5 Hào Quang
+1 Legendary Egg
```

`+5 Hào Quang` phải dùng shared point update logic:

```text
+5 Aura → +5 HP active Pokémon
```

Nếu trainer vừa mất Pokémon ở round cuối và hiện chưa có active Pokémon:

- vẫn nhận +5 Aura.
- không có pet thì không heal HP.
- vẫn nhận Legendary Egg.

## 15.2. Không reward party cuối cùng riêng biệt ngoài normal success

Nếu round cuối thành công:

- 5 trainer của round đó vẫn nhận normal `+5 Aura` từ success.
- Sau khi Boss chết, nếu họ nằm trong Top 5 contribution thì nhận thêm Boss Kill Reward `+5 Aura + Legendary Egg`.

Điều này là intentional.

History phải ghi tách:

```text
👹 Boss Raid thành công: +5 Hào Quang
🏆 Top 5 Boss Contributor: +5 Hào Quang + Legendary Egg
```

---

# 16. LEGENDARY EGG

Boss reward yêu cầu một loại trứng mới.

Hiện tại:

```ts
kind?: 'normal' | 'special'
```

Đổi thành:

```ts
export type EggKind = 'normal' | 'special' | 'legendary'
```

```ts
export interface StudentEgg {
  instanceId?: string;
  progress: number;
  status: 'egg' | 'hatched';
  assignedDexId: number;
  kind?: EggKind;
  requiredProgress?: number;
  acquiredAt?: number;
  source?: 'shop' | 'boss' | 'reward' | 'system';
}
```

Legendary Egg:

```text
Cost = không bán trong Shop ở Milestone đầu.
Required progress = 30 Hào Quang.
Source chính = Top 5 Boss Contributor.
```

Không cho `getEggCost('legendary')` dùng trong Shop ở phase này.

---

# 17. LEGENDARY POKÉMON POOL

Không dùng toàn bộ normal pool.

Tạo constant riêng:

```ts
export const LEGENDARY_POKEMON_DEX_IDS = new Set<number>([
  // curated legendary / mythical pool
]);
```

Có thể bắt đầu bằng subset từ `SPECIAL_POKEMON_DEX_IDS` hiện tại.

Legendary Egg phải:

1. Pre-roll `assignedDexId` khi egg được tạo/reward.
2. Không reroll khi reload.
3. Backup/import giữ nguyên Pokémon đã pre-roll.

Suggested:

```ts
const createLegendaryEgg = (): StudentEgg => ({
  instanceId: createInstanceId(),
  progress: 0,
  status: 'egg',
  assignedDexId: getRandomLegendaryPokemonDexId(),
  kind: 'legendary',
  requiredProgress: 30,
  acquiredAt: Date.now(),
  source: 'boss'
});
```

---

# 18. EGG INVENTORY — BẮT BUỘC CHO BOSS REWARD

Code hiện tại chỉ có:

```ts
student.egg?: StudentEgg
```

Không được overwrite quả trứng đang ấp khi trainer nhận Legendary Egg.

Thêm:

```ts
export interface Student {
  ...
  egg?: StudentEgg;        // egg đang active/incubating
  eggInventory?: StudentEgg[]; // egg chưa đưa vào incubator
}
```

## Reward rule

Boss reward luôn:

```ts
student.eggInventory.push(createLegendaryEgg())
```

Không tự replace:

- active Pokémon.
- active egg.

## UI

Trong Pet/Profile tab thêm section nhỏ:

```text
🥚 EGG INVENTORY

Legendary Egg x2
Special Egg x1
```

Nếu `student.egg` trống:

```text
[ Bắt đầu ấp ]
```

Nếu đang ấp egg khác:

```text
Đang có một quả trứng trong incubator.
Hoàn tất trứng hiện tại trước khi ấp quả khác.
```

Không cần hỗ trợ nhiều incubator.

---

# 19. BOSS GAME EVENTS

Mở rộng `gameEvents.ts`.

```ts
export type GameEventType =
  | ...existing
  | 'BOSS_ROUND_SUCCESS'
  | 'BOSS_ROUND_FAILURE'
  | 'BOSS_DEFEATED'
  | 'BOSS_TOP_CONTRIBUTOR_REWARD';
```

Source:

```ts
export type GameEventSource =
  | ...existing
  | 'boss';
```

Tuy nhiên Boss HP/state nên nằm trong `bossSystem.ts`, không nhồi toàn bộ vào `applyGameEventToStudent`.

---

# 20. NEW MODULE: `bossSystem.ts`

Tạo module riêng, pure functions càng nhiều càng tốt.

Suggested API:

```ts
export const createBossInstance = (...): BossInstance

export const createClassBossState = (...): ClassBossState

export const rollNextBossEncounterGap = (): number

export const incrementBossEncounterCounter = (
  state: ClassBossState
): ClassBossState

export const isBossEncounterReady = (
  state: ClassBossState
): boolean

export const selectBossParty = (
  students: Student[],
  queue: string[],
  previousPartyIds?: string[]
): {
  party: Student[];
  nextQueue: string[];
}

export const resolveBossSuccess = (
  state: ClassBossState,
  studentIds: string[],
  timestamp: number
): BossRoundResolution

export const resolveBossFailure = (
  state: ClassBossState,
  studentIds: string[],
  timestamp: number
): BossRoundResolution

export const getBossTopContributors = (
  state: ClassBossState,
  limit?: number
): BossContribution[]
```

`bossSystem.ts` không trực tiếp gọi React state setter.

---

# 21. BOSS STATE PERSISTENCE

Không chỉ giữ Boss state trong component state.

Nó phải nằm trong snapshot data được Supabase/local persistence lưu cùng app.

Suggested root data addition:

```ts
bossStatesByClass?: Record<string, ClassBossState>
```

Nếu app hiện snapshot chỉ lưu students/config, mở rộng schema serializer/deserializer tương ứng.

## Migration

Nếu old data không có boss state:

```ts
bossStatesByClass = {}
```

Khi class lần đầu dùng Random:

```ts
ensureClassBossState(className)
```

Không migrate toàn bộ class ngay khi app boot nếu không cần.

---

# 22. BOSS UI COMPONENTS

Không tiếp tục làm `App.tsx` phình quá mức.

Tạo:

### `components/BossBattlePanel.tsx`

Props concept:

```ts
interface BossBattlePanelProps {
  boss: BossInstance;
  party: Student[];
  topContributors: BossContributionView[];
  onSuccess: () => void;
  onFailure: () => void;
  resolving?: boolean;
}
```

### `components/BossHpBar.tsx`

- Boss name.
- current/max HP.
- % bar.
- danger animation khi HP thấp.

### `components/BossDefeatedModal.tsx`

- Boss defeated.
- Top 5.
- reward summary.

### Optional later

`components/BossPreview.tsx`

---

# 23. RANDOM HANDLER REFACTOR

Hiện:

```ts
const handleRandom = (forceMode?: 'solo' | 'battle') => {...}
```

Refactor thành:

```ts
const handleRandom = (forceMode?: RandomMode) => {
  // 1. determine if boss encounter must take priority
  // 2. if boss ready and enough eligible students -> boss
  // 3. otherwise forceMode or normal Solo/Battle logic
}
```

Priority:

```text
Boss encounter ready
    ↓
Boss has >=5 eligible trainers?
    YES → Boss
    NO  → keep encounter ready, fallback Solo/Battle

No Boss ready
    ↓
forceMode if valid
    ↓
otherwise 50/50 Solo/Battle as current
```

### Boss must not be bypassed forever

Nếu Boss encounter ready và đủ 5 eligible trainers:

- Normal Random button must open Boss.
- Teacher không được spam Solo/Battle force buttons để né Boss.

Sau khi Boss round resolve mới quay lại Solo/Battle.

---

# 24. PREVENT DOUBLE RESOLVE

Boss buttons phải lock ngay sau click:

```ts
bossRoundResolving = true
```

Prevent:

- double click Success.
- Success rồi Failure.
- network sync khiến reward lặp.

Tạo `roundId`:

```ts
interface ActiveBossRound {
  roundId: string;
  bossInstanceId: string;
  partyStudentIds: string[];
  openedAt: number;
  resolvedAt?: number;
  result?: 'success' | 'failure';
}
```

Reward một `roundId` chỉ được apply một lần.

Nếu app reload khi round chưa resolve:

- có thể discard unresolved UI round.
- không apply reward/damage.
- Boss encounter vẫn ready.

Nếu reload sau resolve:

- state đã persist nên không reward lại.

---

# 25. BOSS SOUNDS / ANIMATIONS

Giữ nhẹ.

Boss encounter:

- short 0.5–1 sec sound.
- subtle shake/glow.

Success:

- hit animation.
- boss HP bar giảm.

Failure:

- boss attack flash.
- 5 Pokémon cards show `-N HP`.

Boss death:

- larger celebration modal.

Không dùng animation kéo dài 5–10 giây.

Không block teacher workflow quá lâu.

---

# 26. FEATURE: POKÉMON NATURE / PERSONALITY

Sau Boss core, triển khai Nature.

Mỗi Pokémon instance có một Nature cố định.

```ts
export type PokemonNatureId =
  | 'brave'
  | 'curious'
  | 'loyal'
  | 'hardworking'
  | 'lucky'
  | 'energetic'
  | 'calm';
```

Thêm:

```ts
PokemonPet.natureId?: PokemonNatureId
```

Nature được roll khi Pokémon được tạo/hatch/acquire.

Existing Pokémon migration:

- deterministic roll từ `instanceId` bằng stable hash.
- không random lại mỗi load.

Suggested effects:

### Brave

```text
Battle Pokémon XP +10%
```

### Curious

```text
Expedition rare loot chance +10% relative bonus
```

### Loyal

```text
Bond gain +20%
```

### Hardworking

```text
Homework XP +15%
```

### Lucky

```text
Instant Drop chance +2 percentage points
```

### Energetic

```text
20% chance extra +1 Charge on positive Solo
```

### Calm

```text
Positive HP recovery effects +10%, rounded down/min 1
```

Nature không cộng Hào Quang trực tiếp.

---

# 27. FEATURE: TRAINER LEVEL

Thêm progression dài hạn cho student, tách khỏi Rank/Hào Quang.

```ts
export interface TrainerProgress {
  level: number;
  xp: number;
  totalXp: number;
  titleId?: string;
  unlockedTitleIds?: string[];
}
```

Thêm vào Student:

```ts
trainerProgress?: TrainerProgress
```

Trainer XP không bị mất khi bị trừ Hào Quang.

Suggested Trainer XP sources:

```text
Attendance present        +5 XP
Homework complete         +10 XP
Positive Solo             +5 XP
Battle win                +10 XP
Boss success participation +10 XP
Boss defeated Top 5       +25 XP
Pokémon evolution         +15 XP
Gym Badge earned          +20 XP
```

Không cần Trainer XP popup lớn mỗi lần.

Hiển thị compact trong profile/student card/random modal.

---

# 28. FEATURE: TRAINER TITLES

Unlock theo milestone.

Ví dụ:

```text
🌱 Rookie Trainer
📚 Homework Master
⚔️ Battle Specialist
💖 Pokémon Friend
✨ Shiny Hunter
🐣 Pokémon Breeder
👹 Boss Hunter
🏆 Boss Slayer
👑 Pokémon Champion
```

Học sinh chọn 1 title đang equip.

Random UI:

```text
Minh Anh
👹 Boss Hunter
Pikachu Lv.24
```

Title chủ yếu cosmetic.

Không cộng Hào Quang.

---

# 29. FEATURE: GYM BADGES

Achievement system nhưng theme Pokémon.

```ts
export interface EarnedBadge {
  badgeId: string;
  earnedAt: number;
}
```

Student:

```ts
earnedBadges?: EarnedBadge[]
```

Suggested badges:

### 🔥 Blaze Badge

```text
Best Answer Streak >= 10
```

### 📚 Scholar Badge

```text
Best Homework Streak >= 10
```

### ⚔️ Battle Badge

```text
Battle Wins >= 10
```

### 💖 Friendship Badge

```text
Any active/owned Pokémon Bond = 100
```

### ✨ Shiny Hunter Badge

```text
Own at least one Shiny Pokémon
```

### 🐣 Breeder Badge

```text
Hatch 10 eggs
```

### 🌟 Master Badge

```text
Any Pokémon Mastery = 5 stars
```

### 👹 Raid Badge

```text
Participate in 10 successful Boss rounds
```

### 🏆 Boss Slayer Badge

```text
Finish Top 5 contribution on a defeated Boss
```

Badge detection phải automatic từ event/state.

---

# 30. FEATURE: POKÉMON EXPEDITION

## Goal

Tạo cảm giác Pokémon tiếp tục “sống” giữa hai buổi học.

Không dùng real-time polling/background job.

Dùng timestamp calculation khi app/class được mở lại.

```ts
export interface PokemonExpedition {
  expeditionId: string;
  petInstanceId: string;
  startedAt: number;
  resolvesAt: number;
  status: 'active' | 'ready' | 'claimed';
  seed: string;
}
```

### Start

Có thể auto-start khi lesson/session kết thúc hoặc teacher click End Lesson nếu app đã có session concept sau này.

Phase đầu có thể đơn giản:

- Khi Attendance lessonKey thay đổi / lesson mới được xác định.
- Pokémon active của trainer đủ điều kiện được tạo Expedition mới nếu chưa có active expedition.

### Resolve

Khi app mở sau `resolvesAt`:

- deterministic result từ seed.
- không cần server cron.

Rewards nhỏ:

- Pokémon XP.
- Bond.
- Rare Candy style instant effect.
- Egg Fragment.

Homework/attendance/bond có thể boost loot.

Không cộng Hào Quang trực tiếp ở phase đầu.

---

# 31. FEATURE: EGG FRAGMENTS + EGG TYPES

Boss Legendary Egg đã tạo nền Egg Inventory.

Sau đó có thể thêm:

```ts
export interface EggFragments {
  normal?: number;
  fire?: number;
  water?: number;
  grass?: number;
  electric?: number;
  special?: number;
}
```

10 fragments → craft 1 egg tương ứng.

Possible sources:

- Expedition.
- Weekly Chest.
- Random Drop hiếm.
- Streak milestones.

Không thêm nhiều currency vào màn hình chính.

Chỉ hiển thị trong Profile/Pet tab.

---

# 32. FEATURE: WEEKLY CHEST

Không tạo quest phải giáo viên xác nhận.

Mỗi student có progress tự động:

```ts
export interface WeeklyChestProgress {
  weekKey: string;
  progress: number; // 0..100
  claimed: boolean;
}
```

Suggested automatic contribution:

```text
Attendance present   +10
Homework complete    +15
Positive Solo        +3
Battle participation +3
Battle win           +5
Boss success         +5
```

Clamp 100.

Khi 100:

```text
🎁 WEEKLY CHEST READY
```

Reward không nên quá mạnh:

- Pokémon XP.
- Bond.
- Egg fragments.
- Rare Candy.
- very small Shiny chance booster if desired later.

Không reward Hào Quang trực tiếp mặc định.

---

# 33. FEATURE: ADVENTURE JOURNAL

Mục tiêu: tăng emotional attachment.

```ts
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
```

Không ghi mọi +XP nhỏ.

Chỉ ghi milestone đáng nhớ.

Ví dụ:

```text
12 Aug — Pikachu hatched.
19 Aug — Pikachu evolved.
26 Aug — First successful Boss Raid.
10 Sep — Pikachu reached Bond 100.
22 Sep — Pikachu was lost after reaching 0 HP.
30 Sep — Trainer finished Top 5 against Shadow Dragon.
```

Pokémon bị mất vẫn còn dấu vết trong Journal.

---

# 34. FEATURE: POKÉMON DANGER STATE

Không thay đổi mechanics, chỉ tăng visual feedback.

```text
HP 51–100  Healthy
HP 21–50   Injured
HP 1–20    🚨 DANGER
```

Khi HP <= 20:

- StudentCard/PokemonMiniStatus có warning nhẹ.
- Boss party card làm HP danger nổi bật.

Không modal riêng mỗi lần HP thấp.

---

# 35. FEATURE: SUPPORT POKÉMON — LATER PHASE

Sau khi Trainer Level ổn định:

```ts
supportPetInstanceId?: string
```

Active Pokémon:

- chịu HP damage.
- xuất hiện trong Random.
- dùng active skill.

Support Pokémon:

- không chịu damage.
- cho passive bonus rất nhỏ.

Ví dụ:

```text
Squirtle Support → Homework Pokémon XP +5%
Eevee Support → Bond gain +5%
Pikachu Support → Charge chance nhỏ
```

Không cộng Aura.

Không implement trước Boss/Nature/Trainer Level.

---

# 36. FEATURE: POKÉMON SYNERGY — LATER PHASE

Khi Active + Support match set:

```text
Charmander + Squirtle → Kanto Partners
Pikachu + Eevee → Best Friends
```

Reward chủ yếu cosmetic / tiny Pokémon XP modifier.

Không cho effect mạnh ảnh hưởng fairness.

---

# 37. MASTERY VISUAL AURA

Mastery đã tồn tại.

Thêm cosmetic theo stars:

```text
⭐       Bronze Aura
⭐⭐      Silver Aura
⭐⭐⭐     Gold Aura
⭐⭐⭐⭐    Rainbow Aura
⭐⭐⭐⭐⭐   Legendary Aura
```

Chỉ render CSS effect quanh Pokémon ở:

- Random Solo.
- Battle.
- Boss party.
- Profile.

Không ảnh hưởng điểm.

---

# 38. DATA MODEL SUMMARY

Suggested additions to `types.ts`:

```ts
export type EggKind = 'normal' | 'special' | 'legendary';

export interface StudentEgg {
  instanceId?: string;
  progress: number;
  status: 'egg' | 'hatched';
  assignedDexId: number;
  kind?: EggKind;
  requiredProgress?: number;
  acquiredAt?: number;
  source?: 'shop' | 'boss' | 'reward' | 'system';
}

export interface TrainerProgress {
  level: number;
  xp: number;
  totalXp: number;
  titleId?: string;
  unlockedTitleIds?: string[];
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

export interface BossInstance {
  instanceId: string;
  definitionId: string;
  name: string;
  maxHp: number;
  currentHp: number;
  failDamage: number;
  damagePerSuccessfulStudent: number;
  spawnedAt: number;
  defeatedAt?: number;
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
  updatedAt: number;
}
```

Student additions:

```ts
export interface Student {
  ...existing;
  eggInventory?: StudentEgg[];
  trainerProgress?: TrainerProgress;
  earnedBadges?: EarnedBadge[];
  adventureJournal?: AdventureJournalEntry[];
  weeklyChest?: WeeklyChestProgress;
  expedition?: PokemonExpedition;
  supportPetInstanceId?: string;
}
```

Pokemon additions:

```ts
export interface PokemonPet {
  ...existing;
  natureId?: PokemonNatureId;
}
```

---

# 39. BACKWARD COMPATIBILITY

Existing data phải mở được không lỗi.

Defaults:

```ts
student.eggInventory ??= []
student.trainerProgress ??= getDefaultTrainerProgress()
student.earnedBadges ??= []
student.adventureJournal ??= []
pet.natureId ??= deterministicNatureFromInstanceId(pet.instanceId)
```

Boss:

```ts
bossStatesByClass ??= {}
```

Không đổi ID hiện tại của student/Pokémon.

Không reroll:

- Shiny.
- Nature.
- Legendary Egg assignedDexId.
- Expedition reward.

sau reload/import.

---

# 40. SUPABASE / BACKUP

Mọi field mới phải được đưa vào snapshot persistence.

Test:

1. Create Boss state.
2. Damage Boss.
3. Refresh.
4. Boss HP phải giữ nguyên.
5. Contribution leaderboard giữ nguyên.
6. Encounter counter giữ nguyên.
7. Legendary Egg inventory giữ nguyên.
8. Nature giữ nguyên.
9. Trainer XP giữ nguyên.

JSON export/import cũng phải giữ toàn bộ field mới.

---

# 41. PERFORMANCE RULES

Không tạo timer re-render mỗi giây cho tất cả students.

Boss encounter dùng counters/events, không polling.

Expedition dùng timestamp compute khi cần.

Use `useMemo` cho:

- Boss eligible students.
- Top contributors.
- Current class Boss state view.

Không sort toàn bộ students nhiều lần mỗi render nếu không cần.

Không thêm heavy animation library chỉ vì Boss.

---

# 42. MOBILE / SMALL SCREEN

Boss party có 5 trainer.

Desktop:

```text
5 cards một hàng nếu đủ rộng.
```

Tablet/small screen:

```text
3 + 2 grid hoặc horizontal scroll.
```

Không làm student name quá nhỏ.

Boss HP và 2 resolve buttons phải luôn dễ nhìn.

---

# 43. MILESTONE IMPLEMENTATION ORDER

## MILESTONE A — BOSS CORE [P0]

Implement trước, không làm feature khác trong cùng milestone.

Tasks:

- [ ] Add `RandomMode = solo | battle | boss`.
- [ ] Add Boss tab.
- [ ] Add Boss data types.
- [ ] Create `bossSystem.ts`.
- [ ] Add per-class Boss state.
- [ ] Add encounter threshold 8–14 normal Randoms.
- [ ] Add Boss priority to Random flow.
- [ ] Add fair 5-trainer party queue.
- [ ] Add `BossBattlePanel`.
- [ ] Add Success resolve.
- [ ] Add Failure resolve.
- [ ] Add Boss HP persistence.
- [ ] Add contribution tracking.
- [ ] Add multi-release queue for multiple Pokémon deaths.
- [ ] Add Boss defeated modal.
- [ ] Add unit tests.

Do not implement Legendary Egg reward yet if Egg Inventory dependency is not ready. Temporary dev reward can be disabled until Milestone B.

---

## MILESTONE B — LEGENDARY EGG + FINAL BOSS REWARD [P0]

- [ ] Extend EggKind with `legendary`.
- [ ] Add Legendary Pokémon pool.
- [ ] Add `eggInventory`.
- [ ] Add Egg Inventory UI.
- [ ] Add Start Incubating flow.
- [ ] Legendary Egg required progress = 30.
- [ ] Legendary Egg not sold in Shop.
- [ ] Boss Top 5 receive +5 Aura.
- [ ] Boss Top 5 receive 1 Legendary Egg.
- [ ] Prevent overwrite of active egg.
- [ ] Persist/import egg inventory.
- [ ] Test duplicate Legendary Eggs.

At completion of Milestone B, Boss feature is product-complete.

---

## MILESTONE C — NATURE + TRAINER PROGRESSION [P1]

- [ ] Pokémon Nature.
- [ ] Deterministic migration for old Pokémon.
- [ ] Trainer Level / XP.
- [ ] Trainer Titles.
- [ ] Boss Hunter / Boss Slayer titles.
- [ ] Integrate with existing game events.
- [ ] Keep UI compact.

---

## MILESTONE D — GYM BADGES [P1]

- [ ] Badge definitions.
- [ ] Automatic detection.
- [ ] Profile Badge section.
- [ ] Boss Raid / Boss Slayer Badge.
- [ ] Trainer XP reward for badge milestones.

---

## MILESTONE E — EXPEDITION [P1]

- [ ] Expedition data type.
- [ ] Timestamp-based resolve.
- [ ] Deterministic reward seed.
- [ ] Expedition result card.
- [ ] Nature modifiers.
- [ ] Small rewards only.

---

## MILESTONE F — WEEKLY CHEST + EGG FRAGMENTS [P2]

- [ ] Weekly progress.
- [ ] Auto progress from existing events.
- [ ] Weekly reset key.
- [ ] Claim flow.
- [ ] Egg fragments.
- [ ] Egg crafting.

---

## MILESTONE G — ADVENTURE JOURNAL [P2]

- [ ] Milestone event journal.
- [ ] Boss wins.
- [ ] Pokémon lost history.
- [ ] Trainer milestones.
- [ ] Compact timeline UI.

---

## MILESTONE H — SUPPORT + SYNERGY + COSMETICS [P3]

- [ ] Support Pokémon slot.
- [ ] Tiny support bonuses.
- [ ] Synergy definitions.
- [ ] Mastery Aura visuals.

---

# 44. BOSS ACCEPTANCE CRITERIA

Boss Milestones A+B chỉ được coi là hoàn thành khi tất cả case sau pass.

## Case 1 — Boss không xuất hiện quá sớm

Given:

- Boss encounter vừa resolve.
- `nextEncounterAt = 11`.

Then:

- 10 resolved Solo/Battle không mở Boss.
- Lượt Random tiếp theo mở Boss.

## Case 2 — Boss selects exactly 5

Given:

- 15 students present.
- 13 students have active Pokémon.

Then:

- Boss party = exactly 5 eligible trainers.

## Case 3 — <5 eligible

Given:

- Boss encounter ready.
- Chỉ 4 students có active Pokémon.

Then:

- Boss không consume encounter.
- Không reset counter.
- Có thể fallback Solo/Battle.
- Boss remains ready.

## Case 4 — All 5 correct

Given:

- Boss HP = 500.
- 5 selected trainers.

When:

- Teacher presses `Cả 5 đều đúng`.

Then:

- each +5 Aura.
- each active Pokémon +5 HP via current Aura rule, clamp 100.
- Boss HP = 475.
- each contribution damage += 5.
- no Boss fail damage.

## Case 5 — At least 1 wrong

Given:

- Boss failDamage = 10.

When:

- Teacher presses `Có ít nhất 1 bạn sai`.

Then:

- Boss HP unchanged.
- all 5 active Pokémon -10 HP.
- no Aura deducted.
- no Trainer XP penalty.
- no Pokémon XP/Bond penalty.

## Case 6 — One Pokémon dies

Given:

- Selected trainer Pokémon HP = 8.
- Boss failure damage = 10.

Then:

- Pokémon HP reaches 0.
- Pokémon removed using existing release logic.
- release selection UI appears.

## Case 7 — Three Pokémon die simultaneously

Then:

- all 3 release events are queued.
- user resolves them one-by-one.
- none is lost/overwritten.

## Case 8 — Boss dies

Given:

- Boss HP = 20.

When:

- party succeeds for 25 damage.

Then:

- Boss HP becomes 0, never negative.
- standard success reward applies to 5 party members.
- Boss Defeated modal appears.
- Top 5 contributors determined deterministically.
- each Top 5 gets additional +5 Aura.
- each Top 5 gets exactly 1 Legendary Egg.

## Case 9 — Student already incubating egg

When:

- student receives Legendary Egg.

Then:

- current `student.egg` remains unchanged.
- Legendary Egg goes to `eggInventory`.

## Case 10 — Student has no active Pokémon at Boss reward

Then:

- receives +5 Aura.
- receives Legendary Egg.
- no HP healing occurs because no active pet.
- no crash.

## Case 11 — Refresh midway through Boss lifecycle

Then:

- Boss currentHp persists.
- contributions persist.
- next encounter counter persists.

## Case 12 — Switch class

Then:

- each class has independent Boss HP/counter/contributions.

## Case 13 — Backup/import

Then:

- Boss state preserved.
- Legendary Eggs preserved.
- assigned Legendary Pokémon does not reroll.

---

# 45. UNIT TESTS REQUIRED

Create `bossSystem.test.ts`.

Tests at minimum:

```text
rollNextBossEncounterGap() always 8..14
increment counter
encounter ready threshold
select exactly 5 eligible students
exclude absent students
exclude students without active pet
fair queue cycling
success boss damage
failure boss damage = 0
contribution update
Top 5 sorting/tiebreak
Boss HP clamp 0
Boss defeated state
```

Extend `gameEvents.test.ts` for:

```text
Boss success Aura reward
Boss failure does not alter Aura
Boss Top 5 reward
Trainer XP when later implemented
```

Egg tests:

```text
legendary egg pre-roll
legendary egg persists assignedDexId
boss reward pushes to inventory
active egg is not overwritten
```

---

# 46. MANUAL QA SCRIPT

Codex should manually verify after implementation:

1. Open a class with >=10 students.
2. Mark at least 5 present and ensure they have active Pokémon.
3. Run Solo/Battle until Boss appears.
4. Verify Boss opens automatically.
5. Verify exactly 5 students.
6. Success → all +5 Aura, Boss -25 HP.
7. Failure → all Pokémon -Boss damage, Aura unchanged.
8. Force one Pokémon to low HP and fail.
9. Verify release modal.
10. Force multiple low-HP Pokémon and fail.
11. Verify release queue.
12. Damage Boss to near zero.
13. Kill Boss.
14. Verify Top 5.
15. Verify Top 5 +5 Aura.
16. Verify Top 5 Legendary Egg inventory.
17. Refresh.
18. Verify persistence.
19. Switch class and confirm independent Boss.
20. Export JSON, re-import and confirm no data loss.

---

# 47. UX PRINCIPLES

## Keep Random fast

Boss must not turn one question into a 2-minute flow.

Target teacher actions per Boss encounter:

```text
Random button
→ 5 students appear
→ students answer
→ teacher presses ONE resolution button
→ continue lesson
```

## Do not show too many popups

Success/failure → inline result/toast.

Only major modals:

- Pokémon died.
- Boss defeated.
- Legendary Egg reward summary.

## Large readable text

The classroom screen is viewed from distance.

Do not make Boss student names/HP tiny just to fit 5 cards.

---

# 48. BALANCING CONSTANTS — KEEP CENTRALIZED

Do not hardcode Boss numbers throughout `App.tsx`.

Create `bossConfig.ts` or constants in `bossSystem.ts`:

```ts
export const BOSS_CONFIG = {
  minRandomGap: 8,
  maxRandomGap: 14,
  partySize: 5,
  successAuraReward: 5,
  topContributorAuraReward: 5,
  topContributorCount: 5,
  standardBossHp: 500,
  standardFailDamage: 10,
  damagePerSuccessfulStudent: 5,
  legendaryEggRequiredProgress: 30,
};
```

Sau này balancing chỉ sửa một nơi.

---

# 49. OUT OF SCOPE FOR THIS PLAN

Không implement trong phase này:

- Global Pokédex.
- PvP online giữa lớp.
- Real-time multiplayer server.
- Pokémon trading giữa học sinh.
- Marketplace.
- Microtransactions.
- Daily login reward.
- Nhiệm vụ yêu cầu giáo viên xác nhận thủ công.
- Hand-raise tracking.
- Boss requiring 5 separate score inputs.
- Boss animation dài.
- Legendary Egg bán trong Shop.
- Revive Pokémon đã mất.

---

# 50. FINAL PRODUCT LOOP

Sau Imperial School 3.0, workflow lý tưởng:

```text
Teacher Random
      ↓
Solo / Battle bình thường
      ↓
Pokémon XP / Level / Bond / Streak / Nature tự chạy
      ↓
Sau 8–14 Random hợp lệ
      ↓
👹 BOSS ENCOUNTER
      ↓
Random 5 trainer
      ↓
Cả 5 cùng trả lời
      ↓
┌───────────────────────────────┐
│ ALL CORRECT                   │
│ +5 Aura each                 │
│ Boss -25 HP                  │
│ Contribution +5 each         │
└───────────────────────────────┘
               OR
┌───────────────────────────────┐
│ AT LEAST ONE WRONG            │
│ Boss takes 0 damage           │
│ All 5 Pokémon -10 HP          │
└───────────────────────────────┘
      ↓
Boss persists across lessons
      ↓
Boss HP = 0
      ↓
🏆 TOP 5 CONTRIBUTORS
      ↓
+5 Aura + Legendary Egg each
      ↓
New Boss lifecycle begins
```

Trong khi đó hệ dài hạn tự động chạy:

```text
Pokémon Nature
Trainer Level
Trainer Titles
Gym Badges
Expedition
Weekly Chest
Egg Fragments
Adventure Journal
Support Pokémon
Mastery Aura
```

Mục tiêu cuối cùng:

> **Imperial School phải tạo cảm giác học sinh đang sở hữu và nuôi một Pokémon thực sự qua nhiều tháng, trong khi giáo viên vẫn chủ yếu chỉ làm đúng công việc hiện tại: Random → nghe câu trả lời → chấm → tiếp tục bài học.**

---

# 51. CODEX EXECUTION INSTRUCTION

Codex phải làm theo thứ tự:

1. Đọc toàn bộ repository trước khi sửa.
2. Đọc `PLAN.md` này.
3. Đọc `Progress.md` và `docs/architecture.md` để hiểu legacy assumptions nhưng ưu tiên behavior thật trong code mới nhất.
4. **Chỉ implement MILESTONE A trước.**
5. Chạy typecheck/tests/build.
6. Fix regression.
7. Cập nhật `Progress.md` mô tả chính xác những gì đã hoàn thành.
8. Sau khi Milestone A ổn định mới implement Milestone B.
9. Không tự ý implement Global Pokédex.
10. Không tự thay đổi luật HP = 0 → mất Pokémon.
11. Không tự thay đổi reward Boss đã mô tả trong PLAN.
12. Không refactor unrelated UI trong cùng commit nếu không cần thiết.

