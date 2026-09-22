import {
  EXERCISES,
  getExerciseById,
  getRelatedExercises,
  isExerciseAvailable,
  type Exercise,
  type ExerciseEquipment,
} from '@/constants/exercises';
import { type DailyWorkout, type SessionExercise } from '@/constants/workouts';
import {
  applyProgressionToExercise,
  libraryExerciseToSession,
} from '@/lib/personalized-workout';
import { evaluateExerciseProgression } from '@/lib/progression';
import { type EquipmentOption, type ExperienceLevel } from '@/lib/user-preferences';
import { type CompletedWorkout } from '@/lib/workout-history';

const MAX_ALTERNATIVES = 4;

export type ExerciseAlternative = {
  exercise: Exercise;
  session: SessionExercise;
};

function ownedEquipment(userEquipment: readonly EquipmentOption[]): ExerciseEquipment[] {
  if (!userEquipment.length || userEquipment.includes('none')) {
    return ['none'];
  }
  return userEquipment.filter((item): item is ExerciseEquipment => item !== 'none');
}

function sharesMovementIntent(current: Exercise, candidate: Exercise) {
  if (candidate.category !== current.category || candidate.type !== current.type) {
    return false;
  }
  const muscles = new Set(current.primaryMuscles);
  return candidate.primaryMuscles.some((muscle) => muscles.has(muscle));
}

function isExperienceAppropriate(
  candidate: Exercise,
  current: Exercise,
  experience: ExperienceLevel
) {
  if (experience === 'experienced') {
    return true;
  }
  if (experience === 'beginner' && candidate.difficulty === 'intermediate') {
    return false;
  }
  if (current.progressionLevel == null || candidate.progressionLevel == null) {
    return true;
  }
  const step = candidate.progressionLevel - current.progressionLevel;
  if (experience === 'beginner') {
    return step <= 1;
  }
  return step <= 1;
}

function prescribedSession(exercise: Exercise, history: CompletedWorkout[], now: Date): SessionExercise {
  return applyProgressionToExercise(
    libraryExerciseToSession(exercise),
    evaluateExerciseProgression(exercise.id, history, now)
  );
}

function rank(current: Exercise, left: Exercise, right: Exercise) {
  const currentLevel = current.progressionLevel ?? 0;
  const leftDelta = (left.progressionLevel ?? currentLevel) - currentLevel;
  const rightDelta = (right.progressionLevel ?? currentLevel) - currentLevel;
  const leftEasier = leftDelta < 0;
  const rightEasier = rightDelta < 0;
  if (leftEasier !== rightEasier) {
    return leftEasier ? -1 : 1;
  }
  const distance = Math.abs(leftDelta) - Math.abs(rightDelta);
  if (distance !== 0) {
    return distance;
  }
  return left.name.localeCompare(right.name);
}

function usable(
  candidate: Exercise,
  current: Exercise,
  owned: ExerciseEquipment[],
  experience: ExperienceLevel,
  taken: Set<string>
) {
  if (candidate.id === current.id || taken.has(candidate.id)) {
    return false;
  }
  if (!isExerciseAvailable(candidate, owned)) {
    return false;
  }
  return isExperienceAppropriate(candidate, current, experience);
}

export function getExerciseAlternatives({
  currentId,
  workout,
  equipment,
  experience,
  history,
  now = new Date(),
}: {
  currentId: string;
  workout: DailyWorkout;
  equipment: readonly EquipmentOption[];
  experience: ExperienceLevel;
  history: CompletedWorkout[];
  now?: Date;
}): ExerciseAlternative[] {
  const current = getExerciseById(currentId);
  if (!current) {
    return [];
  }

  const owned = ownedEquipment(equipment);
  const taken = new Set(
    workout.exercises.filter((exercise) => exercise.id !== currentId).map((exercise) => exercise.id)
  );

  const related = getRelatedExercises(current).filter((candidate) =>
    usable(candidate, current, owned, experience, taken)
  );

  const pool =
    related.length > 0
      ? related
      : EXERCISES.filter(
          (candidate) =>
            sharesMovementIntent(current, candidate) &&
            usable(candidate, current, owned, experience, taken)
        );

  return [...pool]
    .sort((left, right) => rank(current, left, right))
    .slice(0, MAX_ALTERNATIVES)
    .map((exercise) => ({
      exercise,
      session: prescribedSession(exercise, history, now),
    }));
}
