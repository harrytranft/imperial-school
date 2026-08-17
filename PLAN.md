# PLAN.md — Imperial School: Pokémon Companion System 2.0

> Tài liệu triển khai dành cho Codex.  
> Mục tiêu: nâng Imperial School từ hệ thống thi đua + Random/Battle thành một **Pokémon Companion RPG chạy thụ động phía sau tiết học**, gần như không tăng thao tác cho giáo viên.

---

## 0. Bối cảnh sản phẩm

Imperial School hiện là app React + TypeScript + Vite, dùng Supabase để đồng bộ snapshot dữ liệu người dùng.

Các tính năng hiện đã có và **phải được giữ nguyên**:

- Quản lý học sinh theo lớp.
- Điểm Hào Quang và Rank.
- Cộng/trừ điểm và lịch sử.
- Điểm danh / đánh dấu vắng.
- Random Solo.
- Random Battle.
- Pokémon/Linh thú hộ mệnh.
- HP Pokémon.
- Ấp trứng Pokémon.
- Sở hữu nhiều Pokémon (`pets[]`) và chọn 1 Pokémon active (`pet`).
- Evolution chain.
- Pokémon Skills, mỗi skill dùng tối đa 2 lần.
- Hợp nhất Pokémon.
- Lucky Wheel.
- Cá Ngựa.
- Supabase Auth + cloud sync.
- JSON backup/import.

### Các file hiện tại quan trọng

- `App.tsx` — file chính, hiện khoảng 4.7k dòng, chứa phần lớn game logic/UI.
- `types.ts` — `Student`, `PokemonPet`, `HistoryItem`, v.v.
- `pokemonData.ts` — danh sách Pokémon, skill, evolution chain.
- `constants.ts` — cấu hình mặc định.
- `components/StudentCard.tsx`
- `components/LiquidDock.tsx`
- `supabaseData.ts`
- `supabase-schema.sql`
- `Progress.md`

### Logic HP/Pokémon đã tồn tại

App hiện đã có nền cho:

- `applyPetHpDelta(...)`
- `releasePetFromStudent(...)`
- `pokemonReleaseEvent`
- modal khi Pokémon về 0 HP.
- chọn Pokémon còn lại sau khi Pokémon active bị mất.
- nếu hết Pokémon thì mở màn hình mua/ấp trứng.

**Không được xóa hoặc đổi triết lý cơ chế này.** Phần mới phải xây tiếp trên đó.

---

# 1. Product Goal

Imperial School phải phù hợp với thực tế lớp học 90 phút:

- ~30 phút Listening Dictation không dùng Imperial School.
- ~60 phút còn lại giáo viên chữa rất nhiều bài.
- Giáo viên chủ yếu dùng Random Solo/Battle để gọi học sinh.
- Không có nhiều thời gian cho mini game riêng.
- Không nên yêu cầu học sinh chủ động giơ tay để hệ thống hoạt động.

## Nguyên tắc sản phẩm quan trọng nhất

> **Teacher Interaction Budget ≈ 0**

Một tính năng mới chỉ tốt nếu nó chủ yếu tự hoạt động từ các hành động giáo viên vốn đã làm:

1. Random Solo.
2. Random Battle.
3. Chấm/cộng/trừ điểm.
4. Điểm danh.
5. Một thao tác Homework Check cực nhanh nếu cần.

Không thêm workflow buộc giáo viên phải dừng tiết học để chơi mini game mới.

---

# 2. Core Game Philosophy

Hệ thống mới phải tạo cảm giác:

> “Đây là Pokémon của mình. Nó có Level, XP, Bond, Streak, Passive Ability, có thể tiến hóa, có thể trở thành Shiny, và những lần mình trả lời trong lớp trực tiếp giúp nó lớn lên.”

Tách 2 hệ progression:

## Hào Quang

- Là thành tích học tập / Rank của học sinh.
- Có thể tăng hoặc giảm.
- Vẫn ảnh hưởng trực tiếp đến HP Pokémon theo cơ chế hiện tại.

## Pokémon Progression

- XP.
- Level.
- Bond.
- Passive Ability.
- Charge.
- Streak bonuses.
- Evolution.
- Shiny.
- Mastery.

Pokémon progression **không bị giảm** khi học sinh bị trừ điểm. Hình phạt đã được thể hiện bằng:

- Hào Quang giảm.
- Pokémon mất HP.
- Nếu HP = 0 thì mất Pokémon.

Không trừ thêm Pokémon XP/Bond để tránh punishment stacking quá nặng.

---

# 3. NON-NEGOTIABLE RULES — KHÔNG ĐƯỢC THAY ĐỔI

## 3.1. Hào Quang và HP

Giữ cơ chế:

- Học sinh được `+N` Hào Quang từ thưởng/chấm điểm → Pokémon active hồi `+N HP`.
- Học sinh bị `-N` Hào Quang từ thưởng/phạt/chấm điểm → Pokémon active mất `N HP`.
- HP luôn clamp trong `0..100`.

Ví dụ:

- `+3 Hào Quang` → Pokémon `+3 HP`.
- `-5 Hào Quang` → Pokémon `-5 HP`.

### Không áp dụng HP damage khi “tiêu tiền”

Các thao tác dùng Hào Quang như currency:

- mua skill,
- mua trứng,
- các purchase tương tự,

**không gây damage HP**.

Lý do: đây là spending, không phải punishment. Không để học sinh giết Pokémon chỉ vì mua skill.

## 3.2. Battle giữ luật riêng hiện tại

Battle hiện có luật:

- Người thắng: Pokémon hồi HP bằng `|scoreA - scoreB|`.
- Người thua: Pokémon mất HP bằng `|scoreA - scoreB|`.
- Học sinh vẫn nhận Hào Quang theo score Battle.

**Giữ logic này.**

Không được áp dụng thêm generic Aura→HP lần thứ hai trong Battle, nếu không sẽ double damage/double heal.

## 3.3. HP = 0 → MẤT Pokémon

Đây là luật lõi.

Khi Pokémon active có HP <= 0:

