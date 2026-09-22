import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisBack, CalisBackSlot } from '@/components/calis-back';
import { CalisExerciseRow } from '@/components/calis-exercise-row';
import { CalisWordmark } from '@/components/calis-mark';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';
import { type DailyWorkout, type SessionExercise } from '@/constants/workouts';
import {
  getExerciseAlternatives,
  type ExerciseAlternative,
} from '@/lib/exercise-alternatives';
import {
  formatExercisePrescription,
  getPersonalizedWorkout,
  replacePersonalizedWorkoutExercise,
} from '@/lib/personalized-workout';
import { getUserPreferences } from '@/lib/user-preferences';
import { getWorkoutHistory } from '@/lib/workout-history';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function prescriptionLabel(exercise: SessionExercise) {
  const base = formatExercisePrescription(exercise);
  return exercise.kind === 'timed' ? `${base} SEC` : `${base} REPS`;
}

export default function ReplaceExerciseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ index?: string | string[] }>();
  const index = Number.parseInt(paramValue(params.index) ?? '', 10);
  const [workout, setWorkout] = useState<DailyWorkout | null>(null);
  const [alternatives, setAlternatives] = useState<ExerciseAlternative[] | null>(null);
  const { colors } = useCalisTheme();

  const load = useCallback(() => {
    let active = true;
    Promise.all([getPersonalizedWorkout(), getUserPreferences(), getWorkoutHistory()]).then(
      ([nextWorkout, preferences, history]) => {
        if (!active) {
          return;
        }
        setWorkout(nextWorkout);
        const current = Number.isInteger(index) ? nextWorkout.exercises[index] : undefined;
        if (!current) {
          setAlternatives([]);
          return;
        }
        setAlternatives(
          getExerciseAlternatives({
            currentId: current.id,
            workout: nextWorkout,
            equipment: preferences.equipment,
            experience: preferences.experienceLevel,
            history,
          })
        );
      }
    );
    return () => {
      active = false;
    };
  }, [index]);

  useFocusEffect(load);

  const current = Number.isInteger(index) ? workout?.exercises[index] : undefined;

  function choose(alternative: ExerciseAlternative) {
    const next = replacePersonalizedWorkoutExercise(index, alternative.session);
    if (next) {
      router.back();
    }
  }

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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <CalisText variant="caption">REPLACE EXERCISE</CalisText>
        {current ? (
          <>
            <Text style={[styles.currentName, { color: colors.primary }]} numberOfLines={2}>
              {current.name.toUpperCase()}
            </Text>
            <Text style={[styles.currentPrescription, { color: colors.secondary }]}>
              {prescriptionLabel(current)}
            </Text>
          </>
        ) : null}

        <CalisText variant="caption" style={styles.sectionLabel}>
          CHOOSE AN ALTERNATIVE
        </CalisText>

        {alternatives === null ? null : alternatives.length === 0 ? (
          <CalisText variant="body">NO ALTERNATIVES AVAILABLE</CalisText>
        ) : (
          <View style={[styles.list, { borderTopColor: colors.border }]}>
            {alternatives.map((alternative, optionIndex) => (
              <CalisExerciseRow
                key={alternative.exercise.id}
                index={optionIndex}
                name={alternative.exercise.name}
                prescription={prescriptionLabel(alternative.session)}
                onPress={() => choose(alternative)}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
  currentName: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  currentPrescription: {
    marginTop: 6,
    marginBottom: Calis.space.hero,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  sectionLabel: {
    marginBottom: Calis.space.md,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
