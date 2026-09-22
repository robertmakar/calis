import { getExerciseById, type Exercise } from '@/constants/exercises';
import {
  getWorkoutHistory,
  hasSetPerformance,
  localDateKey,
  type CompletedExercise,
  type CompletedSet,
  type CompletedWorkout,
} from '@/lib/workout-history';

const RECENT_WINDOW = 3;
const SUCCESSFUL_WORKOUTS_REQUIRED = 2;
const REP_CAP = 12;
const HOLD_CAP = 40;
const HOLD_STEP = 5;

export type ProgressionStatus =
  | 'not-enough-data'
  | 'not-ready'
  | 'increase-reps'
  | 'ready-for-next-variation'
  | 'at-max';

export type RecentExercisePerformance = {
  date: string;
  target: number;
  sets: CompletedSet[];
  successful: boolean;
};

export type ExerciseProgressionResult = {
  exerciseId: string;
  exerciseName: string;
  kind: 'reps' | 'hold';
  progressionGroup?: Exercise['progressionGroup'];
  progressionLevel?: number;
  defaultTarget: number;
  maxTarget: number;
  currentTarget: number | null;
  recentPerformance: RecentExercisePerformance[];
  readyToIncreaseReps: boolean;
  readyForNextVariation: boolean;
  suggestedTarget?: number;
  nextExerciseId?: string;
  nextExerciseName?: string;
  status: ProgressionStatus;
  reason: string;
};

function sessionTarget(sets: CompletedSet[]): number {
  return sets[0]?.target ?? 0;
}

function isSuccessfulSession(sets: CompletedSet[]): boolean {
  return sets.length > 0 && sets.every((set) => set.completed >= set.target);
}

export function getProgressionLadder(exercise: Exercise): number[] {
  const start = exercise.defaultRepsOrDuration;

  if (exercise.type === 'hold') {
    const cap = Math.max(HOLD_CAP, start);
    const ladder: number[] = [];
    for (let value = start; value <= cap; value += HOLD_STEP) {
      ladder.push(value);
    }
    return ladder;
  }

  const cap = Math.max(REP_CAP, start);
  const ladder: number[] = [];
  for (let value = start; value <= cap; value += 1) {
    ladder.push(value);
  }
  return ladder;
}

function nextLadderTarget(ladder: number[], current: number): number | null {
  const next = ladder.find((value) => value > current);
  return next ?? null;
}

export function collectExercisePerformances(
  exerciseId: string,
  history: CompletedWorkout[],
  now = new Date()
): RecentExercisePerformance[] {
  const today = localDateKey(now);

  return history
    .filter((workout) => workout.date <= today)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((workout) => {
      const match = workout.exercises.find((item) => item.id === exerciseId);
      if (!match || !hasSetPerformance(match)) {
        return [];
      }

      return [
        {
          date: workout.date,
          target: sessionTarget(match.sets),
          sets: match.sets,
          successful: isSuccessfulSession(match.sets),
        },
      ];
    });
}

export function evaluateExerciseProgression(
  exerciseId: string,
  history: CompletedWorkout[],
  now = new Date()
): ExerciseProgressionResult {
  const exercise = getExerciseById(exerciseId);
  const recorded = collectExercisePerformances(exerciseId, history, now);
  const recentPerformance = recorded.slice(0, RECENT_WINDOW);

  if (!exercise) {
    return {
      exerciseId,
      exerciseName: exerciseId,
      kind: 'reps',
      defaultTarget: 0,
      maxTarget: 0,
      currentTarget: null,
      recentPerformance,
      readyToIncreaseReps: false,
      readyForNextVariation: false,
      status: 'not-enough-data',
      reason: 'Exercise not found in the library.',
    };
  }

  const ladder = getProgressionLadder(exercise);
  const maxTarget = ladder[ladder.length - 1] ?? exercise.defaultRepsOrDuration;
  const nextVariation = exercise.harderVariationId
    ? getExerciseById(exercise.harderVariationId)
    : undefined;

  const base: Omit<
    ExerciseProgressionResult,
    'readyToIncreaseReps' | 'readyForNextVariation' | 'status' | 'reason'
  > = {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    kind: exercise.type,
    progressionGroup: exercise.progressionGroup,
    progressionLevel: exercise.progressionLevel,
    defaultTarget: exercise.defaultRepsOrDuration,
    maxTarget,
    currentTarget: recentPerformance[0]?.target ?? null,
    recentPerformance,
  };

  const finish = (
    status: ProgressionStatus,
    reason: string,
    extras: Partial<ExerciseProgressionResult> = {}
  ): ExerciseProgressionResult => ({
    ...base,
    readyToIncreaseReps: status === 'increase-reps',
    readyForNextVariation: status === 'ready-for-next-variation',
    status,
    reason,
    ...extras,
  });

  if (recentPerformance.length < SUCCESSFUL_WORKOUTS_REQUIRED) {
    return finish(
      'not-enough-data',
      `Need ${SUCCESSFUL_WORKOUTS_REQUIRED} performance-recorded workouts; found ${recentPerformance.length}.`
    );
  }

  const latest = recentPerformance[0];
  if (!latest.successful) {
    return finish('not-ready', 'The most recent recorded workout did not hit every set target.');
  }

  const currentTarget = latest.target;
  const successesAtTarget = recentPerformance.filter(
    (session) => session.successful && session.target === currentTarget
  ).length;

  if (successesAtTarget < SUCCESSFUL_WORKOUTS_REQUIRED) {
    return finish(
      'not-ready',
      `Need ${SUCCESSFUL_WORKOUTS_REQUIRED} successful workouts at ${currentTarget}; found ${successesAtTarget}.`
    );
  }

  const suggestedTarget = nextLadderTarget(ladder, currentTarget);
  if (suggestedTarget != null) {
    return finish('increase-reps', `Consistently hit ${currentTarget}; next target is ${suggestedTarget}.`, {
      currentTarget,
      suggestedTarget,
    });
  }

  if (nextVariation) {
    return finish(
      'ready-for-next-variation',
      `Consistently hit the maximum target of ${maxTarget}.`,
      {
        currentTarget,
        nextExerciseId: nextVariation.id,
        nextExerciseName: nextVariation.name,
      }
    );
  }

  return finish(
    'at-max',
    `Consistently hit the maximum target of ${maxTarget}, and no harder variation exists.`,
    { currentTarget }
  );
}

