import { getExerciseById, isExerciseAvailable, type Exercise } from '@/constants/exercises';
import {
  deriveWorkoutTitle,
  estimateWorkoutMinutes,
  getWorkoutForDate,
  type DailyWorkout,
  type SessionExercise,
} from '@/constants/workouts';
import {
  evaluateExerciseProgression,
  type ExerciseProgressionResult,
} from '@/lib/progression';
import {
  getProgressionPreferences,
  resolvePreferredExerciseId,
  type ProgressionPreferences,
} from '@/lib/progression-preferences';
import {
  getUserPreferences,
  type EquipmentOption,
  type ExperienceLevel,
} from '@/lib/user-preferences';
import { getWorkoutHistory, localDateKey, type CompletedWorkout } from '@/lib/workout-history';

type WorkoutSession = {
  dateKey: string;
  workout: DailyWorkout;
  locked: boolean;
  modified: boolean;
  startedAtWallMs?: number;
  startedAtPerfMs?: number;
};

const CLOCK_JUMP_MS = 8 * 60 * 60 * 1000;

export type LevelUpOffer = {
  currentId: string;
  currentName: string;
  nextId: string;
  nextName: string;
};

let session: WorkoutSession | null = null;
let inFlight: Promise<DailyWorkout> | null = null;

function capTarget(value: number, result: ExerciseProgressionResult, fallback: number) {
  const lower = fallback;
  const upper = result.maxTarget;
  return Math.min(upper, Math.max(lower, value));
}

function defaultTarget(exercise: SessionExercise, result: ExerciseProgressionResult) {
  if (exercise.kind === 'timed') {
    return exercise.durationSec ?? result.defaultTarget;
  }
  return exercise.reps ?? result.defaultTarget;
}

export function libraryExerciseToSession(exercise: Exercise): SessionExercise {
  if (exercise.type === 'hold') {
    return {
      id: exercise.id,
      name: exercise.name,
      sets: exercise.defaultSets,
      kind: 'timed',
      durationSec: exercise.defaultRepsOrDuration,
      instruction: exercise.cue,
      animationType: exercise.animationType,
    };
  }

  return {
    id: exercise.id,
    name: exercise.name,
    sets: exercise.defaultSets,
    kind: 'reps',
    reps: exercise.defaultRepsOrDuration,
    instruction: exercise.cue,
    animationType: exercise.animationType,
  };
}

export function applyProgressionToExercise(
  exercise: SessionExercise,
  result: ExerciseProgressionResult
): SessionExercise {
  const fallback = defaultTarget(exercise, result);
  let next = fallback;

  switch (result.status) {
    case 'increase-reps':
      next = capTarget(result.suggestedTarget ?? fallback, result, fallback);
      break;
    case 'at-max':
      next = capTarget(result.currentTarget ?? result.maxTarget, result, fallback);
      break;
    case 'ready-for-next-variation':
      next = capTarget(result.currentTarget ?? fallback, result, fallback);
      break;
    case 'not-ready':
      next = capTarget(result.currentTarget ?? fallback, result, fallback);
      break;
    case 'not-enough-data':
    default:
      next = fallback;
      break;
  }

  if (exercise.kind === 'timed') {
    return { ...exercise, durationSec: next };
  }

  return { ...exercise, reps: next };
}

function resolveSessionExercise(
  exercise: SessionExercise,
  preferences: ProgressionPreferences,
  equipment: readonly EquipmentOption[]
): SessionExercise {
  const resolvedId = resolvePreferredExerciseId(exercise.id, preferences);
  if (resolvedId === exercise.id) {
    return exercise;
  }

  const next = getExerciseById(resolvedId);
  if (!next || !isExerciseAvailable(next, equipment)) {
    return exercise;
  }

  return libraryExerciseToSession(next);
}

export function personalizeWorkout(
  generated: DailyWorkout,
  history: CompletedWorkout[],
  now = new Date(),
  preferences: ProgressionPreferences = {},
  equipment: readonly EquipmentOption[] = ['none']
): DailyWorkout {
  const exercises = generated.exercises.map((exercise) => {
    const resolved = resolveSessionExercise(exercise, preferences, equipment);
    return applyProgressionToExercise(
      resolved,
      evaluateExerciseProgression(resolved.id, history, now, { equipment })
    );
  });

  return {
    ...generated,
    exercises,
    title: deriveWorkoutTitle(generated),
  };
}

