import { getExerciseById, isExerciseAvailable } from '@/constants/exercises';
import { formatExercisePrescription, libraryExerciseToSession } from '@/lib/personalized-workout';
import {
  collectExercisePerformances,
  evaluateExerciseProgression,
  type ExerciseProgressionResult,
} from '@/lib/progression';
import { type EquipmentOption } from '@/lib/user-preferences';
import { localDateKey, type CompletedWorkout } from '@/lib/workout-history';

const MAX_STRONGER = 3;
export const PROGRESS_READY_LABEL = 'READY TO PROGRESS';

function ownedEquipment(equipment: readonly EquipmentOption[]) {
  if (equipment.includes('none') || equipment.length === 0) {
    return ['none'] as const;
  }
  return equipment.filter((item): item is Exclude<EquipmentOption, 'none'> => item !== 'none');
}

export function hasLegitimateProgressionTarget(
  result: ExerciseProgressionResult,
  equipment: readonly EquipmentOption[] = ['none']
): boolean {
  if (result.status === 'increase-reps' && result.suggestedTarget != null) {
    return true;
  }
  if (result.status === 'ready-for-next-variation' && result.nextExerciseId) {
    const next = getExerciseById(result.nextExerciseId);
    return Boolean(next && isExerciseAvailable(next, ownedEquipment(equipment)));
  }
  return false;
}

export type StrengthInsight = {
  id: string;
  name: string;
  from: string;
  to: string;
  sortDate: string;
};

export type NextTargetInsight = {
  id: string;
  name: string;
  prescription: string;
};

function uniqueExerciseIds(history: CompletedWorkout[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const workout of [...history].sort((a, b) => b.date.localeCompare(a.date))) {
    for (const exercise of workout.exercises) {
      if (seen.has(exercise.id)) {
        continue;
      }
      seen.add(exercise.id);
      ids.push(exercise.id);
    }
  }
  return ids;
}

function latestSets(result: ExerciseProgressionResult): number {
  const recorded = result.recentPerformance[0]?.sets.length;
  if (recorded && recorded > 0) {
    return recorded;
  }
  return getExerciseById(result.exerciseId)?.defaultSets ?? 3;
}

function formatTarget(exerciseId: string, sets: number, target: number): string {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) {
    return `${sets} × ${target}`;
  }
  const session = libraryExerciseToSession(exercise);
  if (session.kind === 'timed') {
    return formatExercisePrescription({ ...session, sets, durationSec: target });
  }
  return formatExercisePrescription({ ...session, sets, reps: target });
}

function successfulTargets(exerciseId: string, history: CompletedWorkout[], now: Date): number[] {
  const targets: number[] = [];
  for (const session of [...collectExercisePerformances(exerciseId, history, now)].reverse()) {
    if (session.successful && !targets.includes(session.target)) {
      targets.push(session.target);
    }
  }
  return targets;
}

function lastTrained(exerciseId: string, history: CompletedWorkout[]): string {
  let latest = '';
  for (const workout of history) {
    if (workout.exercises.some((exercise) => exercise.id === exerciseId) && workout.date > latest) {
      latest = workout.date;
    }
  }
  return latest;
}

function firstTrained(exerciseId: string, history: CompletedWorkout[]): string {
  let earliest = '';
  for (const workout of history) {
    if (!workout.exercises.some((exercise) => exercise.id === exerciseId)) {
      continue;
    }
    if (!earliest || workout.date < earliest) {
      earliest = workout.date;
    }
  }
  return earliest;
}

function nextFromResult(
  result: ExerciseProgressionResult,
  equipment: readonly EquipmentOption[]
): NextTargetInsight | null {
  const sets = latestSets(result);

  if (result.status === 'increase-reps' && result.suggestedTarget != null) {
    return {
      id: result.exerciseId,
      name: result.exerciseName,
      prescription: formatTarget(result.exerciseId, sets, result.suggestedTarget),
    };
  }

  if (result.status === 'ready-for-next-variation' && result.nextExerciseId && result.nextExerciseName) {
    const next = getExerciseById(result.nextExerciseId);
    if (!next) {
      return null;
    }
    const owned = ownedEquipment(equipment);
    if (!isExerciseAvailable(next, owned)) {
      return null;
    }
    return {
      id: next.id,
      name: next.name,
      prescription: formatExercisePrescription(libraryExerciseToSession(next)),
    };
  }

  return null;
}

export function getProgressInsights(
  history: CompletedWorkout[],
  equipment: readonly EquipmentOption[] = ['none'],
  now = new Date()
): { stronger: StrengthInsight[]; nextTarget: NextTargetInsight | null } {
  const today = localDateKey(now);
  history = history.filter((workout) => workout.date <= today);
  const ids = uniqueExerciseIds(history);
  const stronger: StrengthInsight[] = [];
  const nextCandidates: { insight: NextTargetInsight; sortDate: string }[] = [];

  for (const id of ids) {
    const result = evaluateExerciseProgression(id, history, now);
    const sets = latestSets(result);
    const sortDate = lastTrained(id, history);
    const next = nextFromResult(result, equipment);

    if (next) {
      nextCandidates.push({ insight: next, sortDate });
    }

    if (result.status === 'increase-reps' && result.currentTarget != null && result.suggestedTarget != null) {
      stronger.push({
        id,
        name: result.exerciseName,
        from: formatTarget(id, sets, result.currentTarget),
        to: formatTarget(id, sets, result.suggestedTarget),
        sortDate,
      });
      continue;
    }

    if (result.status === 'ready-for-next-variation' && result.nextExerciseName) {
      stronger.push({
        id,
        name: result.exerciseName,
        from: result.exerciseName,
        to: result.nextExerciseName,
        sortDate,
      });
      continue;
    }

    const targets = successfulTargets(id, history, now);
    if (targets.length >= 2 && targets[targets.length - 1] > targets[0]) {
      stronger.push({
        id,
        name: result.exerciseName,
        from: formatTarget(id, sets, targets[0]),
        to: formatTarget(id, sets, targets[targets.length - 1]),
        sortDate,
      });
    }
  }

  for (const id of ids) {
    if (stronger.some((item) => item.id === id)) {
      continue;
    }
    const current = getExerciseById(id);
    const easierId = current?.easierVariationId;
    if (!current || !easierId) {
      continue;
    }
    const easier = getExerciseById(easierId);
    if (!easier) {
      continue;
    }
    const easierDate = lastTrained(easierId, history);
    const currentDate = firstTrained(id, history);
    if (!easierDate || !currentDate || currentDate < easierDate) {
      continue;
    }
    stronger.push({
      id,
      name: easier.name,
      from: easier.name,
      to: current.name,
      sortDate: lastTrained(id, history),
    });
  }

  stronger.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
  nextCandidates.sort((a, b) => b.sortDate.localeCompare(a.sortDate));

  return {
    stronger: stronger.slice(0, MAX_STRONGER),
    nextTarget: nextCandidates[0]?.insight ?? null,
  };
}
