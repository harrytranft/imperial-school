# Progress

## Completed

- Migrated authentication from Firebase Auth to Supabase Auth in `AuthContext.tsx`.
- Migrated cloud data sync from Firestore to Supabase in `App.tsx`.
- Added `supabaseClient.ts` for Vite Supabase environment config.
- Added `supabaseData.ts` for reading/writing the per-user cloud snapshot.
- Added `supabase-schema.sql` with `profiles`, `user_settings`, RLS policies, and a profile creation trigger.
- Removed Firebase runtime files and dependency:
  - `firebase.ts`
  - `firebase-applet-config.json`
  - `firebase-blueprint.json`
  - `firestore.rules`
  - `firebase` package
- Removed stale `bun.lock` because Bun is not installed here and the lockfile still referenced Firebase.
- Verified production build with `npm run build`.
- Ran `npm audit fix`; `npm audit` now reports 0 vulnerabilities.
- Updated Cá Ngựa so each race is scoped to one class only, including board display, player selector, and kick/collision logic.
- Reverted the top clock/date display and navbar auto-hide after user feedback.
- Added customizable Pokémon skills in Settings and included them in local storage, JSON backup, and Supabase sync.
- Added hide/show toggles for Settings sections.
- Removed the top clock/date display and returned the main navbar to a normal sticky bar.
- Removed the imperial accessory shop from the student profile; Pokémon progression now focuses on skills only.
- Added a dedicated `Hợp nhất Linh thú` profile tab for merging exactly 2 Pokémon into a new one while preserving still-active purchased skills.
- Added HP defeat handling: when a Pokémon reaches 0 HP, it is removed from the student's owned Pokémon, a release modal is shown, and the student can choose another companion or open the egg screen.
- Reworked Lucky Wheel so it opens first, starts only after pressing the spin button, runs a 10-second slow-fast-slow animation, and plays separate spin/finish sounds.
- Made Lucky Wheel rewards use random selection from customizable reward data instead of a fixed deterministic flow.
- Added glowy lottery-style Lucky Wheel visuals with larger reward labels and result text.
- Added Lucky Wheel reward type for bonus Cá Ngựa dice rolls from 1 to 5.
- Added Cá Ngựa bonus roll tracking so Lucky Wheel bonus rolls can be consumed without awarding the normal +1 answer point.
- Added Lucky Wheel sound URLs and customizable rewards/penalties to Settings, local storage, JSON backup, and Supabase sync.
- Started Pokémon Companion System 2.0 Phase 1:
  - Added `instanceId`, species/nickname, Level, XP, Bond, Charge, Shiny/Mastery, passive, Pokedex, and student streak fields.
  - Added automatic backward-compatible Pokémon normalization for Supabase load, guest localStorage load, and JSON import.
  - Added `pokemonProgression.ts`, `pokemonPassives.ts`, and `gameEvents.ts` for pure progression/passive/event logic outside `App.tsx`.
  - Switched new Pokémon creation and egg hatching to Level-based progression defaults instead of Hào Quang-based evolution.
  - Added deterministic evolution variants based on Pokémon `instanceId`.
  - Added Random Solo XP, Answer Streak, Bond, Charge, passive hooks, and Level-based evolution.
  - Added Battle XP/Bond/Charge and Battle Win Streak while preserving existing Battle HP rules.
  - Updated pet collection identity/selection to prefer `instanceId` and preserve nicknames through evolution.
  - Added compact Level/XP/Bond/Charge display in Random Solo and student profile.
- Verified production build with `npm run build` after Pokémon Companion System 2.0 Phase 1 changes.
- Added Pokémon Companion System 2.0 Phase 2 UI:
  - Added `PokemonMiniStatus`, `PokemonPassiveBadge`, and `PokemonReactionToast` components.
  - Upgraded Random Solo status with Pokémon Level, HP, XP bar, Bond, Answer Streak, Charge, and Passive badge.
  - Added non-blocking Pokémon reaction toast for Solo and Battle progression feedback.
  - Upgraded Battle cards with Level/HP/XP/Bond/Battle Streak/Passive status while preserving Battle workflow.
  - Upgraded release modal with cause text, Level/HP/Bond replacement cards, direct egg purchase when affordable, shortfall messaging when not affordable, and a continue-without-Pokémon escape path.
- Verified production build with `npm run build` after Pokémon Companion System 2.0 Phase 2 changes.
- Added Pokémon Companion System 2.0 Phase 3 Homework Check:
  - Added compact `HomeworkCheckModal` for present students only, defaulting everyone to Done.
  - Added a `Check Homework` class toolbar button.
  - Added per-class lesson keys in the format `className:YYYY-MM-DD` to prevent double-checking the same student in one lesson.
  - Done homework now increases Homework Streak, grants active Pokémon XP/Bond, applies x3/x5 streak bonus XP, and gives egg-only students +1 egg progress.
  - Missing homework resets Homework Streak without changing Hào Quang or HP.
  - Added non-blocking Homework Check reaction summary toast.
