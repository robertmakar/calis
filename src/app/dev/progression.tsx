import { useFocusEffect, useRouter } from 'expo-router';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getExerciseById, EXERCISES, type Exercise } from '@/constants/exercises';
import {
  formatPerformanceLine,
  formatProgressionStatus,
  getExerciseProgressionStatus,
  runProgressionEvaluatorFixtures,
  type ExerciseProgressionResult,
} from '@/lib/progression';
import {
  applyProgressionToExercise,
  formatExercisePrescription,
} from '@/lib/personalized-workout';
import { type SessionExercise } from '@/constants/workouts';

function toDefaultSessionExercise(exercise: Exercise): SessionExercise {
  if (exercise.type === 'hold') {
    return {
      id: exercise.id,
      name: exercise.name,
      sets: exercise.defaultSets,
      kind: 'timed',
      durationSec: exercise.defaultRepsOrDuration,
      instruction: exercise.cue,
      animationType: exercise.animationType,
    };
  }

  return {
    id: exercise.id,
    name: exercise.name,
    sets: exercise.defaultSets,
    kind: 'reps',
    reps: exercise.defaultRepsOrDuration,
    instruction: exercise.cue,
    animationType: exercise.animationType,
  };
}

export default function DevProgressionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState(EXERCISES[0]?.id ?? 'incline-push-ups');
  const [result, setResult] = useState<ExerciseProgressionResult | null>(null);
  const fixtures = useMemo(() => runProgressionEvaluatorFixtures(), []);
  const { colors } = useCalisTheme();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getExerciseProgressionStatus(selectedId).then((value) => {
        if (!active) {
          return;
        }
        setResult(value);
      });
      return () => {
        active = false;
      };
    }, [selectedId])
  );

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.background,
        },
      ]}>
      <CalisStatusBar />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.devBadge}>DEV ONLY · PROGRESSION EVALUATOR</Text>

        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <Text style={styles.section}>FIXTURE TESTS</Text>
        {fixtures.map((test) => (
          <Text key={test.name} style={[styles.fixture, test.pass ? styles.pass : styles.fail]}>
            {test.pass ? '✓' : '✗'} {test.name}
            {test.pass ? '' : ` (expected ${test.expected}, got ${test.actual})`}
          </Text>
        ))}

        <Text style={[styles.section, styles.spaced]}>EXERCISE</Text>
        <View style={styles.chips}>
          {EXERCISES.map((exercise) => {
            const selected = exercise.id === selectedId;
            return (
              <Pressable
                key={exercise.id}
                onPress={() => setSelectedId(exercise.id)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {exercise.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {result ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Exercise</Text>
            <Text style={styles.cardTitle}>{result.exerciseName}</Text>
            {result.progressionLevel != null ? (
              <Text style={styles.meta}>Level {result.progressionLevel}</Text>
            ) : (
              <Text style={styles.meta}>No progression group</Text>
            )}

            <Text style={[styles.cardLabel, styles.blockGap]}>Recent performance</Text>
            {result.recentPerformance.length === 0 ? (
              <Text style={styles.body}>None</Text>
            ) : (
              result.recentPerformance.map((session) => (
                <Text key={session.date} style={styles.body}>
                  {session.date} · {formatPerformanceLine(session)}
                </Text>
              ))
            )}

            <Text style={[styles.cardLabel, styles.blockGap]}>Status</Text>
            <Text style={styles.cardTitle}>{formatProgressionStatus(result)}</Text>
            <Text style={styles.reason}>{result.reason}</Text>

            {result.suggestedTarget != null ? (
              <>
                <Text style={[styles.cardLabel, styles.blockGap]}>Suggested target</Text>
                <Text style={styles.body}>{result.suggestedTarget}</Text>
              </>
            ) : null}

            {result.nextExerciseName ? (
              <>
                <Text style={[styles.cardLabel, styles.blockGap]}>Next</Text>
                <Text style={styles.body}>{result.nextExerciseName}</Text>
              </>
            ) : null}

            {(() => {
              const libraryExercise = getExerciseById(result.exerciseId);
              if (!libraryExercise) {
                return null;
              }
              const generated = toDefaultSessionExercise(libraryExercise);
              const personalized = applyProgressionToExercise(generated, result);
              return (
                <>
                  <Text style={[styles.cardLabel, styles.blockGap]}>Default</Text>
                  <Text style={styles.body}>
                    {formatExercisePrescription(generated)}
                    {generated.kind === 'timed' ? ' sec' : ''}
                  </Text>
                  <Text style={[styles.cardLabel, styles.blockGap]}>Progression</Text>
                  <Text style={styles.body}>{result.status}</Text>
                  <Text style={[styles.cardLabel, styles.blockGap]}>Suggested</Text>
                  <Text style={styles.body}>{result.suggestedTarget ?? '—'}</Text>
                  <Text style={[styles.cardLabel, styles.blockGap]}>Personalized</Text>
                  <Text style={styles.body}>
                    {formatExercisePrescription(personalized)}
                    {personalized.kind === 'timed' ? ' sec' : ''}
                  </Text>
                </>
              );
            })()}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F3F0',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  devBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#8A8680',
    marginBottom: 16,
  },
  back: {
    fontSize: 16,
    color: '#111111',
    marginBottom: 24,
  },
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: '#8A8680',
    marginBottom: 10,
  },
  spaced: {
    marginTop: 28,
  },
  fixture: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  pass: {
    color: '#111111',
  },
  fail: {
    color: '#8A8680',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#111111',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
  },
  chipLabelSelected: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#8A8680',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111111',
  },
  meta: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#8A8680',
  },
  body: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111111',
    marginBottom: 4,
  },
  reason: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#8A8680',
  },
  blockGap: {
    marginTop: 20,
  },
});
