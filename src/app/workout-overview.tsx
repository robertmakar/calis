import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisBack, CalisBackSlot } from '@/components/calis-back';
import { CalisButton } from '@/components/calis-button';
import { CalisExerciseRow } from '@/components/calis-exercise-row';
import { CalisWordmark } from '@/components/calis-mark';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import {
  formatExerciseEquipment,
  getExerciseById,
  type ExerciseCategory,
} from '@/constants/exercises';
import { Calis } from '@/constants/theme';
import { type DailyWorkout, type SessionExercise } from '@/constants/workouts';
import {
  formatExercisePrescription,
  getPersonalizedWorkout,
  getTodaysLevelUpOffers,
} from '@/lib/personalized-workout';
import {
  getProgressionPreferences,
  type ProgressionPreferences,
} from '@/lib/progression-preferences';
import { getUserPreferences, type UserPreferences } from '@/lib/user-preferences';
import { getWorkoutHistory, isWorkoutCompletedToday } from '@/lib/workout-history';
import { evaluateExerciseProgression } from '@/lib/progression';
import {
  hasLegitimateProgressionTarget,
  PROGRESS_READY_LABEL,
} from '@/lib/progress-insights';

const CATEGORY_PHRASE: Record<ExerciseCategory, string> = {
  push: 'pushing',
  legs: 'legs',
  pull: 'pulling',
  glutes: 'posterior-chain work',
  core: 'core',
  mobility: 'mobility',
  conditioning: 'conditioning',
};

function equipmentLabel(preferences: UserPreferences | null) {
  if (!preferences || preferences.equipment.includes('none') || preferences.equipment.length === 0) {
    return 'NO EQUIPMENT';
  }

  const labels: Record<string, string> = {
    chair: 'CHAIR',
    'pull-up-bar': 'PULL-UP BAR',
    gym: 'GYM',
  };

  return preferences.equipment.map((item) => labels[item] ?? item.toUpperCase()).join(' · ');
}

function prescriptionLabel(exercise: SessionExercise) {
  const base = formatExercisePrescription(exercise);
  return exercise.kind === 'timed' ? `${base} SEC` : `${base} REPS`;
}

