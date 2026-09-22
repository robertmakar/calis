@AGENTS.md

# CALIS — Engineering Instructions

CALIS is an existing, production-oriented Expo / React Native **iOS** calisthenics app. Treat it as a working system: make the smallest safe change that solves the requested task, and nothing else.

---

## 0. Working rules (read first)

**The user's explicit request is the source of truth.** Do not automatically act on observations from earlier audits, "known issues" listed in this file, or problems you notice while working. Mention them if relevant; do not fix them unless asked.

For every task:

1. Read the relevant existing code first.
2. Trace the existing state/data flow before editing (systems here are coupled — see §6–§9).
3. Identify the smallest set of files that need to change.
4. Make only the requested change.
5. Preserve existing behavior outside that scope.
6. Run `npx tsc --noEmit`.
7. If relevant, run the existing self-tests (§11).
8. Report exactly which files changed and why.
9. Clearly state any assumptions or risks.
10. Never claim a native change is complete without stating whether a native rebuild is required (see §5).

Do **not**:

- rewrite working systems, or make architectural improvements opportunistically;
- introduce a new state-management architecture (Redux, Zustand, new contexts, etc.) unless explicitly requested;
- "clean up", reformat, or refactor unrelated code while implementing a task;
- modify files merely because you noticed an issue;
- add dependencies unless genuinely necessary for the requested feature;
- remove dependencies, template files, or assets because they appear unused;
- alter behavior outside the requested scope.

---

## 1. Project overview

- Daily, deterministic, personalized bodyweight workout (5 exercises: push, legs, pull, glutes, core).
- Guided session with set / rest / hold timers and procedural SVG exercise animations.
- Automatic progression (more reps/seconds → harder variation), with user-confirmed level-ups.
- Exercise replacement, workout history, streaks, Progress screen insights.
- Onboarding (experience, equipment, goal), settings, light/dark/system appearance, light/dark alternate app icon.
- Optional Apple Health **write-only** workout export.
- No backend. All data is local (AsyncStorage + a small iOS UserDefaults mirror).

## 2. Tech stack