1. Pokémon đó bị remove khỏi `student.pets`.
2. `student.pet = undefined`.
3. Ghi History rõ ràng.
4. Hiện modal toàn màn hình ngay.
5. Nếu học sinh còn Pokémon khác:
   - hiển thị tất cả Pokémon còn lại,
   - cho học sinh chọn Pokémon active mới.
6. Nếu học sinh không còn Pokémon:
   - hiển thị trạng thái “Bạn không còn Pokémon”.
   - CTA mua trứng mới.
   - giá trứng tiếp tục dùng logic hiện tại, mặc định 10 Hào Quang.
7. Không tự tặng Pokémon miễn phí.
8. Không tự hồi sinh Pokémon đã mất.

### Nếu không đủ Hào Quang để mua trứng

Không được tạo soft-lock toàn app.

- Nút mua trứng hiển thị disabled.
- Hiển thị số Hào Quang còn thiếu.
- Cho phép đóng màn hình và tiếp tục học không có Pokémon.
- Khi đủ Hào Quang, học sinh có thể vào profile mua trứng như hiện tại.

## 3.4. Release modal không được biến thành “Fainted”

Không đổi thành cơ chế bất tỉnh/hồi sinh.

Pokémon hết HP là **mất khỏi collection** đúng yêu cầu sản phẩm.

---

# 4. Technical Direction

`App.tsx` đang quá lớn. Không tiếp tục nhồi toàn bộ logic Pokémon mới vào file này.

## Tạo các module mới

### `pokemonProgression.ts`

Chứa pure functions:

- XP.
- Level.
- evolution threshold.
- Bond.
- Charge.
- Streak bonus.
- Mastery.
- helper migration cho Pokémon cũ.

### `pokemonPassives.ts`

Chứa:

- passive definitions.
- mapping Pokémon/baseDexId → passive.
- passive description.
- passive effect resolver.

### `gameEvents.ts`

Chứa event types + logic áp dụng progression từ event.

Ví dụ:

```ts
export type GameEventType =
  | 'SOLO_RESULT'
  | 'BATTLE_RESULT'
  | 'AURA_ADJUSTMENT'
  | 'HOMEWORK_COMPLETE'
  | 'HOMEWORK_MISSING'
  | 'EGG_HATCHED'
  | 'POKEMON_ACQUIRED';
```

Mục tiêu: tránh việc `handleUpdatePoints`, `handleResolveBattle`, Lucky Wheel, v.v. mỗi nơi tự viết một phiên bản game logic khác nhau.

### Components mới đề xuất

- `components/PokemonMiniStatus.tsx`
- `components/PokemonProgressPanel.tsx`
- `components/PokemonReactionToast.tsx`
- `components/PokemonReleaseModal.tsx`
- `components/HomeworkCheckModal.tsx`
- `components/PokemonPassiveBadge.tsx`

Không bắt buộc refactor tất cả UI ngay. Làm từng phần để giảm rủi ro.

---

# 5. Data Model 2.0

## 5.1. `PokemonPet`

Mở rộng interface hiện tại.

```ts
export interface PokemonPet {
  // NEW: stable identity for each individual Pokémon
  instanceId: string;

  dexId: number;
  baseDexId?: number;
  name: string;
  speciesName?: string;
  nickname?: string;
  types: string[];

  hp?: number;

  // EXISTING
  accessories: string[];
  skills: string[];
  skillUses?: Record<string, number>;

  // NEW PROGRESSION
  level?: number;
  xp?: number;
  totalXp?: number;
  bond?: number;
  charge?: number;

  // NEW RARITY / END GAME
  isShiny?: boolean;
  masteryXp?: number;
  masteryStars?: number;

  // NEW PASSIVE
  passiveId?: string;
}
```

### `instanceId` là bắt buộc trong model mới

Hiện `isSamePokemon()` đang dựa vào:

- `dexId`
- `name`
- `baseDexId`

Điều này không đủ an toàn nếu học sinh sở hữu 2 Pokémon cùng loài hoặc đổi nickname.

Sau migration:

- mọi Pokémon phải có `instanceId` duy nhất.
- mọi thao tác select/remove/fusion/update collection phải ưu tiên compare `instanceId`.
- chỉ fallback sang logic cũ cho dữ liệu legacy chưa migrate.

Có thể tạo ID bằng:

```ts
crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
```

## 5.2. Tên loài và nickname

Hiện `name` vừa được dùng như species name vừa được dùng để rename pet.

Không để evolution phá nickname.

Quy ước mới:

- `speciesName`: tên Pokémon canonical theo evolution hiện tại.
- `nickname`: tên học sinh đặt.
- UI display name = `nickname || speciesName || name`.
- Giữ `name` để backward compatibility, nhưng code mới không nên dùng `name` làm identity.

## 5.3. Student progression

Mở rộng `Student`:

```ts
export interface StudentPokemonProgress {
  answerStreak: number;
  bestAnswerStreak: number;

  battleWinStreak: number;
  bestBattleWinStreak: number;

  homeworkStreak: number;
  bestHomeworkStreak: number;
  lastHomeworkLessonKey?: string;

  positiveSoloCount?: number;
  battleWins?: number;
}

export interface PokemonPokedexEntry {
  dexId: number;
  discovered: boolean;
  shinyDiscovered?: boolean;
  firstDiscoveredAt?: number;
}

export interface Student {
  ...existingFields;

  pokemonProgress?: StudentPokemonProgress;
  pokedex?: Record<number, PokemonPokedexEntry>;
}
```

Không cần SQL migration riêng cho các field nested này vì `students` đã được lưu trong JSONB của `user_settings`.

---

# 6. Backward-Compatible Migration

App đang có dữ liệu thật. Migration phải tự động và an toàn.

Tạo:

```ts
normalizeStudentPokemonData(student: Student): Student
normalizePokemonPet(pet: PokemonPet, student?: Student): PokemonPet
```

Chạy khi:

- load local data,
- load Supabase data,
- import JSON backup.

## Giá trị mặc định cho Pokémon legacy

Nếu field không tồn tại:

