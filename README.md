# CALIS

CALIS is a minimalist iOS calisthenics app that turns bodyweight training into a simple, guided daily practice.

It generates a personalized daily workout, guides you through every set and rest period, tracks your training history, and adapts progression over time.

## Features

- **Daily workouts** — deterministic five-exercise sessions covering push, legs, pull, glutes, and core.
- **Personalized training** — workouts adapt to experience level, available equipment, goals, and progression preferences.
- **Guided workout flow** — set tracking, rest timers, timed holds, haptics, and exercise animations.
- **Progression** — increase reps or hold duration before moving to harder exercise variations.
- **Exercise replacement** — replace an individual exercise with a related, equipment-appropriate alternative without regenerating the workout.
- **Progress tracking** — weekly activity, streaks, recent workouts, progression insights, and next targets.
- **Onboarding & settings** — experience, equipment, goals, appearance, app icon, progression, and Apple Health settings.
- **Light / dark mode** — system, light, and dark appearance options with matching native app icons.
- **Apple Health** — optionally saves completed CALIS workouts to Apple Health.
- **Offline-first** — workout data and preferences are stored locally; there is no backend.

## Tech Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript
- Expo Router
- React Native SVG
- React Native Reanimated
- AsyncStorage
- Swift / Expo Modules for native iOS functionality
- HealthKit

## Architecture

CALIS is primarily a local iOS application with no backend.

```
src/
├── app/          # Screens and navigation
├── components/   # Reusable CALIS UI and exercise animations
├── constants/    # Exercise library, workout generation, theme
└── lib/          # Personalization, progression, history, preferences, Health
modules/
└── calis-native/ # Custom Swift Expo module for native iOS features
plugins/
└── *.js          # Expo config plugins for native iOS configuration
```

The active workout session is kept in memory while persistent data is stored locally with AsyncStorage. Native appearance state is mirrored through iOS `UserDefaults` where required.

## Development

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

For native iOS development:

```bash
npx expo run:ios
```

Type-check the project:

```bash
npx tsc --noEmit
```

### Native development note

CALIS contains custom native iOS code, config plugins, HealthKit integration, alternate app icons, and a custom UIScene lifecycle.

The `ios/` directory is generated and disposable. The source of truth for native configuration is `app.json`, the files in `plugins/`, and `modules/calis-native`.

> **Do not run `npx expo prebuild --clean`** unless you understand and explicitly intend to regenerate the native project.

## Project Structure

### Workout system

The daily workout generator creates five exercise slots. Personalization then applies the user's experience, equipment, goals, preferred variations, and progression targets.

During a workout, the current session is locked in memory so replacements and progression choices do not unexpectedly regenerate the active workout.

### Progression

CALIS uses progression ladders for reps and timed holds. After sufficient successful sessions at a target, the app can offer the next progression step or a harder variation.

### Data

Workout history, preferences, progression preferences, appearance preference, app icon preference, and Apple Health de-duplication data are stored locally.

### Native iOS

The custom `calis-native` module currently provides:

- Appearance synchronization
- Alternate app icon switching
- Apple Health workout writes

The project also uses Expo config plugins for native iOS configuration.

## Design

CALIS follows a restrained editorial visual language:

- Warm off-white and near-black foundations
- Restrained burnt-orange accent
- Large typography and generous whitespace
- Hairline dividers
- Minimal cards and controls
- Procedural line-based exercise animations
- Light and dark themes designed as a single visual system

## Status

CALIS is an actively developed personal iOS fitness project.

The current codebase is focused on the core workout experience, progression, local history, personalization, and native iOS integration.

## Author

**ROBZ!**

Built by Robert Makar.