export async function getExerciseProgressionStatus(
  exerciseId: string
): Promise<ExerciseProgressionResult> {
  const history = await getWorkoutHistory();
  return evaluateExerciseProgression(exerciseId, history);
}

export function formatPerformanceLine(session: RecentExercisePerformance): string {
  const mark = session.successful ? '✓' : '✗';
  return `${session.sets.length} × ${session.target} ${mark}`;
}

export function formatProgressionStatus(result: ExerciseProgressionResult): string {
  switch (result.status) {
    case 'not-enough-data':
      return 'NOT ENOUGH DATA';
    case 'not-ready':
      return 'NOT READY';
    case 'increase-reps':
      return result.kind === 'hold' ? 'READY FOR TIME INCREASE' : 'READY FOR REP INCREASE';
    case 'ready-for-next-variation':
      return 'READY FOR NEXT VARIATION';
    case 'at-max':
      return 'AT MAXIMUM';
  }
}

function workout(
  date: string,
  exercise: CompletedExercise,
  extras: Partial<CompletedWorkout> = {}
): CompletedWorkout {
  return {
    date,
    exercises: [exercise],
    totalSets: exercise.sets?.length ?? 0,
    duration: 0,
    ...extras,
  };
}

function sets(target: number, completed: number[]): CompletedSet[] {
  return completed.map((value) => ({ target, completed: value }));
}

export function runProgressionEvaluatorFixtures(): {
  name: string;
  pass: boolean;
  expected: ProgressionStatus;
  actual: ProgressionStatus;
}[] {
  const id = 'incline-push-ups';
  const isolated = 'reverse-lunges';

  const cases: { name: string; expected: ProgressionStatus; history: CompletedWorkout[] }[] = [
    {
      name: 'A. No history',
      expected: 'not-enough-data',
      history: [],
    },
    {
      name: 'B. One successful workout',
      expected: 'not-enough-data',
      history: [workout('2026-09-12', { id, name: 'Incline Push-ups', kind: 'reps', sets: sets(8, [8, 8, 8]) })],
    },
    {
      name: 'C. Two successful workouts at 8',
      expected: 'increase-reps',
      history: [
        workout('2026-09-11', { id, name: 'Incline Push-ups', kind: 'reps', sets: sets(8, [8, 8, 8]) }),
        workout('2026-09-12', { id, name: 'Incline Push-ups', kind: 'reps', sets: sets(8, [8, 8, 8]) }),
      ],
    },
    {
      name: 'D. One successful + one failed workout',
      expected: 'not-ready',
      history: [
        workout('2026-09-11', { id, name: 'Incline Push-ups', kind: 'reps', sets: sets(8, [8, 8, 8]) }),
        workout('2026-09-12', { id, name: 'Incline Push-ups', kind: 'reps', sets: sets(8, [8, 8, 7]) }),
      ],
    },
    {
      name: 'E. Two successful workouts at maximum target',
      expected: 'ready-for-next-variation',
      history: [
        workout('2026-09-11', { id, name: 'Incline Push-ups', kind: 'reps', sets: sets(12, [12, 12, 12]) }),
        workout('2026-09-12', { id, name: 'Incline Push-ups', kind: 'reps', sets: sets(12, [12, 12, 12]) }),
      ],
    },
    {
      name: 'F. Old history without performance is ignored',
      expected: 'increase-reps',
      history: [
        workout('2026-09-10', { id, name: 'Incline Push-ups' }),
        workout('2026-09-11', { id, name: 'Incline Push-ups', kind: 'reps', sets: sets(8, [8, 8, 8]) }),
        workout('2026-09-12', { id, name: 'Incline Push-ups', kind: 'reps', sets: sets(8, [8, 8, 8]) }),
      ],
    },
    {
      name: 'G. No progression relationship can still increase reps',
      expected: 'increase-reps',
      history: [
        workout('2026-09-11', {
          id: isolated,
          name: 'Reverse Lunges',
          kind: 'reps',
          sets: sets(8, [8, 8, 8]),
        }),
        workout('2026-09-12', {
          id: isolated,
          name: 'Reverse Lunges',
          kind: 'reps',
          sets: sets(8, [8, 8, 8]),
        }),
      ],
    },
  ];

  return cases.map((test) => {
    const exerciseId = test.name.startsWith('G.') ? isolated : id;
    const result = evaluateExerciseProgression(exerciseId, test.history);
    const noInventedVariation = !test.name.startsWith('G.') || result.nextExerciseId == null;
    return {
      name: test.name,
      expected: test.expected,
      actual: result.status,
      pass: result.status === test.expected && noInventedVariation,
    };
  });
}