- `instanceId` → generate mới.
- `hp` → `100` nếu undefined.
- `level` → infer từ evolution stage hiện tại, không làm Pokémon bị tụt dạng.
- `xp` → `0`.
- `totalXp` → giá trị minimum tương ứng level đã infer.
- `bond` → `0`.
- `charge` → `0`.
- `isShiny` → `false`.
- `masteryXp` → `0`.
- `masteryStars` → `0`.
- `passiveId` → derive từ `baseDexId`.
- `speciesName` → derive từ `dexId`.

## Không được de-evolve Pokémon cũ

Ví dụ học sinh hiện đã có Charizard do Hào Quang cũ cao:

- migrate sang Level tối thiểu tương ứng Charizard.
- giữ Charizard.
- sau migration, evolution mới dùng Pokémon Level.

---

# 7. Pokémon XP & Level — PHASE 1

Đây là hệ thống quan trọng nhất.

## 7.1. XP không thay Hào Quang

Hào Quang vẫn chạy y hệt.

Pokémon XP là một progression song song.

## 7.2. XP rules mặc định

### Solo

Khi giáo viên chấm qua luồng Random Solo:

| Kết quả | Pokémon XP |
|---|---:|
| +1 Hào Quang | +5 XP |
| +2 | +10 XP |
| +3 | +15 XP |
| +4 | +20 XP |
| +5 hoặc hơn | +25 XP tối đa từ base result |

Formula đề xuất:

```ts
baseXp = Math.min(25, Math.max(0, auraAmount) * 5)
```

Chỉ áp dụng nếu event source là Solo/classroom answer.

Không được tự cấp XP vì:

- giáo viên chỉnh điểm profile,
- mua/bán,
- import data,
- admin correction.

### Battle

- Battle winner: `+20 XP` bonus.
- Battle loser nhưng score > 0: `+10 XP` participation bonus.
- Battle hòa và score > 0: mỗi bên `+12 XP`.

Battle XP độc lập với Hào Quang nhưng không gây HP damage thêm.

### Homework

- hoàn thành homework: `+15 XP` cho active Pokémon.

### Negative result

- không trừ XP.
- HP đã chịu punishment.

## 7.3. Level curve

```ts
xpNeededForNextLevel(level) = Math.min(150, 30 + (level - 1) * 5)
```

- Level bắt đầu từ 1.
- XP overflow phải carry sang level tiếp theo.
- Một event có thể level up nhiều lần nếu XP đủ.

Ví dụ:

```ts
while (xp >= neededXp) {
  xp -= neededXp;
  level += 1;
}
```

## 7.4. Max normal level

- Normal progression tới Level 30.
- Sau Level 30, XP chuyển sang Mastery system ở phase sau.

---

# 8. Evolution 2.0

Hiện evolution đang dựa trên `points / 200`.

Sau khi migrate, evolution phải dựa trên Pokémon Level.

## 8.1. Evolution stages

Có 5 stage hiện hữu trong `POKEMON_EVOLUTION_CHAINS`.

Dùng threshold:

| Stage | Level |
|---|---:|
| Stage 0 | 1–4 |
| Stage 1 | 5–11 |
| Stage 2 | 12–19 |
| Stage 3 | 20–29 |
| Stage 4 | 30+ |

Tạo:

```ts
getEvolutionStageForLevel(level: number): number
```

## 8.2. Evolution variant phải deterministic

`getEvolvedForm()` hiện dùng `Math.random()` khi chọn option trong một stage.

Điều này có thể khiến form thay đổi không ổn định.

Sửa thành deterministic bằng `instanceId`:

```ts
variantIndex = stableHash(`${instanceId}-${stageIndex}`) % options.length
```

Không random lại mỗi lần render/update.

## 8.3. Khi evolution xảy ra

- giữ `instanceId`.
- giữ `hp`.
- giữ `xp`.
- giữ `level`.
- giữ `bond`.
- giữ `charge`.
- giữ `skills` và `skillUses`.
- giữ shiny status.
- giữ nickname.
- cập nhật `dexId`, `speciesName`, `types`.

Hiện modal evolution có thể được tái sử dụng nhưng nên rút gọn để không cản giờ học.

Nếu evolution xảy ra trong Random:

- hiện overlay/toast lớn ~1.5–2 giây.
- không yêu cầu giáo viên bấm “OK” mới tiếp tục nếu có thể.

---

# 9. Bond System — PHASE 1

Mỗi Pokémon có `bond` từ 0–100.

Bond thể hiện mức độ gắn bó Trainer ↔ Pokémon.

## Bond gain

- Positive Solo result: `+1 Bond`.
- Battle win: `+2 Bond`.
- Battle loss nhưng score > 0: `+1 Bond`.
- Homework complete: `+2 Bond`.
- Level up: `+1 Bond`.
- Evolution: `+3 Bond`.

Bond không giảm.

Clamp:

```ts
bond = Math.min(100, bond + delta)
```

## Bond milestones

- 25 → Passive Lv.1 visual upgrade.
- 60 → Passive Lv.2.
- 100 → Best Friend badge + Passive Lv.3/cosmetic aura.

Không mở modal blocking ở mỗi milestone.

Chỉ dùng toast ngắn:

> ❤️ Bond 60! Passive upgraded!

---

# 10. Answer Streak — FULLY AUTOMATIC

Đây là streak ưu tiên vì không cần thêm thao tác.

## Rule

Chỉ tính những lần chấm trong Random Solo.

- Solo positive `> 0` → `answerStreak + 1`.
- Solo `<= 0` → reset `answerStreak = 0`.
- Manual adjustment không ảnh hưởng.
- Lucky Wheel không ảnh hưởng.
- Battle không ảnh hưởng Answer Streak.

## Milestones

- x3 → +5 bonus Pokémon XP.
- x5 → +10 bonus Pokémon XP.
- x10 → +20 bonus Pokémon XP.
- mỗi 5 sau x10 → +10 XP.

Không cộng Hào Quang từ streak.

Không ảnh hưởng điểm học tập/fairness.

## UI

Trong Random Solo hiển thị nhỏ:

> 🔥 Answer Streak ×4

Nếu đạt milestone:

> 🔥 STREAK ×5 · +10 XP

Toast auto dismiss ~900ms.

---

# 11. Battle Win Streak

Tự động.

