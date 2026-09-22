import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getNativeWorkoutAuthorizationStatus,
  isNativeHealthAvailable,
  requestNativeWorkoutAuthorization,
  saveNativeWorkout,
} from 'calis-native';

export type AppleHealthStatus = 'unavailable' | 'notDetermined' | 'denied' | 'authorized';

export type CalisHealthWorkout = {
  startDate: number;
  endDate: number;
  workoutType?: string;
  metadata: {
    sessionId: string;
    title?: string;
  };
};

const LAST_SESSION_KEY = 'calis.apple-health.last-session-id.v1';

export function isAppleHealthAvailable() {
  return isNativeHealthAvailable();
}

export function getAppleHealthStatus(): AppleHealthStatus {
  if (!isNativeHealthAvailable()) {
    return 'unavailable';
  }
  return getNativeWorkoutAuthorizationStatus();
}

export function isAppleHealthConnected() {
  return getAppleHealthStatus() === 'authorized';
}

export async function connectAppleHealth(): Promise<AppleHealthStatus> {
  if (!isNativeHealthAvailable()) {
    return 'unavailable';
  }
  return requestNativeWorkoutAuthorization();
}

export async function saveCalisWorkoutToAppleHealth(workout: CalisHealthWorkout): Promise<void> {
  try {
    if (!isAppleHealthConnected()) {
      return;
    }

    const sessionId = workout.metadata.sessionId;
    if (!sessionId) {
      return;
    }

    const last = await AsyncStorage.getItem(LAST_SESSION_KEY);
    if (last === sessionId) {
      return;
    }

    const startDate = workout.startDate;
    const endDate = workout.endDate;
    if (!Number.isFinite(startDate) || !Number.isFinite(endDate) || endDate <= startDate) {
      return;
    }

    const result = await saveNativeWorkout({
      startDate,
      endDate,
      workoutType: workout.workoutType ?? 'functionalStrengthTraining',
      metadata: {
        sessionId,
        title: workout.metadata.title ?? 'CALIS',
      },
    });

    if (result.ok) {
      await AsyncStorage.setItem(LAST_SESSION_KEY, sessionId);
      return;
    }

    console.warn('CALIS Apple Health save skipped', result.error);
  } catch (error) {
    console.warn('CALIS Apple Health save failed', error);
  }
}
