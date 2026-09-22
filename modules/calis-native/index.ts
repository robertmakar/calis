import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

type HealthStatus = 'unavailable' | 'notDetermined' | 'denied' | 'authorized';

type CalisNativeModuleType = {
  setAppearancePreference: (value: string) => void;
  getAppearancePreference: () => string;
  setAppIcon: (name: string | null) => Promise<void>;
  getAppIcon: () => string;
  isHealthAvailable: () => boolean;
  getWorkoutAuthorizationStatus: () => string;
  requestWorkoutAuthorization: () => Promise<string>;
  saveWorkout: (payload: {
    startDate: number;
    endDate: number;
    workoutType: string;
    metadata: Record<string, string>;
  }) => Promise<{ ok?: string; error?: string }>;
};

let nativeModule: CalisNativeModuleType | null | undefined;
let loggedHealthAvailability = false;

function getNative(): CalisNativeModuleType | null {
  if (nativeModule !== undefined) {
    return nativeModule;
  }

  if (Platform.OS !== 'ios') {
    console.warn('[CALIS Health] native module skipped; Platform.OS=', Platform.OS);
    nativeModule = null;
    return null;
  }

  try {
    nativeModule = requireNativeModule<CalisNativeModuleType>('CalisNative');
    console.log('[CALIS Health] CalisNative module loaded');
    return nativeModule;
  } catch (error) {
    console.warn('[CALIS Health] CalisNative module not loaded', error);
    nativeModule = null;
    return null;
  }
}

function asHealthStatus(value: string | undefined): HealthStatus {
  if (value === 'authorized' || value === 'denied' || value === 'notDetermined' || value === 'unavailable') {
    return value;
  }
  return 'unavailable';
}

export function isNativeHealthAvailable() {
  const native = getNative();
  if (!native) {
    console.warn('[CALIS Health] isHealthAvailable skipped; native module missing');
    return false;
  }
  try {
    const available = native.isHealthAvailable();
    if (!loggedHealthAvailability) {
      loggedHealthAvailability = true;
      console.log('[CALIS Health] isHealthAvailable() =>', available);
    }
    return available;
  } catch (error) {
    console.warn('[CALIS Health] isHealthAvailable() threw', error);
    return false;
  }
}

export function getNativeWorkoutAuthorizationStatus(): HealthStatus {
  const native = getNative();
  if (!native || !isNativeHealthAvailable()) {
    return 'unavailable';
  }
  try {
    return asHealthStatus(native.getWorkoutAuthorizationStatus());
  } catch {
    return 'unavailable';
  }
}

export async function requestNativeWorkoutAuthorization(): Promise<HealthStatus> {
  const native = getNative();
  if (!native || !isNativeHealthAvailable()) {
    return 'unavailable';
  }
  try {
    return asHealthStatus(await native.requestWorkoutAuthorization());
  } catch {
    return getNativeWorkoutAuthorizationStatus();
  }
}

export async function saveNativeWorkout(payload: {
  startDate: number;
  endDate: number;
  workoutType: string;
  metadata: Record<string, string>;
}): Promise<{ ok: boolean; error?: string }> {
  const native = getNative();
  if (!native || !isNativeHealthAvailable()) {
    return { ok: false, error: 'unavailable' };
  }
  try {
    const result = await native.saveWorkout(payload);
    return { ok: result.ok === 'true', error: result.error };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'save-failed' };
  }
}

export function syncNativeAppearancePreference(value: string) {
  getNative()?.setAppearancePreference(value);
}

export async function setNativeAppIcon(preference: 'light' | 'dark') {
  const native = getNative();
  if (!native) {
    return;
  }
  await native.setAppIcon(preference === 'dark' ? 'dark' : null);
}

export function getNativeAppIcon(): 'light' | 'dark' {
  const native = getNative();
  if (!native) {
    return 'light';
  }
  return native.getAppIcon() === 'dark' ? 'dark' : 'light';
}