- thắng Battle → `battleWinStreak + 1`.
- thua → reset 0.
- hòa → giữ nguyên hoặc reset; dùng rule đơn giản: reset 0.

Milestones:

- x2 → +5 XP.
- x3 → +10 XP.
- x5 → +20 XP.

Không cộng Hào Quang.

---

# 12. Pokémon Charge — PHASE 1

Mỗi Pokémon có thanh:

> ⚡ Charge ●●●○○

Range `0..5`.

## Charge gain

- Positive Solo → +1.
- Battle win → +2.
- Battle participation with score > 0 → +1.

## Khi Charge = 5

Không cần học sinh bấm.

Ở positive classroom event tiếp theo:

- tự kích hoạt `POWER READY`.
- bonus `+50% XP` cho event đó.
- Charge reset về 0.

Không nhân Hào Quang.

Không ảnh hưởng HP.

Animation khoảng 800–1200ms.

---

# 13. Passive Ability System — PHASE 1

Mỗi Pokémon có 1 Passive Ability tự động.

Passive **không được yêu cầu giáo viên bấm**.

Passive không nên thay đổi Hào Quang trực tiếp để tránh balance học tập.

Passive chỉ tác động tới:

- XP.
- Bond.
- Charge.
- drop chance.
- cosmetic/reaction.
- rất ít HP bonus nếu hợp lý.

## 13.1. Mapping ban đầu

Dựa trên `baseDexId` để evolution vẫn giữ cùng passive family.

### Pikachu — Static Charge

- Mỗi positive Solo thứ 3: +5 bonus XP.
- Bond Lv.2: +8 XP.
- Bond 100: +10 XP.

### Bulbasaur / Chikorita / Treecko / Leafeon — Growth

- Homework complete: +20% homework XP.
- Higher Bond: +30%, sau đó +40%.

### Charmander / Cyndaquil / Torchic — Blaze

- Khi Answer Streak >= 3: +20% Solo XP.
- Bond upgrades tăng 25% / 30%.

### Squirtle / Psyduck / Mudkip / Totodile — Torrent

- Battle thua nhưng score > 0: +5 bonus XP và +1 Bond.
- Bond upgrades tăng bonus.

### Eevee / Ditto — Adaptability

- Mọi Bond gain +1 extra mỗi event, cap hợp lý.

### Jigglypuff / Togepi — Joyful Heart

- Mỗi Homework Streak milestone: bonus Bond.
- Trước khi Homework system hoàn thành, passive chỉ cần hook sẵn.

### Snorlax — Rest & Recover

- Positive Solo event hồi thêm +1 HP ngoài generic Aura healing.
- Không vượt 100.

### Lucario — Aura Fighter

- Battle win XP +25%.

### Greninja — Ninja Focus

- Khi Answer Streak >= 2, mỗi positive Solo có 20% chance thêm +1 Charge.
- Nếu muốn tránh RNG, dùng deterministic every 3rd positive Solo.

### Gengar — Mischief

- Random Drop chance x2 khi Drop System được bật.
- Trước Phase Drop, passive hiển thị nhưng chưa cần effect hoặc dùng +5 XP mỗi 5 positive events.

### Mew — Synchronize

- Mỗi level up +2 extra Bond.

### Rayquaza — Sky Legend

- +10% Pokémon XP từ classroom events.

## 13.2. Passive resolver

Không viết `if/else` rải khắp `App.tsx`.

Tạo config object + resolver.

Ví dụ:

```ts
interface PassiveContext {
  student: Student;
  pet: PokemonPet;
  event: GameEvent;
  baseXp: number;
  baseBond: number;
}

interface PassiveResult {
  bonusXp?: number;
  bonusBond?: number;
  bonusCharge?: number;
  bonusHp?: number;
  reaction?: string;
}
```

---

# 14. Event Engine

Đây là phần quan trọng để tránh bugs.

## 14.1. Event context

Không suy luận event từ `reason` string.

Mở rộng handler để truyền source rõ ràng.

Ví dụ:

```ts
interface GameEvent {
  type: GameEventType;
  source:
    | 'solo'
    | 'battle'
    | 'manual'
    | 'skill'
    | 'lucky-wheel'
    | 'homework'
    | 'system';

  studentId: string;
  auraDelta?: number;
  battleOutcome?: 'win' | 'loss' | 'draw';
  battleScore?: number;
  timestamp: number;
}
```

## 14.2. Kết quả processor

```ts
interface GameEventResult {
  student: Student;
  uiEvents: PokemonUiEvent[];
  releaseEvent?: PokemonReleaseEvent;
}
```

`uiEvents` có thể gồm:

- XP gained.
- level up.
- bond up.
- streak milestone.
- passive triggered.
- charge ready.
- evolution.
- random drop.

UI chỉ consume event và hiện toast.

Game logic không phụ thuộc UI.

---

# 15. Refactor `handleUpdatePoints`

Hiện function đang xử lý quá nhiều thứ:

- rank.
- history.
- egg.
- evolution.
- HP.
- release.

Refactor cẩn thận, không thay behavior ngoài scope.

## Tách rõ 2 loại Aura change

### `applyRewardPenaltyAuraDelta(...)`

Dùng cho:

- Solo scoring.
- manual reward/punishment.
- skill reward/penalty nếu phù hợp.
- Lucky Wheel points.

Có HP coupling.

### `spendAuraCurrency(...)`

Dùng cho:

- mua skill.
- mua egg.

Không đổi HP.

Không được dùng generic `handleUpdatePoints(-cost)` cho purchase.

---

# 16. Random Solo UI 2.0 — PHASE 2

Không thay workflow Random hiện tại.

Giáo viên vẫn:

1. bấm Random Solo.
2. học sinh trả lời.
3. giáo viên chấm như hiện tại.

## Trong modal Random hiển thị thêm

Bên cạnh Pokémon:

- species/nickname.
- Level.
- HP.
- XP bar.
- Bond.
- Answer Streak.
- Charge.
- Passive icon/name ngắn.

Ví dụ:

```text
Pikachu Lv. 8
❤️ HP 74/100
XP ███████░░ 52/70
💖 Bond 43
🔥 Streak ×4
⚡ ●●●○○
Static Charge
```

