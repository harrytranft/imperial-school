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