function joinPhrases(items: string[]) {
  if (items.length === 0) {
    return '';
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function focusBody(workout: DailyWorkout) {
  const phrases = [
    ...new Set(
      workout.exercises.flatMap((exercise) => {
        const library = getExerciseById(exercise.id);
        return library ? [CATEGORY_PHRASE[library.category]] : [];
      })
    ),
  ];
  if (phrases.length === 0) {
    return 'A structured session built around you.';
  }
  return `A balanced session covering ${joinPhrases(phrases)}.`;
}

function progressionInWorkout(
  workout: DailyWorkout,
  preferences: ProgressionPreferences
): { id: string; name: string }[] {
  const seen = new Set<string>();
  return Object.values(preferences).flatMap((toId) => {
    const match = workout.exercises.find((exercise) => exercise.id === toId);
    if (!match || seen.has(match.id)) {
      return [];
    }
    seen.add(match.id);
    return [{ id: match.id, name: match.name }];
  });
}

export default function WorkoutOverviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [workout, setWorkout] = useState<DailyWorkout | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [progressionPrefs, setProgressionPrefs] = useState<ProgressionPreferences>({});
  const [ctaHeight, setCtaHeight] = useState(92);
  const [starting, setStarting] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());
  const { colors } = useCalisTheme();

  const load = useCallback(() => {
    let active = true;
    Promise.all([
      getPersonalizedWorkout(),
      getUserPreferences(),
      getProgressionPreferences(),
      isWorkoutCompletedToday(),
      getWorkoutHistory(),
    ]).then(([nextWorkout, nextPrefs, nextProgression, completed, history]) => {
      if (!active) {
        return;
      }
      setWorkout(nextWorkout);
      setPreferences(nextPrefs);
      setProgressionPrefs(nextProgression);
      setCompletedToday(completed);
      setReadyIds(
        new Set(
          nextWorkout.exercises
            .filter((exercise) =>
              hasLegitimateProgressionTarget(
                evaluateExerciseProgression(exercise.id, history, new Date(), {
                  equipment: nextPrefs.equipment,
                  experience: nextPrefs.experienceLevel,
                }),
                nextPrefs.equipment
              )
            )
            .map((exercise) => exercise.id)
        )
      );
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(load);

  async function startWorkout() {
    if (starting) {
      return;
    }
    setStarting(true);
    const offers = await getTodaysLevelUpOffers();
    if (offers.length > 0) {
      router.push('/level-up');
      setStarting(false);
      return;
    }
    router.push('/workout');
    setStarting(false);
  }

  const totalSets = workout?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0;
  const progressed = workout ? progressionInWorkout(workout, progressionPrefs) : [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>
      <CalisStatusBar />
      <View style={styles.topBar}>
        <CalisBack onPress={() => router.back()} />
        <CalisWordmark size={14} />
        <CalisBackSlot />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: ctaHeight + 12 }]}
        showsVerticalScrollIndicator={false}>
        <CalisText variant="caption">TODAY&apos;S WORKOUT</CalisText>
        {workout ? (
          <>
            <CalisText variant="display" style={styles.title}>
              {workout.title.toUpperCase()}
            </CalisText>
            <CalisText variant="meta" style={styles.metaLine}>
              {workout.estimatedMinutes} MIN · {workout.level.toUpperCase()}
            </CalisText>
            <CalisText variant="meta" style={styles.metaLine}>
              {equipmentLabel(preferences)}
            </CalisText>
            <CalisText variant="meta" style={styles.metaBlock}>
              {workout.exercises.length} EXERCISES · {totalSets} SETS
            </CalisText>

            <CalisText variant="caption" style={styles.sectionLabel}>
              WHAT YOU&apos;LL DO
            </CalisText>
            <View style={[styles.list, { borderTopColor: colors.border }]}>
              {workout.exercises.map((exercise, index) => {
                const library = getExerciseById(exercise.id);
                const gear =
                  library && library.equipment !== 'none'
                    ? formatExerciseEquipment(library.equipment)
                    : undefined;
                return (
                  <CalisExerciseRow
                    key={`${index}-${exercise.id}`}
                    index={index}
                    name={exercise.name}
                    prescription={prescriptionLabel(exercise)}
                    detail={gear}
                    hint={readyIds.has(exercise.id) ? PROGRESS_READY_LABEL : undefined}
                    onPress={() => router.push(`/exercise/${exercise.id}`)}
                    onReplace={
                      completedToday
                        ? undefined
                        : () => router.push(`/replace-exercise?index=${index}` as Href)
                    }
                  />
                );
              })}
            </View>

            <CalisText variant="caption" style={styles.sectionLabel}>
              WORKOUT FOCUS
            </CalisText>
            <CalisText variant="title" style={styles.focusTitle}>
              {workout.title.toUpperCase()}
            </CalisText>
            <CalisText variant="body" style={styles.focusBody}>
              {focusBody(workout)}
            </CalisText>

            {progressed.length > 0 ? (
              <>
                <CalisText variant="caption" style={[styles.sectionLabel, { color: colors.accentText }]}>
                  PROGRESSION
                </CalisText>
                {progressed.map((item) => (
                  <View key={item.id} style={styles.progressionBlock}>
                    <Text style={[styles.progressionName, { color: colors.primary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <CalisText variant="body">Your current progression</CalisText>
                  </View>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

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
          label="START WORKOUT →"
          accessibilityLabel="Start workout"
          disabled={starting || !workout}
          onPress={startWorkout}
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
  topBar: {
    paddingHorizontal: Calis.space.xl,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Calis.space.xl,
  },
  title: {
    marginTop: 8,
  },
  metaLine: {
    marginTop: 6,
  },
  metaBlock: {
    marginTop: 6,
    marginBottom: Calis.space.hero,
  },
  sectionLabel: {
    marginBottom: Calis.space.md,
  },
  list: {
    marginBottom: Calis.space.hero,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Calis.color.border,
  },
  focusTitle: {
    marginBottom: 8,
  },
  focusBody: {
    marginBottom: Calis.space.hero,
    maxWidth: 320,
  },
  progressionBlock: {
    marginBottom: Calis.space.xl,
    gap: 4,
  },
  progressionName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: Calis.color.primary,
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