## Sau khi giáo viên chấm

Không mở modal phụ.

Hiện floating reaction ngay trong Random modal:

```text
+15 XP
❤️ +1 Bond
🔥 Streak ×5
⚡ Blaze activated!
```

Tối đa 2–3 dòng quan trọng cùng lúc.

Auto disappear 0.8–1.2 giây.

Không chặn thao tác tiếp theo.

---

# 17. Battle UI 2.0 — PHASE 2

Giữ workflow và layout battle hiện tại.

Mỗi side thêm:

- Pokémon Level.
- HP.
- Bond nhỏ.
- Battle streak.
- passive badge.

Sau `handleResolveBattle`:

Ngoài result hiện tại, hiển thị ngắn:

Winner:

> 🏆 +20 XP · ❤️ +2 Bond · ⚡ +2 Charge

Loser nếu score > 0:

> 💪 +10 XP · ❤️ +1 Bond

Nếu pet HP = 0:

- release modal phải được ưu tiên hiển thị trên Battle result.

---

# 18. Release / Lose Pokémon Flow 2.0 — PHASE 2

Nâng cấp modal hiện có, nhưng giữ luật mất Pokémon.

## Modal state

```ts
interface PokemonReleaseEvent {
  studentId: string;
  studentName: string;
  releasedPet: PokemonPet;
  remainingPets: PokemonPet[];
  cause?: string;
}
```

## UI khi còn Pokémon

Headline:

> 💔 Pokémon đã rời đội hình

Hiển thị Pokémon vừa mất + nguyên nhân.

Ví dụ:

> Charizard của Minh đã cạn HP và rời đội hình.

Sau đó:

> CHỌN POKÉMON ĐỒNG HÀNH MỚI

Card từng Pokémon còn lại:

- image.
- nickname/species.
- Level.
- HP.
- Bond.

Click 1 card → set active → close modal.

## UI khi hết Pokémon

Hiển thị:

> Bạn không còn Pokémon nào trong bộ sưu tập.

CTA:

> 🥚 Mua trứng Pokémon mới — 10 Hào Quang

Nếu đủ Hào Quang:

- mua trực tiếp hoặc chuyển tới Pet profile nhưng chỉ cần tối đa 1 click bổ sung.

Nếu không đủ:

> Cần thêm X Hào Quang để mua trứng.

Cho nút:

> Tiếp tục học không có Pokémon

Không soft-lock.

---

# 19. Pokémon Reaction System — PHASE 2

Pokémon cần “sống” hơn nhưng không được làm chậm lớp.

Không cần lưu Mood vào database.

Mood/reaction chỉ là UI event tạm thời.

## Reaction examples

Positive Solo:

- 😊 “Great!”
- ⚡ “Pika!”
- 🔥 “Nice answer!”

High reward:

- 🤩 bounce + glow.

Negative score:

- 😣 shake nhẹ.
- hiển thị HP loss.

Battle win:

- victory animation.

Battle loss:

- determined animation, không shame.

Level up:

- flash nhẹ.

Evolution:

- special overlay 1.5–2 sec.

## Performance rule

- Dùng CSS/motion đơn giản.
- Không tạo video/full canvas animation.
- Không loop animation liên tục.
- Không để reaction kéo dài >2 giây.
- `pointer-events: none` cho overlay.

---

# 20. Homework Streak — PHASE 3

Đây là feature duy nhất chấp nhận thêm một thao tác nhỏ vì mục tiêu trực tiếp là làm BTVN chăm hơn.

## UX tối ưu

Trong màn hình lớp thêm nút:

> 📚 CHECK HOMEWORK

Click mở modal compact.

### Default

- Chỉ lấy học sinh đang present.
- Tất cả mặc định `✅ DONE`.
- Giáo viên chỉ click những em chưa làm để chuyển `❌ MISSING`.
- Bấm `CONFIRM`.

Với lớp 15 em, 2 em chưa làm → khoảng 3–4 click.

## Rule

### Done

- `homeworkStreak + 1`.
- best streak update.
- active Pokémon `+15 XP`.
- active Pokémon `+2 Bond`.

### Missing

- `homeworkStreak = 0`.
- Không tự trừ Hào Quang.
- Không tự damage HP.

Nếu giáo viên muốn phạt vì quên BTVN, dùng hệ thưởng/phạt hiện có.

Tránh double punishment tự động.

## Milestones

- 3 homework liên tiếp → +10 bonus XP.
- 5 → +20 bonus XP.
- 10 → special Drop / Candy ở Phase 4.
- 20 → tăng Shiny Egg chance cho lần hatch kế tiếp ở Phase 4.

## Lesson key

Không dùng daily streak.

Tạo:

```ts
lessonKey = `${className}:${YYYY-MM-DD}`
```

Mỗi student chỉ được Homework Check 1 lần cho `lessonKey`.

Nếu modal mở lại trong cùng lesson:

- hiển thị trạng thái “Đã chốt Homework”.
- không cộng XP/streak lần hai.

Có thể thêm admin-only reset check sau, không cần Phase 3 ban đầu.

## Student đang không có Pokémon

Homework Streak vẫn tăng.

Nếu đang có egg nhưng chưa có active Pokémon:

- có thể cộng `+1 egg progress` cho homework hoàn thành.
- không cộng Pokémon XP/Bond vì chưa có Pokémon active.

---

# 21. Instant Random Drops — PHASE 4

Mục tiêu: tạo bất ngờ nhưng không cần Lucky Wheel 10 giây.

## Trigger

Chỉ trigger sau:

- positive Solo result.
- Battle result có score > 0.

Base chance:

```text
6%
```

Gengar passive có thể x2 chance.

## Phase 4A — Auto-applied drops

Để giữ zero interaction, trước tiên không cần inventory phức tạp.

Possible drops:

| Drop | Effect |
|---|---|
| 🍬 Rare Candy | +15 XP |
| 🍓 Oran Berry | +10 HP |
| 💖 Friendship Ribbon | +3 Bond |
| ⚡ Energy Spark | +1 Charge |

Toast:

> ✨ RARE DROP! 🍬 +15 XP

