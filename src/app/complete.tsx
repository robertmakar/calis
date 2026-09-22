import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisButton } from '@/components/calis-button';
import { CalisExerciseRow } from '@/components/calis-exercise-row';
import { CalisMark, CalisWordmark } from '@/components/calis-mark';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { getExerciseById, isExerciseAvailable } from '@/constants/exercises';
import { Calis } from '@/constants/theme';
import { getTodaysWorkout, type DailyWorkout } from '@/constants/workouts';
import {
  applyProgressionToExercise,
  formatExercisePrescription,
  getActivePersonalizedWorkout,
  getPersonalizedWorkoutElapsedSeconds,
  getPersonalizedWorkoutStartedAtWallMs,
  libraryExerciseToSession,
  releasePersonalizedWorkoutLock,
} from '@/lib/personalized-workout';
import { evaluateExerciseProgression } from '@/lib/progression';
import {
  getUserPreferences,
  type EquipmentOption,
  type ExperienceLevel,
} from '@/lib/user-preferences';
import { saveCalisWorkoutToAppleHealth } from '@/lib/apple-health';
import {
  clearPendingWorkoutPerformance,
  getPendingWorkoutPerformance,
  getCurrentStreak,
  saveCompletedWorkout,
  type CompletedWorkout,
} from '@/lib/workout-history';

type NextUpTarget = {
  id: string;
  name: string;
  prescription: string;
};

function formatDurationMinutes(totalSeconds: number) {
  const minutes = Math.round(totalSeconds / 60);
  if (totalSeconds > 0 && minutes === 0) {
    return 1;
  }
  return Math.max(0, minutes);
}

function sessionDurationSeconds(estimatedMinutes: number) {
  const elapsed = getPersonalizedWorkoutElapsedSeconds();
  if (elapsed != null && elapsed > 0) {
    return elapsed;
  }
  return estimatedMinutes * 60;
}

function nextUpTargets(
  workout: DailyWorkout,
  history: CompletedWorkout[],
  now: Date,
  equipment: readonly EquipmentOption[],
  experience: ExperienceLevel
): NextUpTarget[] {
  return workout.exercises.flatMap((exercise) => {
    const result = evaluateExerciseProgression(exercise.id, history, now, { equipment, experience });

    if (result.status === 'increase-reps' && result.suggestedTarget != null) {
      const next = applyProgressionToExercise(exercise, result);
      return [
        {
          id: exercise.id,
          name: exercise.name,
          prescription: formatExercisePrescription(next),
        },
      ];
    }

    if (result.status === 'ready-for-next-variation' && result.nextExerciseId) {
      const next = getExerciseById(result.nextExerciseId);
      if (!next || !isExerciseAvailable(next, equipment)) {
        return [];
      }

      const session = libraryExerciseToSession(next);
      return [
        {
          id: session.id,
          name: session.name,
          prescription: formatExercisePrescription(session),
        },
      ];
    }

    return [];
  });
}

