import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncNativeAppearancePreference } from 'calis-native';

const STORAGE_KEY = 'calis.appearance.v1';

export type AppearancePreference = 'system' | 'light' | 'dark';

const OPTIONS: AppearancePreference[] = ['system', 'light', 'dark'];

export const DEFAULT_APPEARANCE: AppearancePreference = 'system';

function isAppearancePreference(value: unknown): value is AppearancePreference {
  return typeof value === 'string' && OPTIONS.includes(value as AppearancePreference);
}

function parsePreference(raw: string | null): AppearancePreference {
  if (!raw) {
    return DEFAULT_APPEARANCE;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isAppearancePreference(parsed) ? parsed : DEFAULT_APPEARANCE;
  } catch {
    return isAppearancePreference(raw) ? raw : DEFAULT_APPEARANCE;
  }
}

export async function getAppearancePreference(): Promise<AppearancePreference> {
  const preference = parsePreference(await AsyncStorage.getItem(STORAGE_KEY));
  syncNativeAppearancePreference(preference);
  return preference;
}

export async function saveAppearancePreference(
  preference: AppearancePreference
): Promise<AppearancePreference> {
  const next = isAppearancePreference(preference) ? preference : DEFAULT_APPEARANCE;
  syncNativeAppearancePreference(next);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