Auto apply.

Không mở modal.

Duration ~1.2s.

## Drop không được cộng Hào Quang

Đây là Pokémon reward riêng.

---

# 22. Shiny Pokémon — PHASE 4

Mỗi Pokémon khi được tạo/hatch/gift có `isShiny`.

## Base shiny chance

```text
2%
```

Không reroll shiny khi evolution.

Shiny status gắn với `instanceId` và tồn tại suốt đời Pokémon đó.

## Visual

Nếu shiny:

- dùng PokeAPI shiny artwork nếu endpoint có ảnh.
- nếu không có ảnh, fallback normal artwork + gold/rainbow aura.
- thêm badge `✨ SHINY`.

## Homework bonus

Có thể lưu:

```ts
nextEggShinyBonus?: number
```

Ví dụ Homework Streak 20 tăng chance lần hatch tiếp theo:

- base 2% → 5%.
- bonus consume sau khi hatch.

Không cần làm ngay nếu data complexity cao; có thể để Phase 4B.

---

# 23. Pokédex — PHASE 5

Collection hiện `pets[]` chỉ chứa Pokémon đang sở hữu.

Nếu Pokémon chết/release thì lịch sử collection bị mất.

Tạo Pokédex permanent.

## Khi Pokémon lần đầu được acquire/hatch/fusion

```ts
student.pokedex[dexId] = {
  dexId,
  discovered: true,
  shinyDiscovered: isShiny,
  firstDiscoveredAt: Date.now()
}
```

Khi Pokémon bị mất:

- xóa khỏi `pets[]`.
- **không xóa Pokédex entry**.

## UI

Trong Pet Profile thêm tab/section:

> 📕 MY POKÉDEX · 12/XX discovered

- chưa có → silhouette.
- đã từng có → artwork.
- đã từng có shiny → shiny star.

Không cần teacher interaction trong lớp.

---

# 24. Mastery — PHASE 5

Sau Level 30, Pokémon không level tiếp theo normal system.

XP dư chuyển vào Mastery.

## Mastery stars

- ⭐ 1: 300 Mastery XP.
- ⭐ 2: +400.
- ⭐ 3: +500.
- ⭐ 4: +600.
- ⭐ 5: +800.

Mastery không tăng Hào Quang.

Reward chủ yếu cosmetic:

- special border.
- glow.
- title.
- Best Companion badge.

Không tạo pay-to-win hoặc academic advantage lớn.

---

# 25. Pokémon Profile UI 2.0

Trong `profileTab === 'pet'` hiển thị hierarchy rõ ràng.

## Hero card

- artwork.
- nickname.
- species.
- shiny badge.
- Level.
- HP.
- XP.
- Bond.
- Charge.
- Passive.
- Mastery nếu Level 30.

Ví dụ:

```text
PIKA ⚡
Pikachu · Lv. 12
❤️ 78/100
XP 42/85
💖 Bond 64/100
⚡ Charge 3/5
Passive: Static Charge Lv.2
```

## Evolution preview

Hiển thị:

> Next Evolution: Lv. 20

hoặc:

> Final Evolution Reached

Không cần tính theo Hào Quang nữa.

## Collection

Giữ danh sách `pets[]` như hiện tại nhưng mỗi card thêm:

- Lv.
- HP.
- Bond.
- shiny.

---

# 26. Student Card UI

Không làm StudentCard quá dày.

Chỉ thêm tối đa:

- `Lv.X` nhỏ cạnh Pokémon.
- HP bar như hiện có.
- nếu shiny → sparkle icon.
- nếu Pokémon Charge Ready → ⚡ icon.

Không nhét XP/Bond/Streak đầy đủ lên dashboard lớp.

Chi tiết xem trong Random/Profile.

---

# 27. Egg System Integration

Giữ egg progress hiện tại để không phá data/workflow.

## Khi egg hatch

Pokémon mới phải được init đầy đủ:

```ts
{
  instanceId,
  dexId,
  baseDexId,
  speciesName,
  nickname: undefined,
  types,
  hp: 100,
  level: 1,
  xp: 0,
  totalXp: 0,
  bond: 0,
  charge: 0,
  isShiny,
  masteryXp: 0,
  masteryStars: 0,
  passiveId,
  accessories: [],
  skills: [],
  skillUses: {}
}
```

Mark Pokédex discovery khi Phase 5 tồn tại.

## Important

Egg hatching do positive Hào Quang hiện tại có thể tiếp tục chạy.

Không cần đổi toàn bộ incubation economy trong first release.

---

# 28. Fusion Integration

Hệ thống fusion hiện có phải tiếp tục hoạt động.

Khi fusion tạo Pokémon mới:

- tạo `instanceId` mới.
- HP theo rule fusion hiện tại hoặc 100 nếu current implementation như vậy.
- Level đề xuất = floor average level của 2 input Pokémon), clamp min 1 max 30.
- XP = 0 tại level mới.
- Bond = floor average Bond / 2 hoặc reset 0. Đề xuất reset 0 để Pokémon mới cần xây bond lại.
- Charge = 0.
- skills: giữ theo logic hiện tại.
- passive derive từ new baseDexId.
- Mastery reset 0.

### Shiny fusion

Phase đầu đơn giản:

- nếu cả 2 input shiny → output shiny.
- nếu chỉ 1 shiny → output normal.

Không thêm RNG mới cho fusion trong first pass.

---

# 29. Lucky Wheel Integration

Lucky Wheel hiện có reward:

- points,
- pokemon,
- skill,
- hp,
- ludo rolls.

## Nếu reward Pokémon

Pokémon mới phải init data model mới đầy đủ.

## Nếu reward points

Đi qua reward/punishment Aura path → HP coupling như hiện tại.

## Nếu reward HP

Chỉ đổi HP, không đổi Hào Quang, không cấp Pokémon XP.

## Nếu reward skill

Không ảnh hưởng HP.

Không để Lucky Wheel spin tự tạo Answer Streak.

---

# 30. Purchase Integration

## Buy Skill

Current behavior:

- trừ Hào Quang.
- add skill.
- không damage Pokémon.

Giữ đúng.

