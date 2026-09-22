import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNativeAppIcon, setNativeAppIcon } from 'calis-native';

const STORAGE_KEY = 'calis.appIcon.v1';

export type AppIconPreference = 'light' | 'dark';

const OPTIONS: AppIconPreference[] = ['light', 'dark'];

export const DEFAULT_APP_ICON: AppIconPreference = 'light';

function isAppIconPreference(value: unknown): value is AppIconPreference {
  return typeof value === 'string' && OPTIONS.includes(value as AppIconPreference);
}

export async function getAppIconPreference(): Promise<AppIconPreference> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_APP_ICON;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isAppIconPreference(parsed) ? parsed : DEFAULT_APP_ICON;
  } catch {
    return isAppIconPreference(raw) ? raw : DEFAULT_APP_ICON;
  }
}

export async function saveAppIconPreference(
  preference: AppIconPreference
): Promise<AppIconPreference> {
  const next = isAppIconPreference(preference) ? preference : DEFAULT_APP_ICON;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  await setNativeAppIcon(next);
  return next;
}

export function readNativeAppIcon(): AppIconPreference {
  return getNativeAppIcon();
}