- Verified production build with `npm run build` after Pokémon Companion System 2.0 Phase 3 changes.
- Added Pokémon Companion System 2.0 Phase 4 Surprise Layer:
  - Added Instant Random Drops after positive Solo and Battle events with score > 0.
  - Drops auto-apply without teacher clicks: Rare Candy (+15 XP), Oran Berry (+10 HP), Friendship Ribbon (+3 Bond), and Energy Spark (+1 Charge).
  - Gengar/Mischief passive now doubles Instant Drop chance from 6% to 12%.
  - Drop events show through the non-blocking reaction toast and are prioritized when several Pokémon UI events happen at once.
  - New Pokémon now roll a persistent 2% Shiny chance on hatch/gift/acquisition.
  - Shiny Pokémon use shiny artwork when available, fallback to normal artwork if needed, and show sparkle/ring/badge visuals in class cards, profile, Lucky Wheel, and release flow.
  - Fusion now follows Phase 4 integration: average input level, reset bond/charge/mastery, preserve current skill merge logic, and output shiny only when both input Pokémon are shiny.
- Verified production build with `npm run build` after Pokémon Companion System 2.0 Phase 4 changes.
- Added Pokémon Companion System 2.0 Phase 5 collection polish:
  - Added permanent per-student Pokédex entries with discovered, shiny discovered, and first discovered timestamp data.
  - Pokédex discovery is preserved through normalization and is marked when Pokémon are hatched, gifted, fused, selected, or released.
  - Added `PokemonPokedexPanel` to the Pet Profile with discovered count, known artwork, hidden unknown entries, and shiny indicators.
  - Added Level 30 Mastery XP conversion with five cosmetic star thresholds: 300, 700, 1200, 1800, and 2600 Mastery XP.
  - Added Mastery reaction events and profile display for Mastery XP/stars after Lv.30.
  - Upgraded Pokémon Profile hero with species, HP, Passive, Evolution Preview, and clearer Level/XP/Bond/Charge hierarchy.
  - Upgraded owned collection cards with Level, HP, Bond, and shiny markers.
- Verified production build with `npm run build` after Pokémon Companion System 2.0 Phase 5 changes.
- Added Pokémon Companion System 2.0 follow-up adjustments:
  - Homework Done now grants +8 Hào Quang and heals the active Pokémon by +8 HP while keeping Homework Streak, XP, Bond, and egg progress behavior.
  - Pokémon reaction toast now stays visible for 10 seconds, includes a close button, and closes when clicking outside.
  - Pokémon level-up events now also show a centered Level Up modal.
  - Battle results now create ordered Cá Ngựa turns: winner first, loser second only when the loser score is not negative.
  - Cá Ngựa now displays the ordered Battle queue directly instead of requiring a manual dropdown selection for those turns.
  - Reaching the final Cá Ngựa tile or finishing a lap opens Lucky Wheel for that student with a 60% good reward / 40% bad reward weighting.
  - Pokémon normalization now recalculates evolution from Pokémon XP/Level instead of preserving old Hào Quang-based evolved forms.
  - Student cards now show current Answer, Battle, and Homework streak badges when active.
  - Rebuilt `docs/pokemon-companion-2-intro.html` as a clearer liquid-glass student-facing feature guide with keyboard navigation.
- Verified production build with `npm run build` after the follow-up adjustments.

## Manual Steps Needed

1. In Supabase, open SQL Editor and run the full contents of `supabase-schema.sql`.
   - If you already ran the older schema, run it again so `user_settings.pet_skills`, `wheel_spin_sound_url`, `wheel_finish_sound_url`, and `lucky_wheel_rewards` are added.
2. In Supabase Auth, make sure Email login is enabled.
3. If users cannot log in right after signing up, either confirm their email from the Supabase email, or disable required email confirmation for development/testing.
4. In Supabase Auth URL settings, add your deployed Vercel domain as an allowed site/redirect URL. Add `http://localhost:3000` too if you test locally.
5. In Vercel Environment Variables, confirm these exact names exist:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Redeploy Vercel after changing environment variables.
7. Optional: If you want Google login, enable the Google provider in Supabase Auth and configure its OAuth redirect URLs.

## Notes

- Existing Firebase/Firestore cloud data is not automatically migrated because this repo does not contain Firebase admin credentials or an export file.
- Local browser data still migrates automatically to Supabase on the first successful login.
- The most likely reason a newly created Supabase account cannot log in is required email confirmation.