## Buy Egg

- trừ Hào Quang 10.
- không damage Pokémon.
- tạo egg state.

Nếu mua trứng trong release flow vì không còn Pokémon:

- không có active pet nên đương nhiên không có HP damage.

---

# 31. History / Audit Trail

History phải vẫn dễ hiểu.

Không cần ghi từng +1 Bond/+5 XP vào `student.history`, nếu không history sẽ spam.

`student.history` chỉ ghi các sự kiện lớn:

- Hào Quang.
- hatch.
- evolution.
- Pokémon lost/released.
- Pokémon acquired.
- Level milestone quan trọng nếu muốn.
- Shiny hatch.
- Mastery star.

XP/Bond/Streak nhỏ chỉ hiển thị UI event, không ghi History.

---

# 32. Supabase / Persistence

## Core phases

Không cần tạo column mới cho từng field Pokémon vì `students` là JSONB.

`supabaseData.ts` đã sync toàn `Student[]`.

Chỉ cần đảm bảo:

- normalize data sau fetch.
- normalize data sau import.
- fields mới serialize sạch qua `sanitizeForSupabase`.

## Không phá dữ liệu cũ

Test:

- user cũ login → Pokémon vẫn còn.
- HP không reset.
- skill không mất.
- skillUses không mất.
- pets collection không mất.
- egg không mất.
- history không mất.

---

# 33. Performance Requirements

App dùng trong tiết học nên phải phản hồi tức thời.

## Không được

- network call trong mỗi point event để tính game logic.
- gọi Gemini cho Pokémon progression.
- animation loop nặng.
- modal liên tiếp sau mọi câu trả lời.
- Lucky Wheel-like 10s animation cho automatic reward.

## Nên

- game logic pure local.
- React state update một lần/event nếu có thể.
- batch derived effects.
- toast auto-dismiss.
- CSS/motion nhẹ.
- memoize display helpers nếu cần.

---

# 34. Accessibility / Classroom Readability

Imperial School thường chiếu trên màn hình lớp.

- Không dùng font quá nhỏ cho XP/HP quan trọng.
- Contrast cao.
- Pokémon stat tối thiểu 11–12px tương đương Tailwind practical size trên desktop.
- Không dựa hoàn toàn vào màu để phân biệt HP/status.
- Animation ngắn, không gây chóng mặt.

---

# 35. Implementation Order

Không code tất cả một lần.

## PHASE 0 — Safe foundation

1. Tạo `instanceId` support.
2. Tạo migration/normalizer.
3. Sửa `isSamePokemon` dùng `instanceId`.
4. Tách species/nickname theo hướng backward-compatible.
5. Tạo `pokemonProgression.ts`.
6. Tạo `gameEvents.ts` skeleton.
7. Đảm bảo build pass.

### Acceptance

- app chạy như cũ.
- không feature mới visible cũng được.
- dữ liệu cũ load được.
- selection/remove/fusion vẫn đúng.

---

## PHASE 1 — Core Pokémon RPG

Implement:

1. XP.
2. Level.
3. evolution by Level.
4. Bond.
5. Answer Streak.
6. Battle Win Streak.
7. Charge.
8. Passive Ability.
9. preserve HP→release flow.

### Acceptance

- Solo +3 → Hào Quang +3, HP +3, Pokémon +15 base XP.
- Solo -3 → Hào Quang -3, HP -3, no XP.
- answer streak automatic.
- level up automatic.
- evolution automatic.
- passive automatic.
- no extra teacher click.
- HP 0 removes Pokémon exactly once.

---

## PHASE 2 — Classroom UI

Implement:

1. Random Solo status.
2. Battle status.
3. reaction toast.
4. level-up/evolution animation lightweight.
5. release modal 2.0.
6. profile Pokémon progression panel.
7. StudentCard compact indicators.

### Acceptance

- teacher workflow unchanged.
- no blocking popup after normal answer.
- release modal works after Solo/manual/Battle.

---

## PHASE 3 — Homework Streak

Implement compact homework modal.

### Acceptance

- present students default DONE.
- click missing students only.
- confirm once/lesson.
- Done updates streak/XP/Bond.
- Missing resets streak.
- no auto Hào Quang penalty.

---

## PHASE 4 — Surprise layer

Implement:

1. Instant Drops.
2. Shiny.
3. special visuals.

### Acceptance

- no extra teacher click.
- drops auto apply.
- shiny persists through evolution/sync/export/import.

---

## PHASE 5 — Long-term collection

Implement:

1. Pokédex.
2. Mastery.
3. collection polish.

---

# 36. Testing Plan

Nên thêm Vitest cho pure game logic.

Nếu không muốn thêm test framework, ít nhất phải viết manual test checklist và chạy build sau từng phase.

## Unit tests quan trọng

### HP

- HP 100 +3 =100.
- HP 50 -3 =47.
- HP 2 -3 → release.
- release remove đúng `instanceId`.
- nếu có 2 Pokémon cùng dexId, chỉ đúng instance bị remove.

### Purchases

- buy skill -20 Hào Quang nhưng HP không đổi.
- buy egg -10 Hào Quang nhưng HP không đổi.

### Battle

- diff 3 → winner +3 HP, loser -3 HP.
- không double apply generic Aura HP.
- loser pet về 0 → release modal.

### XP

- Solo +3 → +15 XP.
- Solo -3 → 0 XP.
- XP overflow level correctly.
- negative event never decreases XP.

### Streak

- +, +, + → streak 3 + milestone.
- +, - → reset.
- manual admin +5 không tăng Answer Streak.

### Evolution

- Lv4 stage0.
- Lv5 stage1.
- Lv12 stage2.
- Lv20 stage3.
- Lv30 stage4.
- evolution preserves skills/HP/bond/shiny/nickname.

### Migration

- old pet no `instanceId` → gets ID.
- old pet no level → no de-evolution.
- duplicate same species → each has unique instanceId.

### Homework

- confirm same lesson twice → no duplicate reward.
- missing resets streak.
- absent student not processed.

### Sync

- save/reload Supabase preserves all new fields.
- JSON export/import preserves all new fields.

---

# 37. Manual Classroom Scenario Test

