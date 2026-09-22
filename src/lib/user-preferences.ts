import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'calis.user-preferences.v1';

export type ExperienceLevel = 'beginner' | 'some-experience' | 'experienced';
export type EquipmentOption = 'none' | 'chair' | 'pull-up-bar' | 'gym';
export type Goal = 'strength' | 'muscle' | 'calisthenics' | 'consistency';

export type UserPreferences = {
  experienceLevel: ExperienceLevel;
  equipment: EquipmentOption[];
  goal: Goal;
  onboardingCompleted: boolean;
};

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['beginner', 'some-experience', 'experienced'];
const EQUIPMENT_OPTIONS: EquipmentOption[] = ['none', 'chair', 'pull-up-bar', 'gym'];
const GOALS: Goal[] = ['strength', 'muscle', 'calisthenics', 'consistency'];

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  experienceLevel: 'beginner',
  equipment: ['none'],
  goal: 'strength',
  onboardingCompleted: false,
};

function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return typeof value === 'string' && EXPERIENCE_LEVELS.includes(value as ExperienceLevel);
}

function isEquipmentOption(value: unknown): value is EquipmentOption {
  return typeof value === 'string' && EQUIPMENT_OPTIONS.includes(value as EquipmentOption);
}

function isGoal(value: unknown): value is Goal {
  return typeof value === 'string' && GOALS.includes(value as Goal);
}

function normalizeEquipment(value: unknown): EquipmentOption[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_USER_PREFERENCES.equipment];
  }

  const selected = value.filter(isEquipmentOption);
  if (selected.includes('none') || selected.length === 0) {
    return ['none'];
  }

  return EQUIPMENT_OPTIONS.filter((option) => option !== 'none' && selected.includes(option));
}

function normalizePreferences(value: unknown): UserPreferences {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_USER_PREFERENCES };
  }

  const raw = value as Partial<UserPreferences>;
  return {
    experienceLevel: isExperienceLevel(raw.experienceLevel)
      ? raw.experienceLevel
      : DEFAULT_USER_PREFERENCES.experienceLevel,
    equipment: normalizeEquipment(raw.equipment),
    goal: isGoal(raw.goal) ? raw.goal : DEFAULT_USER_PREFERENCES.goal,
    onboardingCompleted: raw.onboardingCompleted === true,
  };
}

let writeChain: Promise<unknown> = Promise.resolve();

export async function getUserPreferences(): Promise<UserPreferences> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...DEFAULT_USER_PREFERENCES };
  }

  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export async function saveUserPreferences(
  preferences: UserPreferences
): Promise<UserPreferences> {
  const next = normalizePreferences(preferences);
  const run = async () => {
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

export async function isOnboardingComplete(): Promise<boolean> {
  const preferences = await getUserPreferences();
  return preferences.onboardingCompleted === true;
}

export async function completeOnboarding(
  preferences: Omit<UserPreferences, 'onboardingCompleted'>
): Promise<UserPreferences> {
  return saveUserPreferences({
    ...preferences,
    onboardingCompleted: true,
  });
}

export async function resetOnboarding(): Promise<UserPreferences> {
  const current = await getUserPreferences();
  return saveUserPreferences({
    ...current,
    onboardingCompleted: false,
  });
}

export function toggleEquipmentSelection(
  current: EquipmentOption[],
  option: EquipmentOption
): EquipmentOption[] {
  if (option === 'none') {
    return ['none'];
  }

  const withoutNone = current.filter((item) => item !== 'none');
  if (withoutNone.includes(option)) {
    const next = withoutNone.filter((item) => item !== option);
    return next.length > 0 ? next : ['none'];
  }

  return [...withoutNone, option];
}
