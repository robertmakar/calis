import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'calis.workout-history.v1';

export type CompletedSet = {
  target: number;
  completed: number;
};

export type CompletedExercise = {
  id: string;
  name: string;
  kind?: 'reps' | 'timed';
  sets?: CompletedSet[];
};

export type CompletedWorkout = {
  date: string;
  exercises: CompletedExercise[];
  totalSets: number;
  duration: number;
};

function isCompletedSet(value: unknown): value is CompletedSet {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const set = value as CompletedSet;
  return typeof set.target === 'number' && typeof set.completed === 'number';
}

function normalizeExercise(value: unknown): CompletedExercise | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Partial<CompletedExercise>;
  if (typeof item.id !== 'string' || typeof item.name !== 'string') {
    return null;
  }

  const exercise: CompletedExercise = {
    id: item.id,
    name: item.name,
  };

  if (item.kind === 'reps' || item.kind === 'timed') {
    exercise.kind = item.kind;
  }

  if (Array.isArray(item.sets)) {
    const sets = item.sets.filter(isCompletedSet);
    if (sets.length > 0) {
      exercise.sets = sets;
    }
  }

  return exercise;
}

export function hasSetPerformance(
  exercise: CompletedExercise
): exercise is CompletedExercise & { sets: CompletedSet[] } {
  return Array.isArray(exercise.sets) && exercise.sets.length > 0;
}

let pendingWorkoutPerformance: CompletedExercise[] | null = null;

export function setPendingWorkoutPerformance(exercises: CompletedExercise[]) {
  pendingWorkoutPerformance = exercises;
}

export function getPendingWorkoutPerformance(): CompletedExercise[] | null {
  return pendingWorkoutPerformance;
}

export function clearPendingWorkoutPerformance() {
  pendingWorkoutPerformance = null;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dateFromLocalKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function shiftDateKey(key: string, amount: number): string {
  const date = dateFromLocalKey(key);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

export async function getWorkoutHistory(): Promise<CompletedWorkout[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as CompletedWorkout[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry.date !== 'string') {
        return [];
      }

      const exercises = Array.isArray(entry.exercises)
        ? entry.exercises.flatMap((exercise) => {
            const normalized = normalizeExercise(exercise);
            return normalized ? [normalized] : [];
          })
        : [];

      return [
        {
          date: entry.date,
          exercises,
          totalSets: typeof entry.totalSets === 'number' ? entry.totalSets : 0,
          duration: typeof entry.duration === 'number' ? entry.duration : 0,
        },
      ];
    });
  } catch {
    return [];
  }
}

let writeChain: Promise<unknown> = Promise.resolve();

export async function resetWorkoutProgress(): Promise<CompletedWorkout[]> {
  const run = async () => {
    pendingWorkoutPerformance = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
    return [];
  };

  const pending = writeChain.then(run, run);
  writeChain = pending.then(
    () => undefined,
    () => undefined
  );
  return pending;
}

export async function saveCompletedWorkout(
  workout: Omit<CompletedWorkout, 'date'> & { date?: string }
): Promise<CompletedWorkout[]> {
  const run = async () => {
    const date = workout.date ?? localDateKey();
    const history = await getWorkoutHistory();

    if (history.some((entry) => entry.date === date)) {
      return history;
    }

    const next = [
      ...history,
      {
        date,
        exercises: workout.exercises,
        totalSets: workout.totalSets,
        duration: workout.duration,
      },
    ].sort((a, b) => a.date.localeCompare(b.date));

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  };

  const pending = writeChain.then(run, run);
  writeChain = pending.then(
    () => undefined,
    () => undefined
  );
  return pending;
}

export async function getCompletedWorkoutCount(): Promise<number> {
  const today = localDateKey();
  const history = await getWorkoutHistory();
  return history.filter((entry) => entry.date <= today).length;
}