export function getLevelUpOffers(
  workout: DailyWorkout,
  history: CompletedWorkout[],
  now = new Date(),
  equipment: readonly EquipmentOption[] = ['none'],
  experience?: ExperienceLevel
): LevelUpOffer[] {
  return workout.exercises.flatMap((exercise) => {
    const result = evaluateExerciseProgression(exercise.id, history, now, { equipment, experience });
    if (result.status !== 'ready-for-next-variation' || !result.nextExerciseId || !result.nextExerciseName) {
      return [];
    }

    const next = getExerciseById(result.nextExerciseId);
    if (!next || !isExerciseAvailable(next, equipment)) {
      return [];
    }

    return [
      {
        currentId: exercise.id,
        currentName: exercise.name,
        nextId: next.id,
        nextName: next.name,
      },
    ];
  });
}

async function generatePersonalizedWorkout(now: Date): Promise<DailyWorkout> {
  const [history, preferences, userPreferences] = await Promise.all([
    getWorkoutHistory(),
    getProgressionPreferences(),
    getUserPreferences(),
  ]);
    const generated = getWorkoutForDate(
      now,
      userPreferences.equipment,
      userPreferences.experienceLevel
    );
  return personalizeWorkout(
    generated,
    history,
    now,
    preferences,
    userPreferences.equipment
  );
}

export async function getPersonalizedWorkout(now = new Date()): Promise<DailyWorkout> {
  const requestedKey = localDateKey(now);

  if (session && session.dateKey === requestedKey && (session.locked || session.modified)) {
    return session.workout;
  }

  if (session?.locked) {
    return generatePersonalizedWorkout(now);
  }

  const bindSession = requestedKey === localDateKey();

  if (bindSession && inFlight) {
    return inFlight;
  }

  if (!bindSession) {
    return generatePersonalizedWorkout(now);
  }

  inFlight = (async () => {
    if (session && (session.locked || session.modified)) {
      return session.workout;
    }

    const workout = await generatePersonalizedWorkout(now);
    if (session && (session.locked || session.modified)) {
      return session.workout;
    }

    session = {
      dateKey: workout.dateKey,
      workout,
      locked: session?.locked ?? false,
      modified: session?.modified ?? false,
      startedAtWallMs: session?.startedAtWallMs,
      startedAtPerfMs: session?.startedAtPerfMs,
    };
    return session.workout;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function getTodaysLevelUpOffers(now = new Date()): Promise<LevelUpOffer[]> {
  const [workout, history, userPreferences] = await Promise.all([
    getPersonalizedWorkout(now),
    getWorkoutHistory(),
    getUserPreferences(),
  ]);
  return getLevelUpOffers(
    workout,
    history,
    now,
    userPreferences.equipment,
    userPreferences.experienceLevel
  );
}

export async function beginPersonalizedWorkoutSession(now = new Date()): Promise<DailyWorkout> {
  if (session?.locked) {
    return session.workout;
  }

  const workout = await getPersonalizedWorkout(now);
  session = {
    dateKey: workout.dateKey,
    workout,
    locked: true,
    modified: session?.modified ?? false,
    startedAtWallMs: Date.now(),
    startedAtPerfMs: performance.now(),
  };
  return session.workout;
}

export function replacePersonalizedWorkoutExercise(
  index: number,
  next: SessionExercise
): DailyWorkout | null {
  if (!session || index < 0 || index >= session.workout.exercises.length) {
    return null;
  }

  const exercises = session.workout.exercises.map((exercise, exerciseIndex) =>
    exerciseIndex === index ? next : exercise
  );

  session = {
    ...session,
    modified: true,
    workout: {
      ...session.workout,
      exercises,
      title: deriveWorkoutTitle(session.workout),
      estimatedMinutes: estimateWorkoutMinutes(exercises),
    },
  };

  return session.workout;
}

export function getPersonalizedWorkoutElapsedSeconds(): number | null {
  if (session?.startedAtWallMs == null || session?.startedAtPerfMs == null) {
    return null;
  }

  const wall = Date.now() - session.startedAtWallMs;
  const mono = performance.now() - session.startedAtPerfMs;

  let elapsedMs: number;
  if (wall < 0 || wall > CLOCK_JUMP_MS) {
    elapsedMs = Math.max(0, mono);
  } else if (mono < 0) {
    elapsedMs = Math.max(0, wall);
  } else {
    elapsedMs = Math.max(wall, mono);
  }

  return Math.max(0, Math.round(elapsedMs / 1000));
}

export function getPersonalizedWorkoutStartedAtWallMs(): number | null {
  return session?.startedAtWallMs ?? null;
}

export function getActivePersonalizedWorkout(): DailyWorkout | null {
  if (session?.locked) {
    return session.workout;
  }
  return session?.workout ?? null;
}

export function releasePersonalizedWorkoutLock() {
  if (session) {
    session.locked = false;
  }
}

export function formatExercisePrescription(exercise: SessionExercise): string {
  if (exercise.kind === 'timed') {
    return `${exercise.sets} × ${exercise.durationSec}`;
  }
  return `${exercise.sets} × ${exercise.reps}`;
}
