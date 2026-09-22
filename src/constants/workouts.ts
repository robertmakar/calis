import {
  type AnimationType,
  type Exercise,
  type ExerciseCategory,
  type ExerciseDifficulty,
  type ExerciseEquipment,
  type ProgressionGroup,
  EXERCISES,
  isExerciseAvailable,
} from '@/constants/exercises';
import { REST_SECONDS } from '@/constants/workout';
import { type EquipmentOption, type ExperienceLevel } from '@/lib/user-preferences';

export type SessionExercise = {
  id: string;
  name: string;
  sets: number;
  kind: 'reps' | 'timed';
  reps?: number;
  durationSec?: number;
  instruction: string;
  animationType: AnimationType;
};

export type WorkoutLevel = 'Beginner' | 'Intermediate' | 'Experienced';

export type WorkoutProgram = 'full-body' | 'upper-body' | 'lower-body' | 'core' | 'mobility';

export type DailyWorkout = {
  id: string;
  title: string;
  program: WorkoutProgram;
  level: WorkoutLevel;
  estimatedMinutes: number;
  exercises: SessionExercise[];
  dateKey: string;
};

const LEVEL_LABEL: Record<ExperienceLevel, WorkoutLevel> = {
  beginner: 'Beginner',
  'some-experience': 'Intermediate',
  experienced: 'Experienced',
};

const SLOTS: ExerciseCategory[] = ['push', 'legs', 'pull', 'glutes', 'core'];
const DEFAULT_EQUIPMENT: ExerciseEquipment[] = ['none'];
const DEFAULT_WORKOUT_PROGRAM: WorkoutProgram = 'full-body';
const PROGRAM_TITLE: Record<WorkoutProgram, string> = {
  'full-body': 'Full Body',
  'upper-body': 'Upper Body',
  'lower-body': 'Lower Body',
  core: 'Core',
  mobility: 'Mobility',
};

export function deriveWorkoutTitle(workout: {
  program?: WorkoutProgram | null;
}): string {
  const program = workout.program;
  if (program && program in PROGRAM_TITLE) {
    return PROGRAM_TITLE[program];
  }
  return PROGRAM_TITLE[DEFAULT_WORKOUT_PROGRAM];
}

const DIFFICULTY_RANK: Record<ExerciseDifficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

/** Highest difficulty assigned by default (generation, replacement lists). */
const MAX_DEFAULT_DIFFICULTY: Record<ExperienceLevel, ExerciseDifficulty> = {
  beginner: 'beginner',
  'some-experience': 'intermediate',
  experienced: 'advanced',
};

/** Highest difficulty a user can ever earn through progression (level-ups). */
const MAX_PROGRESSION_DIFFICULTY: Record<ExperienceLevel, ExerciseDifficulty> = {
  beginner: 'intermediate',
  'some-experience': 'intermediate',
  experienced: 'advanced',
};

function isDifficultyWithin(difficulty: ExerciseDifficulty, max: ExerciseDifficulty): boolean {
  return DIFFICULTY_RANK[difficulty] <= DIFFICULTY_RANK[max];
}

/**
 * Highest progressionLevel the generator may assign by default, per chain and experience.
 * A missing entry means no cap. Harder levels stay reachable through explicit progression
 * (level-ups / progression preferences).
 */
const GENERATION_LEVEL_CAPS: Partial<
  Record<ProgressionGroup, Partial<Record<ExperienceLevel, number>>>
> = {
  // Diamond / decline / archer (levels 5–7) are reached through level-ups, not assigned by default.
  'push-up': { 'some-experience': 4, experienced: 4 },
  // Core chains keep plank / dead bug / side plank as the default; harder steps come from level-ups.
  plank: { 'some-experience': 2, experienced: 2 },
  hollow: { beginner: 1, 'some-experience': 1, experienced: 1 },
  'side-plank': { 'some-experience': 2, experienced: 2 },
};

/** Whether a difficulty may be assigned by default (generation, replacement lists) at this experience. */
export function isDifficultyAllowedForExperience(
  difficulty: ExerciseDifficulty,
  experience: ExperienceLevel
): boolean {
  return isDifficultyWithin(difficulty, MAX_DEFAULT_DIFFICULTY[experience]);
}

/**
 * Whether progression may move from a `from` variation into a `to` variation at this experience.
 * Within the default tier progression is free; a user earns one tier beyond it only by stepping
 * out of the default tier (e.g. beginner: knee push-ups → push-ups, but not push-ups → diamond);
 * nothing above MAX_PROGRESSION_DIFFICULTY is ever reachable.
 */