export default function CompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useCalisTheme();
  const workout = getActivePersonalizedWorkout() ?? getTodaysWorkout();
  const totalExercises = workout.exercises.length;
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const durationSecondsRef = useRef(sessionDurationSeconds(workout.estimatedMinutes));
  const durationSeconds = durationSecondsRef.current;
  const startedAtRef = useRef(getPersonalizedWorkoutStartedAtWallMs());
  const durationMinutes = formatDurationMinutes(durationSeconds);
  const [streak, setStreak] = useState(0);
  const [nextUp, setNextUp] = useState<NextUpTarget[]>([]);
  const [ctaHeight, setCtaHeight] = useState(92);
  const savedRef = useRef(false);
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  useEffect(() => {
    if (savedRef.current) {
      return;
    }
    savedRef.current = true;

    let cancelled = false;
    const performed = getPendingWorkoutPerformance();
    const now = new Date();
    const healthEndMs = Date.now();
    const healthStartMs =
      startedAtRef.current ?? Math.max(0, healthEndMs - durationSeconds * 1000);

    saveCompletedWorkout({
      exercises:
        performed ??
        workout.exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
        })),
      totalSets,
      duration: durationSeconds,
    })
      .then((history) => {
        clearPendingWorkoutPerformance();
        void saveCalisWorkoutToAppleHealth({
          startDate: healthStartMs,
          endDate: healthStartMs + durationSeconds * 1000,
          workoutType: 'functionalStrengthTraining',
          metadata: {
            sessionId: `calis.${workout.dateKey}.${healthStartMs}`,
            title: workout.title,
          },
        });
        return Promise.all([getCurrentStreak(now), getUserPreferences()]).then(
          ([nextStreak, preferences]) => ({
            nextStreak,
            targets: nextUpTargets(
              workout,
              history,
              now,
              preferences.equipment,
              preferences.experienceLevel
            ),
          })
        );
      })
      .then(({ nextStreak, targets }) => {
        if (!cancelled) {
          setStreak(nextStreak);
          setNextUp(targets);
        }
      });

    return () => {
      cancelled = true;
    };
    // Persist once when this screen is first opened after finishing a workout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const streakLabel =
    streak > 0 ? `🔥 ${streak} ${streak === 1 ? 'DAY' : 'DAYS'} STREAK` : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>
      <CalisStatusBar />

      <Animated.View
        style={[
          styles.reveal,
          {
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: ctaHeight + 16 }]}
          showsVerticalScrollIndicator={false}>
          <CalisWordmark size={16} />

          <View style={styles.hero}>
            <Animated.View
              style={[
                styles.sealWrap,
                {
                  transform: [
                    {
                      scale: reveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1],
                      }),
                    },
                  ],
                },
              ]}>
              <View style={[styles.seal, { borderColor: colors.border }]}>
                <CalisMark size={92} />
              </View>
            </Animated.View>

            <Text style={[styles.completeLabel, { color: colors.primary }]}>WORKOUT COMPLETE</Text>
            {durationMinutes > 0 ? (
              <Text
                style={[styles.duration, { color: colors.primary }]}
                accessibilityLabel={`${durationMinutes} minutes`}>
                {durationMinutes} MIN
              </Text>
            ) : null}
            {streakLabel ? (
              <Text
                style={[styles.streak, { color: colors.accentText }]}
                accessibilityRole="text"
                accessibilityLabel={`${streak} day streak`}>
                {streakLabel}
              </Text>
            ) : null}
          </View>

          <View style={styles.summary}>
            <Text style={[styles.workoutTitle, { color: colors.primary }]}>
              {workout.title.toUpperCase()}
            </Text>
            <Text style={[styles.heroCount, { color: colors.secondary }]}>
              {totalExercises} {totalExercises === 1 ? 'EXERCISE' : 'EXERCISES'} · {totalSets}{' '}
              {totalSets === 1 ? 'SET' : 'SETS'}
            </Text>
          </View>

          <View style={[styles.list, { borderTopColor: colors.border }]}>
            {workout.exercises.map((exercise, index) => (
              <CalisExerciseRow
                key={exercise.id}
                index={index}
                name={exercise.name}
                prescription={formatExercisePrescription(exercise)}
                onPress={() => router.push(`/exercise/${exercise.id}`)}
              />
            ))}
          </View>

          {nextUp.length > 0 ? (
            <View style={[styles.nextUp, { borderTopColor: colors.border }]}>
              <CalisText variant="caption" style={[styles.nextUpLabel, { color: colors.accentText }]}>
                NEXT TARGET
              </CalisText>
              {nextUp.map((target) => (
                <View key={target.id} style={styles.nextUpItem}>
                  <CalisText variant="title">{target.name}</CalisText>
                  <CalisText variant="meta">{target.prescription}</CalisText>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>

      <View
        style={[
          styles.ctaBar,
          {
            paddingBottom: insets.bottom + Calis.cta.paddingBottom,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          if (height > 0 && height !== ctaHeight) {
            setCtaHeight(height);
          }
        }}>
        <CalisButton
          label="DONE →"
          accessibilityLabel="Done"
          onPress={() => {
            releasePersonalizedWorkoutLock();
            router.dismissTo('/');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Calis.color.background,
  },
  reveal: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Calis.space.xl,
  },
  hero: {
    paddingTop: Calis.space.md,
    paddingBottom: Calis.space.xl,
  },
  sealWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 64,
  },
  seal: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  duration: {
    marginTop: 10,
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '600',
    letterSpacing: -1.2,
  },
  streak: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  summary: {
    paddingBottom: Calis.space.md,
  },
  workoutTitle: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  heroCount: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: Calis.space.xl,
  },
  nextUp: {
    paddingTop: Calis.space.xl,
    gap: Calis.space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nextUpLabel: {
    marginBottom: Calis.space.xs,
  },
  nextUpItem: {
    gap: 6,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Calis.cta.paddingHorizontal,
    paddingTop: Calis.cta.paddingTop,
    backgroundColor: Calis.color.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Calis.color.border,
  },
});
