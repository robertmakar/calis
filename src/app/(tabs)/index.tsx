import { useFocusEffect, usePathname, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CalisButton } from '@/components/calis-button';
import { CalisExerciseRow } from '@/components/calis-exercise-row';
import { CalisText } from '@/components/calis-text';
import { useCalisTheme } from '@/components/calis-theme';
import { FullBodyHero } from '@/components/exercise-animation';
import { Calis } from '@/constants/theme';
import { getExerciseById, type ExerciseCategory } from '@/constants/exercises';
import { getPersonalizedWorkout } from '@/lib/personalized-workout';
import { evaluateExerciseProgression } from '@/lib/progression';
import { getCurrentStreak, getWorkoutHistory, isWorkoutCompletedToday } from '@/lib/workout-history';
import { type DailyWorkout, type SessionExercise } from '@/constants/workouts';

const FOCUS_LABEL: Record<ExerciseCategory, string> = {
  push: 'PUSH',
  legs: 'LEGS',
  pull: 'PULL',
  glutes: 'GLUTES',
  core: 'CORE',
  mobility: 'MOBILITY',
  conditioning: 'CONDITIONING',
};

function workoutFocusLine(workout: DailyWorkout) {
  const labels: string[] = [];
  const seen = new Set<ExerciseCategory>();

  for (const exercise of workout.exercises) {
    const category = getExerciseById(exercise.id)?.category;
    if (!category || seen.has(category)) {
      continue;
    }
    seen.add(category);
    labels.push(FOCUS_LABEL[category]);
  }

  return labels.length > 0 ? labels.join(' · ') : null;
}

function progressionHint(exerciseId: string, history: Parameters<typeof evaluateExerciseProgression>[1]) {
  const result = evaluateExerciseProgression(exerciseId, history);
  if (result.status === 'increase-reps' && result.suggestedTarget != null) {
    return 'NEXT TARGET';
  }
  if (result.status === 'ready-for-next-variation' && result.nextExerciseId) {
    return 'READY TO PROGRESS';
  }
  return undefined;
}

function formatDetail(exercise: SessionExercise) {
  if (exercise.kind === 'timed') {
    return `${exercise.sets} × ${exercise.durationSec}s`;
  }

  return `${exercise.sets} × ${exercise.reps}`;
}

function greetingForNow(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  if (hour >= 17 && hour < 21) {
    return 'Good evening';
  }
  return 'Good night';
}