Dùng scenario này trước khi coi feature hoàn thành.

## Student A

- Pikachu Lv1, HP 90.
- Random Solo.
- teacher gives +3.

Expected:

- Hào Quang +3.
- HP 93.
- +15 XP.
- Bond +1.
- Answer Streak 1.
- Charge 1.
- UI reaction tự biến mất.

## Lần 2 +3

- +15 XP.
- Streak 2.
- Charge 2.

## Lần 3 +3

- Streak 3.
- milestone XP bonus.
- Pikachu Static Charge triggers.
- Charge 3.

Không cần teacher bấm gì thêm ngoài chấm điểm.

## Negative scenario

Pikachu HP 2.

Teacher applies -3 Hào Quang.

Expected:

- points -3.
- Pikachu HP 0.
- Pokémon bị remove khỏi `pets`.
- active pet undefined.
- Answer Streak reset nếu event là Solo.
- release modal hiện.

Nếu còn Squirtle:

- modal hiển thị Squirtle.
- chọn Squirtle.
- Squirtle trở thành active.

Nếu không còn Pokémon:

- modal hiển thị mua trứng.
- nếu >=10 Hào Quang → mua được.
- nếu <10 → disabled + số còn thiếu + có thể tiếp tục học không Pokémon.

---

# 38. Do NOT Do These Things

1. Không đổi HP=0 thành faint/revive.
2. Không tự tặng replacement Pokémon miễn phí.
3. Không bắt giáo viên xác nhận XP/Bond/Passive từng lần.
4. Không tạo Daily Streak theo ngày liên tục.
5. Không bắt học sinh giơ tay mới có progression.
6. Không tạo quest yêu cầu teacher tick liên tục.
7. Không cộng quá nhiều popup.
8. Không dùng Gemini/API để quyết định XP/drop/passive.
9. Không dùng `reason.includes(...)` làm nguồn truth cho event type.
10. Không phá các feature hiện có.
11. Không reset data cũ.
12. Không để 2 Pokémon cùng loài bị nhầm vì dùng dexId/name làm identity.
13. Không double HP damage trong Battle.
14. Không cho spending Hào Quang làm damage HP.
15. Không làm evolution random lại form mỗi update.

---

# 39. Definition of Done cho bản Pokémon Core 2.0

Bản đầu tiên được coi là hoàn thành khi:

- [ ] Dữ liệu cũ migrate an toàn.
- [ ] Mỗi Pokémon có stable `instanceId`.
- [ ] XP + Level hoạt động.
- [ ] Evolution dựa trên Level.
- [ ] Bond hoạt động.
- [ ] Answer Streak hoạt động tự động.
- [ ] Battle Win Streak hoạt động tự động.
- [ ] Charge hoạt động tự động.
- [ ] Passive Ability hoạt động tự động.
- [ ] Random Solo hiển thị progression mới.
- [ ] Battle hiển thị progression mới.
- [ ] Pokémon reaction không blocking.
- [ ] Hào Quang thưởng/phạt vẫn liên kết HP.
- [ ] Spending Hào Quang không làm mất HP.
- [ ] Battle HP logic không bị double.
- [ ] HP = 0 vẫn mất Pokémon.
- [ ] Pokémon bị mất được remove đúng khỏi collection.
- [ ] Modal chọn Pokémon khác hoạt động.
- [ ] Nếu hết Pokémon, có flow mua trứng.
- [ ] Không đủ tiền mua trứng không soft-lock app.
- [ ] Skills 2-use vẫn hoạt động.
- [ ] Fusion vẫn hoạt động.
- [ ] Lucky Wheel vẫn hoạt động.
- [ ] Cá Ngựa vẫn hoạt động.
- [ ] Supabase sync không lỗi.
- [ ] JSON backup/import không lỗi.
- [ ] `npm run build` pass.

---

# 40. Codex Execution Instructions

Codex nên làm theo thứ tự sau:

1. Đọc toàn bộ `PLAN.md` trước khi sửa.
2. Đọc `Progress.md`, `types.ts`, `pokemonData.ts`, `App.tsx`, `StudentCard.tsx`, `supabaseData.ts`.
3. Không viết lại app từ đầu.
4. Không thay UI ngoài scope nếu không cần.
5. Tạo foundation/migration trước.
6. Chạy `npm run build` sau mỗi phase.
7. Nếu build fail, fix trước khi sang phase tiếp.
8. Giữ backward compatibility với dữ liệu local/Supabase cũ.
9. Với mỗi phase hoàn thành, cập nhật `Progress.md`:
   - Completed.
   - Files changed.
   - Manual steps nếu có.
   - Known limitations.
10. Nếu phát hiện behavior hiện tại mâu thuẫn với PLAN, ưu tiên các mục **NON-NEGOTIABLE RULES** trong file này.

---

# 41. Recommended First Coding Scope

Để tránh một PR quá lớn, lần chạy Codex đầu tiên chỉ nên làm:

## Milestone A

- stable `instanceId`.
- migration.
- XP.
- Level.
- Bond.
- Answer Streak.
- Charge.
- evolution by level.
- preserve HP death/release.
- minimal UI trong Random Solo.

Sau khi Milestone A ổn và build pass mới làm:

## Milestone B

- Passive Ability.
- Battle integration.
- reaction toast.
- release modal polish.

Sau đó:

## Milestone C

- Homework Streak.
- Drops.
- Shiny.
- Pokédex.
- Mastery.

---

# Final Product Principle

Imperial School không nên trở thành một game buộc giáo viên dành thêm 10–15 phút để vận hành.

Nó phải tạo cảm giác game **tự xuất hiện từ chính quá trình học**:

```text
Random → trả lời → chấm điểm
               ↓
       Hào Quang / HP
               ↓
      XP / Level / Bond
               ↓
   Streak / Charge / Passive
               ↓
      Evolution / Shiny
               ↓
     Attachment với Pokémon
```

Giáo viên vẫn dạy như cũ.

Học sinh lại cảm thấy mỗi câu trả lời đều đang “nuôi” Pokémon của mình.

Đó là mục tiêu cốt lõi của Imperial School Pokémon Companion System 2.0.
