import AsyncStorage from '@react-native-async-storage/async-storage';

import { getExerciseById } from '@/constants/exercises';

const STORAGE_KEY = 'calis.progression-preferences.v1';

export type ProgressionPreferences = Record<string, string>;

let writeChain: Promise<unknown> = Promise.resolve();

function isValidExerciseId(id: string) {
  return Boolean(getExerciseById(id));
}

export async function getProgressionPreferences(): Promise<ProgressionPreferences> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const preferences: ProgressionPreferences = {};
    for (const [fromId, toId] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof toId === 'string' && isValidExerciseId(fromId) && isValidExerciseId(toId)) {
        preferences[fromId] = toId;
      }
    }
    return preferences;
  } catch {
    return {};
  }
}

async function writePreferences(preferences: ProgressionPreferences) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  return preferences;
}

export async function getPreferredExercise(exerciseId: string): Promise<string | null> {
  const preferences = await getProgressionPreferences();
  return preferences[exerciseId] ?? null;
}

export async function setPreferredExercise(exerciseId: string, preferredExerciseId: string) {
  if (!isValidExerciseId(exerciseId) || !isValidExerciseId(preferredExerciseId)) {
    return getProgressionPreferences();
  }

  const run = async () => {
    const preferences = await getProgressionPreferences();
    preferences[exerciseId] = preferredExerciseId;
    return writePreferences(preferences);
  };

  const pending = writeChain.then(run, run);
  writeChain = pending.then(
    () => undefined,
    () => undefined
  );
  return pending;
}

export async function resetProgressionPreferences(): Promise<ProgressionPreferences> {
  const run = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return {};
  };

  const pending = writeChain.then(run, run);
  writeChain = pending.then(
    () => undefined,
    () => undefined
  );
  return pending;
}

export async function clearPreferredExercise(exerciseId: string) {
  const run = async () => {
    const preferences = await getProgressionPreferences();
    delete preferences[exerciseId];
    return writePreferences(preferences);
  };

  const pending = writeChain.then(run, run);
  writeChain = pending.then(
    () => undefined,
    () => undefined
  );
  return pending;
}

export function resolvePreferredExerciseId(
  exerciseId: string,
  preferences: ProgressionPreferences
): string {
  const seen = new Set<string>();
  let current = exerciseId;

  while (preferences[current] && !seen.has(current)) {
    seen.add(current);
    const next = preferences[current];
    if (next === current || !isValidExerciseId(next)) {
      break;
    }
    current = next;
  }

  return current;
}