function msUntilNextGreetingChange(now = new Date()) {
  const next = new Date(now);
  const hour = now.getHours();

  if (hour >= 5 && hour < 12) {
    next.setHours(12, 0, 0, 0);
  } else if (hour >= 12 && hour < 17) {
    next.setHours(17, 0, 0, 0);
  } else if (hour >= 17 && hour < 21) {
    next.setHours(21, 0, 0, 0);
  } else if (hour >= 21) {
    next.setDate(next.getDate() + 1);
    next.setHours(5, 0, 0, 0);
  } else {
    next.setHours(5, 0, 0, 0);
  }

  return Math.max(next.getTime() - now.getTime(), 1000);
}

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [workout, setWorkout] = useState<DailyWorkout | null>(null);
  const [hints, setHints] = useState<Record<string, string | undefined>>({});
  const [streak, setStreak] = useState(0);
  const [greeting, setGreeting] = useState(greetingForNow);
  const [completedToday, setCompletedToday] = useState(false);
  const completeReveal = useRef(new Animated.Value(0)).current;
  const { colors } = useCalisTheme();

  const loadHome = useCallback(() => {
    let active = true;
    Promise.all([getPersonalizedWorkout(), getWorkoutHistory()]).then(([value, history]) => {
      if (!active) {
        return;
      }
      setWorkout(value);
      setHints(
        Object.fromEntries(
          value.exercises.map((exercise) => [exercise.id, progressionHint(exercise.id, history)])
        )
      );
    });
    getCurrentStreak().then((value) => {
      if (active) {
        setStreak(value);
      }
    });
    isWorkoutCompletedToday().then((value) => {
      if (active) {
        setCompletedToday(value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(loadHome);

  useEffect(() => {
    if (pathname !== '/' && pathname !== '') {
      return;
    }
    return loadHome();
  }, [loadHome, pathname]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function schedule() {
      setGreeting(greetingForNow());
      timeout = setTimeout(schedule, msUntilNextGreetingChange());
    }

    schedule();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!completedToday) {
      completeReveal.setValue(0);
      return;
    }
    completeReveal.setValue(0);
    Animated.timing(completeReveal, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [completeReveal, completedToday]);

  const totalSets = workout?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0;
  const focusLine = workout ? workoutFocusLine(workout) : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Calis.space.md,
            paddingBottom: Calis.space.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.greetingRow}>
          <Text style={[styles.greeting, { color: colors.secondary }]}>{greeting.toUpperCase()}</Text>
          <Text
            style={[styles.streak, { color: colors.accentText }]}
            accessibilityRole="text"
            accessibilityLabel={`${streak} day streak`}>
            🔥 {streak} {streak === 1 ? 'DAY' : 'DAYS'} STREAK
          </Text>
        </View>

        {workout ? (
          <View style={styles.hero}>
            <CalisText variant="caption">TODAY</CalisText>
            <Text style={[styles.workoutTitle, { color: colors.primary }]}>
              {workout.title.toUpperCase()}
            </Text>
            <Text style={[styles.heroMeta, { color: colors.secondary }]}>
              {workout.estimatedMinutes} MIN · {workout.level.toUpperCase()}
            </Text>
            <Text style={[styles.heroCount, { color: colors.secondary }]}>
              {workout.exercises.length} EXERCISES · {totalSets} SETS
            </Text>
            {focusLine ? (
              <Text style={[styles.heroFocus, { color: colors.secondary }]}>{focusLine}</Text>
            ) : null}

            <View style={styles.heroVisual}>
              <FullBodyHero maxHeight={168} />
            </View>

            {completedToday ? (
              <Animated.View
                style={[styles.completeStatus, { opacity: completeReveal }]}
                accessibilityRole="text"
                accessibilityLabel="Workout complete">
                <Text style={[styles.completeStatusLabel, { color: colors.primary }]}>WORKOUT COMPLETE</Text>
                <CalisText variant="meta" style={styles.completeStatusHint}>
                  You&apos;re done for today.
                </CalisText>
              </Animated.View>
            ) : (
              <CalisButton
                label="START WORKOUT →"
                accessibilityLabel="Start workout"
                onPress={() => router.push('/workout-overview')}
              />
            )}
          </View>
        ) : null}

        <View style={styles.listHeader}>
          <CalisText variant="caption">EXERCISES</CalisText>
        </View>
        <View style={[styles.list, { borderTopColor: colors.border }]}>
          {workout?.exercises.map((exercise, index) => (
            <CalisExerciseRow
              key={`${index}-${exercise.id}`}
              index={index}
              name={exercise.name}
              prescription={formatDetail(exercise)}
              detail={hints[exercise.id]}
              detailAccent={Boolean(hints[exercise.id])}
              onPress={() => router.push(`/exercise/${exercise.id}`)}
              onReplace={
                completedToday
                  ? undefined
                  : () => router.push(`/replace-exercise?index=${index}` as Href)
              }
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  content: {
    paddingHorizontal: Calis.space.xl,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Calis.space.md,
    marginBottom: Calis.space.xl,
  },
  greeting: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  streak: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  hero: {
    marginBottom: Calis.space.hero,
  },
  workoutTitle: {
    marginTop: Calis.space.sm,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  heroMeta: {
    marginTop: Calis.space.md,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  heroCount: {
    marginTop: Calis.space.xs,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  heroFocus: {
    marginTop: Calis.space.md,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  heroVisual: {
    marginTop: Calis.space.xl,
    marginBottom: Calis.space.xl,
    marginHorizontal: -8,
  },
  completeStatus: {
    minHeight: Calis.button.height,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: Calis.space.sm,
    gap: Calis.space.xs,
  },
  completeStatusLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  completeStatusHint: {
    textAlign: 'left',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Calis.space.sm,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