export function isProgressionStepAllowed(
  from: ExerciseDifficulty,
  to: ExerciseDifficulty,
  experience: ExperienceLevel
): boolean {
  if (!isDifficultyWithin(to, MAX_PROGRESSION_DIFFICULTY[experience])) {
    return false;
  }
  if (isDifficultyAllowedForExperience(to, experience)) {
    return true;
  }
  const defaultRank = DIFFICULTY_RANK[MAX_DEFAULT_DIFFICULTY[experience]];
  return isDifficultyAllowedForExperience(from, experience) && DIFFICULTY_RANK[to] <= defaultRank + 1;
}

function isWithinGenerationCap(exercise: Exercise, experience: ExperienceLevel): boolean {
  if (exercise.independentDefault || !exercise.progressionGroup || exercise.progressionLevel == null) {
    return true;
  }
  const cap = GENERATION_LEVEL_CAPS[exercise.progressionGroup]?.[experience];
  return cap == null || exercise.progressionLevel <= cap;
}

/** Single eligibility filter for every default-generation pool (category, collapse and fallback pools). */
function isDefaultCandidate(exercise: Exercise, experience: ExperienceLevel): boolean {
  return (
    exercise.progressionOnly !== true &&
    isDifficultyAllowedForExperience(exercise.difficulty, experience) &&
    isWithinGenerationCap(exercise, experience)
  );
}