- Expo SDK **57** (`expo ~57.0.x`) — read the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing Expo code. APIs have changed; do not rely on memory.
- React Native 0.86 (New Architecture, Hermes), React 19.2, **React Compiler enabled** (`experiments.reactCompiler`).
- Expo Router 57, **typed routes** enabled (`experiments.typedRoutes`).
- TypeScript 6, `strict: true`. Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`, `calis-native` → `modules/calis-native`.
- Key libs: `@react-native-async-storage/async-storage`, `react-native-svg`, `react-native-reanimated` 4 + `react-native-worklets`, `expo-haptics`, `expo-splash-screen`, `expo-system-ui`, `expo-status-bar`, `react-native-safe-area-context`.
- Local Expo module `modules/calis-native` (Swift, ExpoModulesCore), autolinked via `package.json` → `expo.autolinking.nativeModulesDir: "./modules"`.
- Bundle id `app.calis.mobile`, URL scheme `calis`. EAS: `development` profile only (`eas.json`).

## 3. Architecture and important directories

```
src/app/            Expo Router screens (file-based routes)
src/components/     Calis* UI primitives, theme provider, exercise animations
src/constants/      Static data: exercise library, workout generator, theme tokens
src/lib/            Domain logic + persistence (history, progression, preferences, Health, appearance, icon)
modules/calis-native/  Local Expo native module (Swift) + TS wrapper
plugins/            Config plugins that produce the native iOS project
assets/             Icons, splash images, tab icons
ios/, android/      GENERATED (git-ignored). Disposable. Never the source of truth.
dist/               Export output (git-ignored)
```

Layering: `constants` ← `lib` ← `app`/`components`. There is **no global store**. Screens read persisted data through `src/lib/*` and reload on focus (`useFocusEffect`). The only React context is the theme (`CalisThemeProvider`). The active workout is an **in-memory module singleton** in `src/lib/personalized-workout.ts`.

## 4. Important files and responsibilities

| File | Responsibility |
|---|---|
| `src/app/_layout.tsx` | Root `Stack`. Loads onboarding flag + appearance + icon preference before rendering; chooses `initialRouteName`; per-screen gesture/animation options; mounts `AnimatedSplashOverlay`; re-applies native app icon on launch. |
| `src/app/(tabs)/_layout.tsx` | Redirects to onboarding if incomplete; renders `AppTabs`. |
| `src/components/app-tabs.tsx` | **Custom horizontal pager** (not a Tabs navigator). Imports Home and Progress screens directly, keeps both mounted, syncs page ↔ `/` and `/explore` via `router.navigate`/`usePathname`. Does not render `<Slot/>`. |
| `src/app/(tabs)/index.tsx` | Home: greeting, streak, today's workout, progression hints, Start / Replace. |
| `src/app/(tabs)/explore.tsx` | Progress: week strip + day preview, streak/count, Getting Stronger, Next Target, Recent Workouts. |
| `src/app/workout-overview.tsx` | Pre-start summary; Start → `/level-up` if offers exist, else `/workout`. |
| `src/app/level-up.tsx` | Keep / Level-up choice; persists level-ups as progression preferences; `replace('/workout')`. |
| `src/app/workout.tsx` | Live session: phases, timers, performance capture, exit guarding. |
| `src/app/complete.tsx` | Saves history once, writes Apple Health, shows streak + next targets; `dismissTo('/')`. |
| `src/app/replace-exercise.tsx` | In-memory swap of one exercise in today's workout. |
| `src/app/exercise/[id].tsx` | Exercise guide, animation, chain, "Your progress", level-up entry. |
| `src/app/onboarding.tsx` | 4 steps; persists draft per step; `completeOnboarding` → `replace('/')`. |
| `src/app/settings/*` | Profile editors, progression variation chooser (`progression/[id]`), appearance, app icon, Apple Health, reset progress / onboarding. |
| `src/app/dev/*` | Progression fixtures, onboarding preview, animation gallery (reachable via deep link; leave as-is). |
| `src/constants/exercises.ts` | Exercise library (IDs are persisted data), guides, chain helpers, `isExerciseAvailable`, `validateExerciseProgression` (runs in `__DEV__`). |
| `src/constants/workouts.ts` | Deterministic daily generator, `SessionExercise`/`DailyWorkout` types, `estimateWorkoutMinutes`. |
| `src/constants/workout.ts` | `REST_SECONDS = 45`. |
| `src/constants/theme.ts` | `CalisColors` (light/dark) and `Calis` tokens. (`Colors`/`Fonts`/`Spacing` are template leftovers — leave them.) |
| `src/lib/personalized-workout.ts` | Session singleton, personalization, level-up offers, elapsed time. |
| `src/lib/progression.ts` | Progression evaluator + `runProgressionEvaluatorFixtures`. |
| `src/lib/progression-preferences.ts` | `from → to` variation map. |
| `src/lib/progress-insights.ts` | Getting Stronger / Next Target, `hasLegitimateProgressionTarget`. |
| `src/lib/exercise-alternatives.ts` | Replacement candidates. |
| `src/lib/workout-history.ts` | History storage, pending performance buffer, date keys, streak, summaries. |
| `src/lib/user-preferences.ts` | Experience / equipment / goal / onboarding flag. |
| `src/lib/appearance.ts`, `src/lib/app-icon.ts`, `src/lib/apple-health.ts` | JS side of native features. |
| `src/components/calis-theme.tsx` | `CalisThemeProvider`, `useCalisTheme`, `CalisStatusBar`. |
| `src/components/exercise-animation.tsx` | Procedural SVG stick-figure animations keyed by `animationType`. |
| `modules/calis-native/index.ts` | TS wrapper; safely no-ops when the native module is missing / non-iOS. |
| `modules/calis-native/ios/CalisNativeModule.swift` | Appearance override, alternate icon, HealthKit auth + workout save. |
| `plugins/with-ios-scene-lifecycle.js` | UIScene manifest + AppDelegate/SceneDelegate patching + `CalisAppearance` enum. |
| `plugins/with-ios-alternate-icon.js` | `AppIcon` / `AppIconDark` asset sets, Info.plist, build settings. |
| `plugins/with-ios-healthkit.js` | HealthKit entitlement, usage string, framework. |

## 5. Native iOS architecture

**Source of truth:** `app.json` + `plugins/*` + `modules/calis-native`. The local `ios/` directory is generated and disposable.

- Make native changes **only** through the config plugins and/or `modules/calis-native`. Never hand-edit `ios/` as the source of truth (edits there are lost on regeneration).
- Before any native change, read the relevant plugin/module and understand how it produces the generated project.
- **NEVER run `npx expo prebuild --clean`** unless the user explicitly authorizes it after reviewing the consequences.
- When reporting native changes, say whether a rebuild is needed:
  - Swift in `modules/calis-native` → native rebuild (`npx expo run:ios` / dev client rebuild).
  - Plugin / `app.json` / entitlement / Info.plist / asset-catalog change → prebuild (regenerate `ios/`) **and** native rebuild. Ask before regenerating.
  - JS/TS only → Metro reload is enough.

**UIScene / SceneDelegate** (`with-ios-scene-lifecycle.js`): regex-patches Expo's Swift `AppDelegate` template to remove `startReactNative` from `didFinishLaunching`, store `launchOptions`, and append a `SceneDelegate` that creates the `UIWindow`, applies `CalisAppearance`, starts RN (`"main"`), and forwards URL/user-activity to `RCTLinkingManager`. The scene manifest is also declared in `app.json` `ios.infoPlist` (intentional duplication; keep both consistent). The regex depends on the SDK 57 template — if it stops matching, RN will start twice or not at all. Preserve this architecture.

**Appearance:** JS preference (`calis.appearance.v1` in AsyncStorage) is mirrored to **`UserDefaults["calis.appearance"]`** (`"light" | "dark" | "system"`). Two Swift `CalisAppearance` enums read that key: an internal one in the generated AppDelegate (applied before first frame) and a private one in the module (runtime `overrideUserInterfaceStyle` on all windows). Keep key, values, and both implementations in sync.

**Alternate icon:** asset catalog `AppIcon` (from `assets/images/ios-icon-light.png`) and `AppIconDark` (from `ios-icon-dark.png`); `CFBundleAlternateIcons.AppIconDark`; build settings `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = AppIconDark`, `INCLUDE_ALL_APPICON_ASSETS = YES`. The name `AppIconDark` is shared by plugin, plist, build settings, and Swift. JS preference `calis.appIcon.v1` is the source of truth; root layout re-applies it at launch; Swift no-ops if already set.

**HealthKit:** write-only, `HKObjectType.workoutType()` only. `HKWorkoutBuilder`, `.functionalStrengthTraining`, indoor, metadata `HKMetadataKeySyncIdentifier` = sessionId (+ `SyncVersion` 1), brand "CALIS", `calis_workout_title`. Only saves when authorized.

**Splash:** `expo-splash-screen` — light `#F4F3F0`, dark **`#0D0D0D`** (the correct CALIS dark color; `app.json` is authoritative, a stale generated colorset may differ). JS `AnimatedSplashOverlay` hides the native splash on layout, then fades out.

## 6. Workout / session architecture

**Generation** (`getWorkoutForDate` in `constants/workouts.ts`): 5 slots `push, legs, pull, glutes, core`; deterministic FNV hash seeded by `dateKey:salt:category`; re-salts (≤12) to avoid repeating yesterday. Beginner → beginner-difficulty pool (excludes `push-ups`); others → progression groups collapsed to a mid/top variation. Chain collapse only applies to chains contributing two or more eligible default candidates; a chain with a single eligible member keeps that exercise at its library position (so adding progression metadata or progression-only siblings never reorders the pool). Every pool is filtered by `isDefaultCandidate`: difficulty allowed for the experience (`isDifficultyAllowedForExperience`: beginner → beginner; some-experience → ≤ intermediate; experienced → ≤ advanced) and the optional per-chain `GENERATION_LEVEL_CAPS` (`push-up` ≤ 4, `plank` ≤ 2 and `side-plank` ≤ 2 for some-experience/experienced, `hollow` ≤ 1 for everyone,  so harder steps are reached only via level-ups; set a cap whenever harder variations are added to a chain. Caps are maxima only. The same filter also drops any exercise marked `progressionOnly: true` from every default pool (category, collapse, fallback, no-bar pull fallback); such exercises stay fully available to progression traversal, level-up offers, saved preferences and replacement lists. Mark new progression variations `progressionOnly` so they do not reshape daily workouts — currently the 10 Stage 3 core, 6 Stage 4 leg, 2 Stage 5 row and 5 Stage 6 vertical-pull and 2 Stage 7 glute additions. Dead hang is deliberately NOT progression-only: it is the entry point of the vertical chain and joins bar/gym users' pull pool (Stage 6's intentional generator change; no-bar users unaffected). Conversely, `independentDefault: true` keeps an existing daily exercise as its own default candidate after it joins a chain (chain collapse and chain caps treat it as standalone; progression unaffected; validator forbids combining it with `progressionOnly`) — currently reverse lunges). Equipment fallbacks: same category with no equipment → any no-equipment exercise. `estimatedMinutes` clamped 15–25.

**Personalization** (`personalizeWorkout`): resolve preferred variation (transitive, cycle-safe, equipment-checked) → apply progression target to reps/duration.

**Session singleton** (`personalized-workout.ts`): `{ dateKey, workout, locked, modified, startedAtWallMs, startedAtPerfMs }` + a shared `inFlight` promise. Preserve these semantics exactly:

- `getPersonalizedWorkout()` returns the cached workout if `locked || modified` for today; otherwise **regenerates on every call** (so preference/history changes apply). Concurrent calls for today share `inFlight`. Non-today dates are generated without binding the session.
- `beginPersonalizedWorkoutSession()` sets `locked: true` and records wall + monotonic start times.
- `workout.tsx` unmount calls `releasePersonalizedWorkoutLock()`.
- `replacePersonalizedWorkoutExercise()` sets `modified: true` — this **intentionally freezes today's workout** (later level-ups / settings changes do not apply today). Do not change unless asked.
- `getPersonalizedWorkoutElapsedSeconds()` uses max(wall, monotonic) with an 8h clock-jump guard.
- `complete.tsx` reads the singleton synchronously (`getActivePersonalizedWorkout`).

**Session flow** (`workout.tsx`): phases `active | hold | rest | ready`; 1-second `setTimeout` countdown; rest = `REST_SECONDS`. Performance per set: reps → `completed = target`; holds → `target − secondsLeft` (effectively full). **This is current intended behavior** — do not add failed-set input or change it unless explicitly requested. On the last rest: `setPendingWorkoutPerformance(...)` → `permitLeave()` → `router.replace('/complete')`.

**Completion** (`complete.tsx`): guarded by `savedRef` to save once → `saveCompletedWorkout` → `clearPendingWorkoutPerformance` → `saveCalisWorkoutToAppleHealth` (start = session start, end = start + elapsed; sessionId `calis.<dateKey>.<startMs>`).

Out of scope unless explicitly requested: persisting a session across app kill, and background-accurate timers.

## 7. Progression / personalization rules

Do not change these semantics unless the task explicitly changes progression.

- Evaluator (`evaluateExerciseProgression`): considers the most recent **3** sessions that have set data (entries dated after today are ignored).
  - < 2 recorded sessions → `not-enough-data`.
  - Latest not fully successful → `not-ready`.
  - < 2 successes at the current target → `not-ready`.
  - Next ladder step exists → `increase-reps` (`suggestedTarget`).
  - At ladder top + `harderVariationId` → `ready-for-next-variation`; else `at-max`.
- Ladder: reps `default … max(12, default)` step 1; holds `default … max(40, default)` step 5. An exercise may override with optional `progression: { ceiling?, step? }` (validator: positive integer step, ceiling ≥ default and reachable in whole steps). Used by diamond/decline (ceiling 10) and archer (ceiling 8).
- Difficulty tiers: `beginner | intermediate | advanced`. `advanced` is for future variations only; existing exercises keep their tier. Two separate rules in `constants/workouts.ts`: **default difficulty** (`isDifficultyAllowedForExperience`, `MAX_DEFAULT_DIFFICULTY`: beginner → beginner; some-experience → ≤ intermediate; experienced → all) governs generation and replacement lists; **earned progression** (`isProgressionStepAllowed`, `MAX_PROGRESSION_DIFFICULTY`: beginner/some-experience → intermediate, experienced → advanced) governs level-up traversal — progression is free within the default tier, a user earns one tier beyond it only when stepping out of it, and never above the progression ceiling. Push results: beginner stops at push-ups; some-experience at diamond (no chair) / decline (chair); experienced reaches archer. Only the manual variation picker in Settings → Progression can choose beyond it.
- Chains (via `progressionGroup` / `progressionLevel` / `easierVariationId` / `harderVariationId`, validated by `validateExerciseProgression`):
  push-up: wall → incline (chair) → knee → push-ups → diamond → decline (chair) → archer (advanced; reps are per side — stated at the start of its cue, which the live workout shows under the animation) · squat: box squats (chair) → bodyweight squats → assisted pistols → pistols (advanced) · split-squat: assisted → split → reverse lunges → Bulgarian (chair) → shrimp (advanced) · calf-raise: calf raises → single-leg calf raises (unilateral leg moves: reps per side) · glute-bridge: bridge → single-leg → single-leg hip thrusts (advanced, chair; reps per side) · hinge: good mornings → single-leg RDLs (reps per side) — no-equipment glute progression tops out at intermediate · australian-row: assisted → rows → feet-elevated rows → archer rows (advanced; reps per side) — all pull-up bar; rows stay beginner, and feet-elevated rows carry `minProgressionExperience: 'some-experience'` (an optional generic field checked by the evaluator on top of the difficulty rules), so beginners stop at rows · pull-up (vertical, all pull-up bar, separate chain — no cross-chain link from rows): dead hang (hold, default-generated entry) → scapular pull-ups → negative pull-ups (3–5 s lowering) → chin-ups → pull-ups → archer pull-ups (advanced; reps per side); beginners stop at negatives, some-experience at pull-ups · plank: knee plank → plank → shoulder taps (each tap = 1 rep) → long-lever plank (advanced) · hollow: dead bug → extended dead bug → tuck hollow hold → hollow hold → hollow rocks (advanced) · side-plank: knee side plank → side plank → hip dips (reps per side) → star plank (advanced). Bird dog, crunches and reverse crunches stay standalone.
- Level-up: offers from `getLevelUpOffers` (equipment-filtered). "Level up" persists `setPreferredExercise(from, to)`. **"Keep current" is intentionally not persisted** (offer reappears) — leave as-is.
- Equipment-aware chain walking: `getNextAvailableVariation` / `getPreviousAvailableVariation` (in `constants/exercises.ts`) skip steps the user cannot perform. `evaluateExerciseProgression(id, history, now, { equipment, experience })` uses it when `equipment` is passed; `experience` ends the walk at the first variation above that experience's difficulty ceiling (→ `at-max`). Without the options it follows `harderVariationId` directly (legacy). All app callers pass the user's saved equipment and experience level (Home hints, overview, live workout, Complete, exercise detail and settings progression via `getExerciseProgressionStatus`, level-up offers, personalization, Progress insights), so no-equipment users go wall → knee → push-ups and chair users wall → incline → knee → push-ups; with no usable harder step the result is `at-max`. Level-up UI trusts `result.nextExerciseId` (never re-checks `harderVariationId`). Generation never jumps on its own — only an accepted level-up (saved preference) changes the exercise. Replacement alternatives still evaluate without equipment (targets only).
- Future manual baselines (NOT implemented): working target = round(baseline × **0.7**), snapped to the ladder; a baseline never places a user more than **one** variation harder than the reference exercise.
- Replacement candidates (`getExerciseAlternatives`): chain members first, else same category + type + overlapping muscles; equipment and experience filtered; easier first; max 4; prescribed via progression.

## 8. Persistence and data contracts

**Do not change storage keys or persisted shapes without explicit approval.** All values are JSON in AsyncStorage and normalized/validated on read.

| Key | Shape / notes |
|---|---|
| `calis.workout-history.v1` | `CompletedWorkout[]` = `{ date: 'YYYY-MM-DD', exercises: { id, name, kind?: 'reps'\|'timed', sets?: { target, completed }[] }[], totalSets, duration (sec) }`, sorted by date. `kind`/`sets` are optional (older entries lack them). |
| `calis.user-preferences.v1` | `{ experienceLevel, equipment: EquipmentOption[], goal, onboardingCompleted }`. `'none'` is exclusive in equipment. |
| `calis.progression-preferences.v1` | `Record<fromExerciseId, toExerciseId>`; invalid IDs dropped on read. |
| `calis.appearance.v1` | `'system' \| 'light' \| 'dark'`; mirrored to `UserDefaults["calis.appearance"]`. |
| `calis.appIcon.v1` | `'light' \| 'dark'`. |
| `calis.apple-health.last-session-id.v1` | Last successfully exported sessionId (Health de-dup). |

Contracts:

- **One history entry per local date.** `saveCompletedWorkout` returns early if that date exists. Streaks, week view, "completed today", and Health de-dup rely on it.
- Dates are **local** `YYYY-MM-DD` keys (`localDateKey`, `dateFromLocalKey`). Never switch to UTC/ISO timestamps.
- **Exercise IDs are stable identifiers** persisted in history and preferences. Never rename or remove an ID; add new exercises with new IDs.
- Writes to history / user preferences / progression preferences are serialized through per-module `writeChain` promises — route new writes through them.
- In-memory only (not persisted): workout session, pending performance buffer.

## 9. Navigation and workout exit behavior

- Root `Stack`: `headerShown: false`, `animation: 'slide_from_right'`, background from theme.
- `onboarding`, `complete`: `animation: 'fade'`, `gestureEnabled: false`. `workout`: `gestureEnabled: false` (also set in `setOptions`). Android predictive back disabled.
- Tabs are the custom pager in `app-tabs.tsx`; both screens stay mounted and load via `useFocusEffect` **and** a `pathname` effect.
- **Workout exit guard — keep all layers intact:**
  1. `usePreventRemove(!leaveAllowed)` captures any removal and stores the action to replay.
  2. `EndWorkoutConfirm` modal (Keep / End).
  3. iOS-only 28px left-edge `PanResponder` (`WorkoutEdgeLeaveGuard`) opens the confirm on swipe.
  4. Completion bypasses the guard via `permitLeave()` → pending `'complete'` → `router.replace('/complete')`.
- Back affordance: `CalisBack` (← glyph, 44pt) paired with `CalisBackSlot` for symmetric top bars; settings use `SettingsHeader`. Both call `router.back()`.
- Flow endings: onboarding → `replace('/')`; level-up → `replace('/workout')`; complete → `dismissTo('/')`.
- Routes are typed; some query-string pushes use `as Href`.

## 10. Design system and UI conventions

- Tokens: `CalisColors.light/dark` (`background #F4F3F0 / #0D0D0D`, `surface`, `primary`, `secondary`, `border`, `onPrimary`, `destructive`, `accent #C4622D / #E08A58`, `accentMuted`, `accentText`) and `Calis.space` (xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, hero 40), `Calis.radius` (card 8, button 10), `Calis.type` (brand, caption, display, title, body, meta), `Calis.button` (height 52), `Calis.cta`.
- Always get colors from `useCalisTheme().colors` and apply inline. Colors inside `Calis.type.*` are light defaults only. Do not use `Colors`/`useTheme`/`ThemedText` (template leftovers).
- Use existing primitives: `CalisText`, `CalisButton` (`primary`/`ghost`, full width), `CalisCard`, `CalisExerciseRow`, `CalisBack`/`CalisBackSlot`, `CalisMark`/`CalisWordmark`, `CalisBrandHeader`, `SettingsGear`, `CalisStatusBar` (include on full-screen pages).
- Visual language: uppercase labels with letter-spacing, `→` in CTAs, `×` in prescriptions (`3 × 8`), hairline dividers, 24px horizontal gutters, safe-area-aware fixed bottom CTA bar, 🔥 streak line, minimal and monochrome with a single warm accent.
- Screens manage their own safe-area padding (`insets.top + 12` pattern).
- Animations: `ExerciseAnimation` keyed by `animationType`; every exercise's `animationType` must have a builder.

## 11. Development / testing commands

```bash
npx tsc --noEmit          # REQUIRED after every change (currently passes cleanly)
npx expo start            # Metro (dev client)
npx expo run:ios          # native build; regenerates ios/ from plugins if needed — ask before running when native config changed
```

- Self-tests (no Jest/test runner is configured):
  - `runProgressionEvaluatorFixtures()` — view at `/dev/progression` (deep link `calis://dev/progression`).
  - `validateExerciseProgression()` — runs automatically in `__DEV__`; warns in the Metro log on chain errors.
  - `/dev/animations` — visual check of every exercise animation.
- `npm run lint` (`expo lint`): ESLint is **not installed or configured**; running it would install packages and create config files. Do not run it without approval.
- **Never** `npx expo prebuild --clean` without explicit authorization.

## 12. Critical invariants

1. Storage keys and persisted data shapes (§8) are unchanged.
2. Exercise IDs are stable; chains pass `validateExerciseProgression`.
3. One history entry per local date; local date keys.
4. Session singleton `locked` / `modified` / `inFlight` semantics (§6).
5. Progression semantics (§7), including set-completion recording and non-persisted "Keep current".
6. HealthKit: write-only workouts, authorization-gated, de-duplicated by last-session key + sync identifier.
7. `UserDefaults["calis.appearance"]` key/values shared by JS, module, and AppDelegate.
8. `AppIconDark` name and alternate-icon plugin architecture.
9. UIScene / SceneDelegate startup (RN started from `SceneDelegate`, not `AppDelegate`).
10. Workout exit guard layers (§9).
11. Native source of truth = `app.json` + `plugins/` + `modules/calis-native`; dark splash `#0D0D0D`.
12. `npx tsc --noEmit` passes.

## 13. Requires explicit approval before changing

- Running `npx expo prebuild --clean` (or deleting/regenerating `ios/`).
- Any storage key, persisted data shape, or exercise ID.
- Progression rules, ladders, thresholds, set-completion semantics, or "Keep current" persistence.
- Session singleton semantics, replacement-freezes-today behavior, mid-workout persistence, background timers.
- HealthKit scope (read access, new types), de-dup logic, or entitlement changes.
- Appearance key/mechanism, icon naming, UIScene/SceneDelegate, or any config plugin.
- Adding or removing dependencies.
- New state-management approach, navigation restructuring (incl. the custom tab pager), or workout exit guard changes.
- Gating/removing dev routes; progression-chain equipment redesign.
- Removing template leftovers or unused assets (`Colors`/`Fonts`/`Spacing`, `themed-*`, `hint-row`, `web-badge`, `ui/collapsible`, `external-link`, `AnimatedIcon`, `animated-icon.web.tsx`, `scripts/reset-project.js`, `assets/expo.icon`).
- Changes to `app.json`, `eas.json`, `tsconfig.json`, or `package.json`.
- Committing, branching, or other git operations.
