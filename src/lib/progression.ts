import {
  getExerciseById,
  getNextAvailableVariation,
  type Exercise,
  type ExerciseEquipment,
} from '@/constants/exercises';
import {
  getWorkoutHistory,
  hasSetPerformance,
  localDateKey,
  type CompletedExercise,
  type CompletedSet,
  type CompletedWorkout,
} from '@/lib/workout-history';
import { isProgressionStepAllowed } from '@/constants/workouts';
import { getUserPreferences, type ExperienceLevel } from '@/lib/user-preferences';

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
  const config = exercise.progression;
  const isHold = exercise.type === 'hold';
  const step = config?.step != null && config.step >= 1 ? config.step : isHold ? HOLD_STEP : 1;
  const cap = Math.max(config?.ceiling ?? (isHold ? HOLD_CAP : REP_CAP), start);

  const ladder: number[] = [];
  for (let value = start; value <= cap; value += step) {
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

const EXPERIENCE_RANK: Record<ExperienceLevel, number> = {
  beginner: 0,
  'some-experience': 1,
  experienced: 2,
};

/** Whether this experience meets an exercise's optional `minProgressionExperience`. */
function meetsMinProgressionExperience(exercise: Exercise, experience: ExperienceLevel): boolean {
  const minimum = exercise.minProgressionExperience;
  return minimum == null || EXPERIENCE_RANK[experience] >= EXPERIENCE_RANK[minimum];
}

export type EvaluateProgressionOptions = {
  /**
   * When provided, the next variation is the nearest harder one the user can perform
   * (unavailable steps are skipped). When omitted, harderVariationId is followed directly.
   */
  equipment?: readonly ExerciseEquipment[];
  /**
   * When provided, the next variation must be a progression step this experience can earn
   * (`isProgressionStepAllowed`); otherwise the result is at-max.
   */
  experience?: ExperienceLevel;
};

export function evaluateExerciseProgression(
  exerciseId: string,
  history: CompletedWorkout[],
  now = new Date(),
  options: EvaluateProgressionOptions = {}
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
  const experience = options.experience;
  const isWithinExperience = experience
    ? (candidate: Exercise) =>
        isProgressionStepAllowed(exercise.difficulty, candidate.difficulty, experience) &&
        meetsMinProgressionExperience(candidate, experience)
    : undefined;
  const directVariation = exercise.harderVariationId
    ? getExerciseById(exercise.harderVariationId)
    : undefined;
  const nextVariation = options.equipment
    ? getNextAvailableVariation(exercise, options.equipment, isWithinExperience)
    : directVariation && (!isWithinExperience || isWithinExperience(directVariation))
      ? directVariation
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
  const [history, preferences] = await Promise.all([getWorkoutHistory(), getUserPreferences()]);
  return evaluateExerciseProgression(exerciseId, history, new Date(), {
    equipment: preferences.equipment,
    experience: preferences.experienceLevel,
  });
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

  const atTop = (exerciseId: string, name: string, target: number) => [
    workout('2026-09-11', { id: exerciseId, name, kind: 'reps', sets: sets(target, [target, target, target]) }),
    workout('2026-09-12', { id: exerciseId, name, kind: 'reps', sets: sets(target, [target, target, target]) }),
  ];
  const wall = 'wall-push-ups';
  const wallAtMax = [
    workout('2026-09-11', { id: wall, name: 'Wall Push-ups', kind: 'reps', sets: sets(12, [12, 12, 12]) }),
    workout('2026-09-12', { id: wall, name: 'Wall Push-ups', kind: 'reps', sets: sets(12, [12, 12, 12]) }),
  ];
  const assistedRow = 'assisted-australian-rows';
  const assistedRowAtMax = [
    workout('2026-09-11', {
      id: assistedRow,
      name: 'Assisted Australian Rows',
      kind: 'reps',
      sets: sets(12, [12, 12, 12]),
    }),
    workout('2026-09-12', {
      id: assistedRow,
      name: 'Assisted Australian Rows',
      kind: 'reps',
      sets: sets(12, [12, 12, 12]),
    }),
  ];

  const equipmentCases: {
    name: string;
    expected: ProgressionStatus;
    history: CompletedWorkout[];
    exerciseId: string;
    equipment?: readonly ExerciseEquipment[];
    experience?: ExperienceLevel;
    expectedNextId: string | null;
  }[] = [
    {
      name: 'H. No equipment skips chair-only incline (wall → knee)',
      expected: 'ready-for-next-variation',
      history: wallAtMax,
      exerciseId: wall,
      equipment: ['none'],
      expectedNextId: 'knee-push-ups',
    },
    {
      name: 'I. Chair keeps incline in the chain (wall → incline)',
      expected: 'ready-for-next-variation',
      history: wallAtMax,
      exerciseId: wall,
      equipment: ['chair'],
      expectedNextId: 'incline-push-ups',
    },
    {
      name: 'J. Without equipment option, harderVariationId is followed directly',
      expected: 'ready-for-next-variation',
      history: wallAtMax,
      exerciseId: wall,
      expectedNextId: 'incline-push-ups',
    },
    {
      name: 'K. Push-ups at maximum now progress to diamond (no equipment)',
      expected: 'ready-for-next-variation',
      history: atTop('push-ups', 'Push-ups', 12),
      exerciseId: 'push-ups',
      equipment: ['none'],
      expectedNextId: 'diamond-push-ups',
    },
    {
      name: 'L. No reachable harder variation is treated as at maximum',
      expected: 'at-max',
      history: assistedRowAtMax,
      exerciseId: assistedRow,
      equipment: ['none'],
      expectedNextId: null,
    },
    {
      name: 'M. Push-ups at maximum progress to diamond (chair)',
      expected: 'ready-for-next-variation',
      history: atTop('push-ups', 'Push-ups', 12),
      exerciseId: 'push-ups',
      equipment: ['chair'],
      expectedNextId: 'diamond-push-ups',
    },
    {
      name: 'N. Diamond with no equipment skips chair-only decline (→ archer)',
      expected: 'ready-for-next-variation',
      history: atTop('diamond-push-ups', 'Diamond Push-ups', 10),
      exerciseId: 'diamond-push-ups',
      equipment: ['none'],
      expectedNextId: 'archer-push-ups',
    },
    {
      name: 'O. Diamond with a chair progresses to decline',
      expected: 'ready-for-next-variation',
      history: atTop('diamond-push-ups', 'Diamond Push-ups', 10),
      exerciseId: 'diamond-push-ups',
      equipment: ['chair'],
      expectedNextId: 'decline-push-ups',
    },
    {
      name: 'P. Decline without a chair still progresses to archer',
      expected: 'ready-for-next-variation',
      history: atTop('decline-push-ups', 'Decline Push-ups', 10),
      exerciseId: 'decline-push-ups',
      equipment: ['none'],
      expectedNextId: 'archer-push-ups',
    },
    {
      name: 'Q. Archer at its ceiling is at maximum',
      expected: 'at-max',
      history: atTop('archer-push-ups', 'Archer Push-ups', 8),
      exerciseId: 'archer-push-ups',
      equipment: ['gym'],
      expectedNextId: null,
    },
    {
      name: 'R. Diamond below its ceiling of 10 increases reps',
      expected: 'increase-reps',
      history: atTop('diamond-push-ups', 'Diamond Push-ups', 9),
      exerciseId: 'diamond-push-ups',
      equipment: ['none'],
      expectedNextId: null,
    },
    {
      name: 'S. Some experience, no equipment: push-ups → diamond',
      expected: 'ready-for-next-variation',
      history: atTop('push-ups', 'Push-ups', 12),
      exerciseId: 'push-ups',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: 'diamond-push-ups',
    },
    {
      name: 'T. Some experience, no equipment: diamond is the top (archer is advanced)',
      expected: 'at-max',
      history: atTop('diamond-push-ups', 'Diamond Push-ups', 10),
      exerciseId: 'diamond-push-ups',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'U. Some experience, chair: diamond → decline',
      expected: 'ready-for-next-variation',
      history: atTop('diamond-push-ups', 'Diamond Push-ups', 10),
      exerciseId: 'diamond-push-ups',
      equipment: ['chair'],
      experience: 'some-experience',
      expectedNextId: 'decline-push-ups',
    },
    {
      name: 'V. Some experience, chair: decline is the top (archer is advanced)',
      expected: 'at-max',
      history: atTop('decline-push-ups', 'Decline Push-ups', 10),
      exerciseId: 'decline-push-ups',
      equipment: ['chair'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'W. Experienced, no equipment: diamond → archer',
      expected: 'ready-for-next-variation',
      history: atTop('diamond-push-ups', 'Diamond Push-ups', 10),
      exerciseId: 'diamond-push-ups',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: 'archer-push-ups',
    },
    {
      name: 'X. Experienced, chair: decline → archer',
      expected: 'ready-for-next-variation',
      history: atTop('decline-push-ups', 'Decline Push-ups', 10),
      exerciseId: 'decline-push-ups',
      equipment: ['chair'],
      experience: 'experienced',
      expectedNextId: 'archer-push-ups',
    },
    {
      name: 'Y. Beginner cannot progress from push-ups into diamond',
      expected: 'at-max',
      history: atTop('push-ups', 'Push-ups', 12),
      exerciseId: 'push-ups',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: null,
    },
    {
      name: 'Z. Beginner earns the step from knee push-ups into push-ups',
      expected: 'ready-for-next-variation',
      history: atTop('knee-push-ups', 'Knee Push-ups', 12),
      exerciseId: 'knee-push-ups',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: 'push-ups',
    },
    {
      name: 'AA. Beginner earns the step from glute bridges into single-leg bridges',
      expected: 'ready-for-next-variation',
      history: atTop('glute-bridges', 'Glute Bridges', 12),
      exerciseId: 'glute-bridges',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: 'single-leg-glute-bridges',
    },
    {
      name: 'AB. Beginner never reaches archer (from decline)',
      expected: 'at-max',
      history: atTop('decline-push-ups', 'Decline Push-ups', 10),
      exerciseId: 'decline-push-ups',
      equipment: ['gym'],
      experience: 'beginner',
      expectedNextId: null,
    },
    {
      name: 'AC. Some experience never reaches archer (from decline)',
      expected: 'at-max',
      history: atTop('decline-push-ups', 'Decline Push-ups', 10),
      exerciseId: 'decline-push-ups',
      equipment: ['gym'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'AD. Beginner: knee plank → plank',
      expected: 'ready-for-next-variation',
      history: atTop('knee-plank', 'Knee Plank', 40),
      exerciseId: 'knee-plank',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: 'plank',
    },
    {
      name: 'AE. Beginner earns the step from plank into shoulder taps',
      expected: 'ready-for-next-variation',
      history: atTop('plank', 'Plank', 40),
      exerciseId: 'plank',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: 'shoulder-taps',
    },
    {
      name: 'AF. Some experience: plank → shoulder taps',
      expected: 'ready-for-next-variation',
      history: atTop('plank', 'Plank', 40),
      exerciseId: 'plank',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: 'shoulder-taps',
    },
    {
      name: 'AG. Experienced: shoulder taps → long-lever plank',
      expected: 'ready-for-next-variation',
      history: atTop('shoulder-taps', 'Plank Shoulder Taps', 16),
      exerciseId: 'shoulder-taps',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: 'long-lever-plank',
    },
    {
      name: 'AH. Long-lever plank at its ceiling is at maximum',
      expected: 'at-max',
      history: atTop('long-lever-plank', 'Long-Lever Plank', 40),
      exerciseId: 'long-lever-plank',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'AI. Beginner: dead bug → extended dead bug',
      expected: 'ready-for-next-variation',
      history: atTop('dead-bug', 'Dead Bug', 12),
      exerciseId: 'dead-bug',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: 'extended-dead-bug',
    },
    {
      name: 'AJ. Some experience: extended dead bug → tuck hollow hold',
      expected: 'ready-for-next-variation',
      history: atTop('extended-dead-bug', 'Extended Dead Bug', 12),
      exerciseId: 'extended-dead-bug',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: 'tuck-hollow-hold',
    },
    {
      name: 'AK. Experienced: hollow hold → hollow rocks',
      expected: 'ready-for-next-variation',
      history: atTop('hollow-hold', 'Hollow Hold', 40),
      exerciseId: 'hollow-hold',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: 'hollow-rocks',
    },
    {
      name: 'AL. Hollow rocks at its ceiling is at maximum',
      expected: 'at-max',
      history: atTop('hollow-rocks', 'Hollow Rocks', 12),
      exerciseId: 'hollow-rocks',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'AM. Beginner: knee side plank → side plank',
      expected: 'ready-for-next-variation',
      history: atTop('knee-side-plank', 'Knee Side Plank', 30),
      exerciseId: 'knee-side-plank',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: 'side-plank',
    },
    {
      name: 'AN. Some experience: side plank → hip dips',
      expected: 'ready-for-next-variation',
      history: atTop('side-plank', 'Side Plank', 40),
      exerciseId: 'side-plank',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: 'side-plank-hip-dips',
    },
    {
      name: 'AO. Experienced: hip dips → star plank',
      expected: 'ready-for-next-variation',
      history: atTop('side-plank-hip-dips', 'Side Plank Hip Dips', 16),
      exerciseId: 'side-plank-hip-dips',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: 'star-plank',
    },
    {
      name: 'AP. Star plank at its ceiling is at maximum',
      expected: 'at-max',
      history: atTop('star-plank', 'Star Plank', 30),
      exerciseId: 'star-plank',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'AQ. Some experience: shoulder taps is the top (long-lever plank is advanced)',
      expected: 'at-max',
      history: atTop('shoulder-taps', 'Plank Shoulder Taps', 16),
      exerciseId: 'shoulder-taps',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'AR. Some experience: hollow hold is the top (hollow rocks is advanced)',
      expected: 'at-max',
      history: atTop('hollow-hold', 'Hollow Hold', 40),
      exerciseId: 'hollow-hold',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'AS. Some experience: hip dips is the top (star plank is advanced)',
      expected: 'at-max',
      history: atTop('side-plank-hip-dips', 'Side Plank Hip Dips', 16),
      exerciseId: 'side-plank-hip-dips',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'AT. Beginner: shoulder taps is the top (no second earned step)',
      expected: 'at-max',
      history: atTop('shoulder-taps', 'Plank Shoulder Taps', 16),
      exerciseId: 'shoulder-taps',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: null,
    },
    {
      name: 'AU. Box squats without a chair → bodyweight squats',
      expected: 'ready-for-next-variation',
      history: atTop('box-squats', 'Box Squats', 15),
      exerciseId: 'box-squats',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: 'bodyweight-squats',
    },
    {
      name: 'AV. Box squats with a chair → bodyweight squats',
      expected: 'ready-for-next-variation',
      history: atTop('box-squats', 'Box Squats', 15),
      exerciseId: 'box-squats',
      equipment: ['chair'],
      experience: 'beginner',
      expectedNextId: 'bodyweight-squats',
    },
    {
      name: 'AW. Beginner earns the step from bodyweight squats into assisted pistols',
      expected: 'ready-for-next-variation',
      history: atTop('bodyweight-squats', 'Bodyweight Squats', 12),
      exerciseId: 'bodyweight-squats',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: 'assisted-pistol-squats',
    },
    {
      name: 'AX. Experienced: assisted pistols → pistols',
      expected: 'ready-for-next-variation',
      history: atTop('assisted-pistol-squats', 'Assisted Pistol Squats', 10),
      exerciseId: 'assisted-pistol-squats',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: 'pistol-squats',
    },
    {
      name: 'AY. Some experience: assisted pistols are the top (pistols are advanced)',
      expected: 'at-max',
      history: atTop('assisted-pistol-squats', 'Assisted Pistol Squats', 10),
      exerciseId: 'assisted-pistol-squats',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'AZ. Pistols at their ceiling are at maximum',
      expected: 'at-max',
      history: atTop('pistol-squats', 'Pistol Squats', 8),
      exerciseId: 'pistol-squats',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'BA. Experienced, no chair: reverse lunges skip Bulgarian → shrimp',
      expected: 'ready-for-next-variation',
      history: atTop('reverse-lunges', 'Reverse Lunges', 12),
      exerciseId: 'reverse-lunges',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: 'shrimp-squats',
    },
    {
      name: 'BB. Some experience, chair: reverse lunges → Bulgarian split squats',
      expected: 'ready-for-next-variation',
      history: atTop('reverse-lunges', 'Reverse Lunges', 12),
      exerciseId: 'reverse-lunges',
      equipment: ['chair'],
      experience: 'some-experience',
      expectedNextId: 'bulgarian-split-squats',
    },
    {
      name: 'BC. Experienced, no chair: Bulgarian split squats → shrimp',
      expected: 'ready-for-next-variation',
      history: atTop('bulgarian-split-squats', 'Bulgarian Split Squats', 10),
      exerciseId: 'bulgarian-split-squats',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: 'shrimp-squats',
    },
    {
      name: 'BD. Experienced, chair: Bulgarian split squats → shrimp',
      expected: 'ready-for-next-variation',
      history: atTop('bulgarian-split-squats', 'Bulgarian Split Squats', 10),
      exerciseId: 'bulgarian-split-squats',
      equipment: ['chair'],
      experience: 'experienced',
      expectedNextId: 'shrimp-squats',
    },
    {
      name: 'BE. Some experience: Bulgarian split squats are the top (shrimp is advanced)',
      expected: 'at-max',
      history: atTop('bulgarian-split-squats', 'Bulgarian Split Squats', 10),
      exerciseId: 'bulgarian-split-squats',
      equipment: ['chair'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'BF. Beginner earns the step from calf raises into single-leg calf raises',
      expected: 'ready-for-next-variation',
      history: atTop('calf-raises', 'Calf Raises', 12),
      exerciseId: 'calf-raises',
      equipment: ['none'],
      experience: 'beginner',
      expectedNextId: 'single-leg-calf-raises',
    },
    {
      name: 'BG. Single-leg calf raises at their ceiling are at maximum',
      expected: 'at-max',
      history: atTop('single-leg-calf-raises', 'Single-Leg Calf Raises', 15),
      exerciseId: 'single-leg-calf-raises',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'BH. Beginner never reaches pistols (from assisted pistols)',
      expected: 'at-max',
      history: atTop('assisted-pistol-squats', 'Assisted Pistol Squats', 10),
      exerciseId: 'assisted-pistol-squats',
      equipment: ['gym'],
      experience: 'beginner',
      expectedNextId: null,
    },
    {
      name: 'BI. Some experience, no chair: reverse lunges are the top (Bulgarian needs a chair, shrimp is advanced)',
      expected: 'at-max',
      history: atTop('reverse-lunges', 'Reverse Lunges', 12),
      exerciseId: 'reverse-lunges',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'BJ. Beginner with a bar: assisted rows → Australian rows',
      expected: 'ready-for-next-variation',
      history: atTop('assisted-australian-rows', 'Assisted Australian Rows', 12),
      exerciseId: 'assisted-australian-rows',
      equipment: ['pull-up-bar'],
      experience: 'beginner',
      expectedNextId: 'australian-rows',
    },
    {
      name: 'BK. Some experience with a bar: Australian rows → feet-elevated rows',
      expected: 'ready-for-next-variation',
      history: atTop('australian-rows', 'Australian Rows', 12),
      exerciseId: 'australian-rows',
      equipment: ['pull-up-bar'],
      experience: 'some-experience',
      expectedNextId: 'feet-elevated-australian-rows',
    },
    {
      name: 'BL. Experienced with a bar: feet-elevated rows → archer rows',
      expected: 'ready-for-next-variation',
      history: atTop('feet-elevated-australian-rows', 'Feet-Elevated Australian Rows', 10),
      exerciseId: 'feet-elevated-australian-rows',
      equipment: ['pull-up-bar'],
      experience: 'experienced',
      expectedNextId: 'archer-australian-rows',
    },
    {
      name: 'BM. Beginner with a bar: Australian rows are the top (feet-elevated rows need some experience)',
      expected: 'at-max',
      history: atTop('australian-rows', 'Australian Rows', 12),
      exerciseId: 'australian-rows',
      equipment: ['pull-up-bar'],
      experience: 'beginner',
      expectedNextId: null,
    },
    {
      name: 'BN. Without an experience level, Australian rows still lead to feet-elevated rows',
      expected: 'ready-for-next-variation',
      history: atTop('australian-rows', 'Australian Rows', 12),
      exerciseId: 'australian-rows',
      equipment: ['pull-up-bar'],
      expectedNextId: 'feet-elevated-australian-rows',
    },
    {
      name: 'BO. Some experience with a bar: feet-elevated rows are the top (archer is advanced)',
      expected: 'at-max',
      history: atTop('feet-elevated-australian-rows', 'Feet-Elevated Australian Rows', 10),
      exerciseId: 'feet-elevated-australian-rows',
      equipment: ['pull-up-bar'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'BP. Archer rows at their ceiling are at maximum',
      expected: 'at-max',
      history: atTop('archer-australian-rows', 'Archer Australian Rows', 8),
      exerciseId: 'archer-australian-rows',
      equipment: ['pull-up-bar'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'BQ. No bar: assisted rows have no usable harder variation',
      expected: 'at-max',
      history: atTop('assisted-australian-rows', 'Assisted Australian Rows', 12),
      exerciseId: 'assisted-australian-rows',
      equipment: ['chair'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'BR. No bar: Australian rows have no usable harder variation',
      expected: 'at-max',
      history: atTop('australian-rows', 'Australian Rows', 12),
      exerciseId: 'australian-rows',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'BS. No bar: feet-elevated rows never offer archer rows',
      expected: 'at-max',
      history: atTop('feet-elevated-australian-rows', 'Feet-Elevated Australian Rows', 10),
      exerciseId: 'feet-elevated-australian-rows',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'BT. Beginner with a bar: dead hang → scapular pull-ups',
      expected: 'ready-for-next-variation',
      history: atTop('dead-hang', 'Dead Hang', 40),
      exerciseId: 'dead-hang',
      equipment: ['pull-up-bar'],
      experience: 'beginner',
      expectedNextId: 'scapular-pull-ups',
    },
    {
      name: 'BU. Beginner earns the step from scapular pull-ups into negative pull-ups',
      expected: 'ready-for-next-variation',
      history: atTop('scapular-pull-ups', 'Scapular Pull-ups', 12),
      exerciseId: 'scapular-pull-ups',
      equipment: ['pull-up-bar'],
      experience: 'beginner',
      expectedNextId: 'negative-pull-ups',
    },
    {
      name: 'BV. Beginner with a bar: negative pull-ups are the top',
      expected: 'at-max',
      history: atTop('negative-pull-ups', 'Negative Pull-ups', 6),
      exerciseId: 'negative-pull-ups',
      equipment: ['pull-up-bar'],
      experience: 'beginner',
      expectedNextId: null,
    },
    {
      name: 'BW. Some experience with a bar: negative pull-ups → chin-ups',
      expected: 'ready-for-next-variation',
      history: atTop('negative-pull-ups', 'Negative Pull-ups', 6),
      exerciseId: 'negative-pull-ups',
      equipment: ['pull-up-bar'],
      experience: 'some-experience',
      expectedNextId: 'chin-ups',
    },
    {
      name: 'BX. Some experience with a bar: chin-ups → pull-ups',
      expected: 'ready-for-next-variation',
      history: atTop('chin-ups', 'Chin-ups', 8),
      exerciseId: 'chin-ups',
      equipment: ['pull-up-bar'],
      experience: 'some-experience',
      expectedNextId: 'pull-ups',
    },
    {
      name: 'BY. Some experience with a bar: pull-ups are the top (archer is advanced)',
      expected: 'at-max',
      history: atTop('pull-ups', 'Pull-ups', 8),
      exerciseId: 'pull-ups',
      equipment: ['pull-up-bar'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'BZ. Experienced with a bar: pull-ups → archer pull-ups',
      expected: 'ready-for-next-variation',
      history: atTop('pull-ups', 'Pull-ups', 8),
      exerciseId: 'pull-ups',
      equipment: ['gym'],
      experience: 'experienced',
      expectedNextId: 'archer-pull-ups',
    },
    {
      name: 'CA. Archer pull-ups at their ceiling are at maximum',
      expected: 'at-max',
      history: atTop('archer-pull-ups', 'Archer Pull-ups', 5),
      exerciseId: 'archer-pull-ups',
      equipment: ['pull-up-bar'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'CB. No bar: dead hang has no usable harder variation',
      expected: 'at-max',
      history: atTop('dead-hang', 'Dead Hang', 40),
      exerciseId: 'dead-hang',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'CC. No bar: scapular pull-ups have no usable harder variation',
      expected: 'at-max',
      history: atTop('scapular-pull-ups', 'Scapular Pull-ups', 12),
      exerciseId: 'scapular-pull-ups',
      equipment: ['chair'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'CD. No bar: negative pull-ups have no usable harder variation',
      expected: 'at-max',
      history: atTop('negative-pull-ups', 'Negative Pull-ups', 6),
      exerciseId: 'negative-pull-ups',
      equipment: ['none'],
      experience: 'some-experience',
      expectedNextId: null,
    },
    {
      name: 'CE. No bar: chin-ups have no usable harder variation',
      expected: 'at-max',
      history: atTop('chin-ups', 'Chin-ups', 8),
      exerciseId: 'chin-ups',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'CF. No bar: pull-ups have no usable harder variation',
      expected: 'at-max',
      history: atTop('pull-ups', 'Pull-ups', 8),
      exerciseId: 'pull-ups',
      equipment: ['chair'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'CG. No bar: archer pull-ups stay at maximum',
      expected: 'at-max',
      history: atTop('archer-pull-ups', 'Archer Pull-ups', 5),
      exerciseId: 'archer-pull-ups',
      equipment: ['none'],
      experience: 'experienced',
      expectedNextId: null,
    },
    {
      name: 'CH. Dead hang below its 40 s ceiling increases the hold',
      expected: 'increase-reps',
      history: atTop('dead-hang', 'Dead Hang', 35),
      exerciseId: 'dead-hang',
      equipment: ['pull-up-bar'],
      experience: 'beginner',
      expectedNextId: null,
    },
  ];

  return [
    ...cases.map((test) => {
      const exerciseId = test.name.startsWith('G.') ? isolated : id;
      const result = evaluateExerciseProgression(exerciseId, test.history);
      const noInventedVariation = !test.name.startsWith('G.') || result.nextExerciseId == null;
      return {
        name: test.name,
        expected: test.expected,
        actual: result.status,
        pass: result.status === test.expected && noInventedVariation,
      };
    }),
    ...equipmentCases.map((test) => {
      const result = evaluateExerciseProgression(test.exerciseId, test.history, new Date(), {
        equipment: test.equipment,
        experience: test.experience,
      });
      return {
        name: test.name,
        expected: test.expected,
        actual: result.status,
        pass:
          result.status === test.expected &&
          (result.nextExerciseId ?? null) === test.expectedNextId,
      };
    }),
  ];
}