function ownedEquipment(userEquipment?: readonly EquipmentOption[]): ExerciseEquipment[] {
  if (!userEquipment || userEquipment.length === 0 || userEquipment.includes('none')) {
    return DEFAULT_EQUIPMENT;
  }
  return userEquipment.filter((item): item is ExerciseEquipment => item !== 'none');
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function beginnerPool(
  category: ExerciseCategory,
  equipment: readonly ExerciseEquipment[]
): Exercise[] {
  return EXERCISES.filter((exercise) => {
    if (exercise.category !== category || !isDefaultCandidate(exercise, 'beginner')) {
      return false;
    }
    if (exercise.id === 'push-ups') {
      return false;
    }
    return isExerciseAvailable(exercise, equipment);
  });
}

function noneEquipmentFallbacks(): Exercise[] {
  return EXERCISES.filter((exercise) => {
    if (!isDefaultCandidate(exercise, 'beginner') || exercise.id === 'push-ups') {
      return false;
    }
    return isExerciseAvailable(exercise, ['none']);
  });
}

function targetProgressionLevel(levels: number[], experience: ExperienceLevel): number {
  if (levels.length === 0) {
    return 1;
  }
  if (experience === 'experienced') {
    return levels[levels.length - 1];
  }
  if (levels.length <= 2) {
    return levels[levels.length - 1];
  }
  return levels[Math.ceil((levels.length - 1) / 2)];
}

function closestVariation(members: Exercise[], target: number): Exercise {
  const sorted = [...members].sort(
    (a, b) => (a.progressionLevel ?? 0) - (b.progressionLevel ?? 0)
  );
  const exact = sorted.find((item) => item.progressionLevel === target);
  if (exact) {
    return exact;
  }
  const atOrBelow = [...sorted]
    .reverse()
    .find((item) => (item.progressionLevel ?? 0) <= target);
  return atOrBelow ?? sorted[0];
}

function collapseProgressionGroups(
  exercises: Exercise[],
  experience: ExperienceLevel
): Exercise[] {
  const grouped = new Map<string, Exercise[]>();

  for (const exercise of exercises) {
    if (!exercise.independentDefault && exercise.progressionGroup && exercise.progressionLevel != null) {
      const current = grouped.get(exercise.progressionGroup) ?? [];
      current.push(exercise);
      grouped.set(exercise.progressionGroup, current);
    }
  }

  // A chain with a single eligible member has nothing to choose between, so that member keeps
  // its library position among the standalone exercises; only real choices are collapsed.
  const collapsible = [...grouped.values()].filter((members) => members.length > 1);
  const selected = collapsible.map((members) => {
    const levels = [...new Set(members.map((item) => item.progressionLevel ?? 1))].sort(
      (a, b) => a - b
    );
    return closestVariation(members, targetProgressionLevel(levels, experience));
  });
  const collapsed = new Set(collapsible.flat());

  return [...selected, ...exercises.filter((exercise) => !collapsed.has(exercise))];
}

function experiencePool(
  category: ExerciseCategory,
  equipment: readonly ExerciseEquipment[],
  experience: ExperienceLevel
): Exercise[] {
  const available = EXERCISES.filter(
    (exercise) =>
      exercise.category === category &&
      isExerciseAvailable(exercise, equipment) &&
      isDefaultCandidate(exercise, experience)
  );
  const collapsed = collapseProgressionGroups(available, experience);
  if (collapsed.length > 0) {
    return collapsed;
  }

  const noneInCategory = EXERCISES.filter(
    (exercise) =>
      exercise.category === category &&
      isExerciseAvailable(exercise, ['none']) &&
      isDefaultCandidate(exercise, experience)
  );
  const collapsedNone = collapseProgressionGroups(noneInCategory, experience);
  if (collapsedNone.length > 0) {
    return collapsedNone;
  }

  return collapseProgressionGroups(
    EXERCISES.filter(
      (exercise) =>
        isExerciseAvailable(exercise, ['none']) && isDefaultCandidate(exercise, experience)
    ),
    experience
  );
}

function poolForCategory(
  category: ExerciseCategory,
  equipment: readonly ExerciseEquipment[],
  experience: ExperienceLevel
): Exercise[] {
  if (experience !== 'beginner') {
    return experiencePool(category, equipment, experience);
  }

  const available = beginnerPool(category, equipment);
  if (available.length > 0) {
    return available;
  }

  const noneInCategory = beginnerPool(category, ['none']);
  if (noneInCategory.length > 0) {
    return noneInCategory;
  }

  return noneEquipmentFallbacks();
}

function pickExercise(pool: Exercise[], seed: string, taken: Set<string>): Exercise {
  const available = pool.filter((exercise) => !taken.has(exercise.id));
  const choices = available.length > 0 ? available : pool;
  return choices[hashString(seed) % choices.length];
}

function toSessionExercise(exercise: Exercise): SessionExercise {
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

export function estimateWorkoutMinutes(exercises: SessionExercise[]): number {
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const workSeconds = exercises.reduce((sum, exercise) => {
    const perSet = exercise.kind === 'timed' ? (exercise.durationSec ?? 20) : 35;
    return sum + exercise.sets * perSet;
  }, 0);
  const restSeconds = Math.max(totalSets - 1, 0) * REST_SECONDS;
  return Math.min(25, Math.max(15, Math.round((workSeconds + restSeconds) / 60)));
}

function buildWorkout(
  date: Date,
  salt: number,
  equipment: readonly ExerciseEquipment[],
  experience: ExperienceLevel
): DailyWorkout {
  const key = dateKey(date);
  const taken = new Set<string>();
  const selected = SLOTS.map((category) => {
    const exercise = pickExercise(
      poolForCategory(category, equipment, experience),
      `${key}:${salt}:${category}`,
      taken
    );
    taken.add(exercise.id);
    return toSessionExercise(exercise);
  });

  return {
    id: `full-body-${key}-${salt}`,
    program: DEFAULT_WORKOUT_PROGRAM,
    title: deriveWorkoutTitle({ program: DEFAULT_WORKOUT_PROGRAM }),
    level: LEVEL_LABEL[experience],
    estimatedMinutes: estimateWorkoutMinutes(selected),
    exercises: selected,
    dateKey: key,
  };
}

function sameWorkout(a: DailyWorkout, b: DailyWorkout): boolean {
  return a.exercises.map((exercise) => exercise.id).join('|') === b.exercises.map((exercise) => exercise.id).join('|');
}

export function getWorkoutForDate(
  date: Date,
  userEquipment: readonly EquipmentOption[] = DEFAULT_EQUIPMENT,
  experience: ExperienceLevel = 'beginner'
): DailyWorkout {
  const equipment = ownedEquipment(userEquipment);
  let salt = 0;
  let workout = buildWorkout(date, salt, equipment, experience);
  const yesterday = buildWorkout(addDays(date, -1), 0, equipment, experience);

  while (sameWorkout(workout, yesterday) && salt < 12) {
    salt += 1;
    workout = buildWorkout(date, salt, equipment, experience);
  }

  return workout;
}

export function getTodaysWorkout(
  now = new Date(),
  userEquipment: readonly EquipmentOption[] = DEFAULT_EQUIPMENT,
  experience: ExperienceLevel = 'beginner'
): DailyWorkout {
  return getWorkoutForDate(now, userEquipment, experience);
}