export function computeCurrentStreak(dates: string[], now = new Date()): number {
  const today = localDateKey(now);
  const yesterday = shiftDateKey(today, -1);
  const completed = new Set(dates.filter((date) => date <= today));

  let cursor: string | null = null;
  if (completed.has(today)) {
    cursor = today;
  } else if (completed.has(yesterday)) {
    cursor = yesterday;
  }

  if (!cursor) {
    return 0;
  }

  let streak = 0;
  while (cursor && completed.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
}

export async function getCurrentStreak(now = new Date()): Promise<number> {
  const history = await getWorkoutHistory();
  return computeCurrentStreak(
    history.map((entry) => entry.date),
    now
  );
}

export async function isWorkoutCompletedToday(now = new Date()): Promise<boolean> {
  const today = localDateKey(now);
  const history = await getWorkoutHistory();
  return history.some((entry) => entry.date === today);
}

export type WeekDayActivity = {
  label: string;
  date: string;
  completed: boolean;
  isToday: boolean;
};

function pastHistory(history: CompletedWorkout[], now = new Date()) {
  const today = localDateKey(now);
  return history.filter((entry) => entry.date <= today);
}

export function getWeekStartMonday(now = new Date()): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = start.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + offset);
  return start;
}

export function getThisWeekActivity(
  history: CompletedWorkout[],
  now = new Date()
): WeekDayActivity[] {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const monday = getWeekStartMonday(now);
  const today = localDateKey(now);
  const completed = new Set(pastHistory(history, now).map((entry) => entry.date));

  return labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = localDateKey(date);
    return {
      label,
      date: key,
      completed: completed.has(key),
      isToday: key === today,
    };
  });
}

export function getTotalTrainingSeconds(history: CompletedWorkout[], now = new Date()): number {
  return pastHistory(history, now).reduce((sum, entry) => {
    return sum + (typeof entry.duration === 'number' ? entry.duration : 0);
  }, 0);
}

export function getRecentWorkouts(
  history: CompletedWorkout[],
  limit = 5,
  now = new Date()
): CompletedWorkout[] {
  return [...pastHistory(history, now)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function formatTrainingTime(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatHistoryDate(dateKey: string, now = new Date()): string {
  const today = localDateKey(now);
  const yesterday = shiftDateKey(today, -1);

  if (dateKey === today) {
    return 'Today';
  }
  if (dateKey === yesterday) {
    return 'Yesterday';
  }

  return dateFromLocalKey(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export type StrengthProgressItem = {
  id: string;
  name: string;
  unit: 'REPS' | 'SEC';
  values: number[];
};

export function getStrengthProgress(
  history: CompletedWorkout[],
  now = new Date()
): StrengthProgressItem[] {
  const appearances = new Map<
    string,
    { name: string; unit: 'REPS' | 'SEC'; values: number[] }
  >();

  [...pastHistory(history, now)]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (!hasSetPerformance(exercise) || !exercise.kind) {
          return;
        }

        const value = exercise.sets[0]?.completed;
        if (typeof value !== 'number') {
          return;
        }

        const unit = exercise.kind === 'timed' ? 'SEC' : 'REPS';
        const current = appearances.get(exercise.id);
        if (current) {
          current.name = exercise.name;
          current.unit = unit;
          current.values.push(value);
          return;
        }

        appearances.set(exercise.id, {
          name: exercise.name,
          unit,
          values: [value],
        });
      });
    });

  return [...appearances.entries()]
    .flatMap(([id, item]) => {
      if (item.values.length < 2) {
        return [];
      }

      return [
        {
          id,
          name: item.name,
          unit: item.unit,
          values: item.values.slice(-3),
        },
      ];
    })
    .sort((a, b) => b.values[b.values.length - 1] - a.values[a.values.length - 1]);
}

export type ProgressSummary = {
  streak: number;
  workoutCount: number;
  trainingSeconds: number;
  week: WeekDayActivity[];
  recent: CompletedWorkout[];
  strength: StrengthProgressItem[];
};

export async function getProgressSummary(now = new Date()): Promise<ProgressSummary> {
  const history = await getWorkoutHistory();
  const past = pastHistory(history, now);

  return {
    streak: computeCurrentStreak(
      past.map((entry) => entry.date),
      now
    ),
    workoutCount: past.length,
    trainingSeconds: getTotalTrainingSeconds(past, now),
    week: getThisWeekActivity(past, now),
    recent: getRecentWorkouts(past, 5, now),
    strength: getStrengthProgress(past, now),
  };
}
