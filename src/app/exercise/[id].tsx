import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisBack } from '@/components/calis-back';
import { CalisButton } from '@/components/calis-button';
import { CalisCard } from '@/components/calis-card';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { ExerciseAnimation } from '@/components/exercise-animation';
import { Calis } from '@/constants/theme';
import {
  formatExerciseEquipment,
  getExerciseById,
  getExerciseGuide,
  getProgressionChain,
  type Exercise,
} from '@/constants/exercises';
import {
  applyProgressionToExercise,
  libraryExerciseToSession,
} from '@/lib/personalized-workout';
import {
  getExerciseProgressionStatus,
  type ExerciseProgressionResult,
} from '@/lib/progression';

function paramId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function recordedValues(result: ExerciseProgressionResult): number[] {
  return [...result.recentPerformance].reverse().flatMap((session) => {
    const value = session.sets[0]?.completed;
    return typeof value === 'number' ? [value] : [];
  });
}

function personalizedTarget(exercise: Exercise, result: ExerciseProgressionResult): number | null {
  const session = applyProgressionToExercise(libraryExerciseToSession(exercise), result);
  const value = session.kind === 'timed' ? session.durationSec : session.reps;
  return typeof value === 'number' ? value : null;
}

function unitFor(result: ExerciseProgressionResult) {
  return result.kind === 'hold' ? 'SEC' : 'REPS';
}

function statusCopy(result: ExerciseProgressionResult): string {
  switch (result.status) {
    case 'not-enough-data':
    case 'not-ready':
    case 'increase-reps':
      return 'Keep building';
    case 'ready-for-next-variation':
      return 'Ready to progress';
    case 'at-max':
      return 'Maximum target reached';
  }
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const exerciseId = paramId(params.id) ?? '';
  const exercise = getExerciseById(exerciseId);
  const guide = exercise ? getExerciseGuide(exercise.id) : undefined;
  const chain = exercise ? getProgressionChain(exercise) : [];
  const [progression, setProgression] = useState<ExerciseProgressionResult | null>(null);
  const progressReveal = useRef(new Animated.Value(0)).current;
  const { colors } = useCalisTheme();

  const loadProgression = useCallback(() => {
    if (!exerciseId) {
      return;
    }
    let active = true;
    progressReveal.setValue(0);
    getExerciseProgressionStatus(exerciseId).then((result) => {
      if (!active) {
        return;
      }
      setProgression(result);
      Animated.timing(progressReveal, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      active = false;
    };
  }, [exerciseId, progressReveal]);

  useFocusEffect(loadProgression);

  if (!exercise) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <CalisStatusBar />
        <CalisBack onPress={() => router.back()} />
        <View style={styles.fallback}>
          <CalisText variant="title">Exercise not found</CalisText>
          <CalisText variant="body">This exercise is not in the CALIS library.</CalisText>
        </View>
        <CalisButton label="BACK →" onPress={() => router.back()} />
      </View>
    );
  }

  const target =
    exercise.type === 'hold'
      ? `${exercise.defaultRepsOrDuration} SEC · ${exercise.defaultSets} SETS`
      : `${exercise.defaultRepsOrDuration} REPS · ${exercise.defaultSets} SETS`;

  const description = guide?.description ?? exercise.cue;
  const howTo = guide?.howTo ?? [exercise.instructions];
  const formTips = guide?.formTips ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>
      <CalisStatusBar />
      <View style={styles.topBar}>
        <CalisBack onPress={() => router.back()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <CalisText variant="caption">{formatExerciseEquipment(exercise.equipment)}</CalisText>
        <CalisText variant="display" style={styles.name} numberOfLines={2}>
          {exercise.name.toUpperCase()}
        </CalisText>

        <View style={styles.animation}>
          <ExerciseAnimation
            exerciseName={exercise.name}
            animationType={exercise.animationType}
            maxHeight={240}
          />
        </View>

        <CalisText variant="caption" style={styles.sectionLabel}>
          TARGET
        </CalisText>
        <CalisText variant="title">{target}</CalisText>

        <CalisText variant="caption" style={styles.sectionLabel}>
          DESCRIPTION
        </CalisText>
        <CalisText variant="body" style={styles.block}>
          {description}
        </CalisText>

        <CalisText variant="caption" style={styles.sectionLabel}>
          HOW TO
        </CalisText>
        <View style={styles.block}>
          {howTo.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <Text style={[styles.stepIndex, { color: colors.secondary }]}>{index + 1}</Text>
              <CalisText variant="body" style={[styles.stepCopy, { color: colors.primary }]}>
                {step}
              </CalisText>
            </View>
          ))}
        </View>

        {formTips.length > 0 ? (
          <>
            <CalisText variant="caption" style={styles.sectionLabel}>
              FORM TIPS
            </CalisText>
            <CalisCard style={styles.tipsCard}>
              {formTips.map((tip) => (
                <CalisText key={tip} variant="body">
                  {tip}
                </CalisText>
              ))}
            </CalisCard>
          </>
        ) : null}

        {progression ? (
          <Animated.View style={{ opacity: progressReveal }}>
            <YourProgress
              exercise={exercise}
              result={progression}
              onLevelUp={() => router.push(`/settings/progression/${exercise.id}`)}
            />
          </Animated.View>
        ) : null}

        {chain.length > 0 ? (
          <>
            <CalisText variant="caption" style={styles.sectionLabel}>
              PROGRESSION
            </CalisText>
            <CalisCard style={styles.chainCard}>
              {chain.map((item, index) => (
                <View key={item.id}>
                  <Text
                    style={[
                      styles.chainName,
                      { color: colors.secondary },
                      item.id === exercise.id && { color: colors.primary, fontWeight: '700' },
                    ]}>
                    {item.name}
                  </Text>
                  {index < chain.length - 1 ? <Text style={[styles.chainArrow, { color: colors.secondary }]}>↓</Text> : null}
                </View>
              ))}
            </CalisCard>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function YourProgress({
  exercise,
  result,
  onLevelUp,
}: {
  exercise: Exercise;
  result: ExerciseProgressionResult;
  onLevelUp: () => void;
}) {
  const values = recordedValues(result);
  const unit = unitFor(result);
  const target = personalizedTarget(exercise, result);
  const nextExercise =
    result.status === 'ready-for-next-variation' &&
    exercise.harderVariationId &&
    result.nextExerciseId === exercise.harderVariationId
      ? getExerciseById(result.nextExerciseId)
      : undefined;
  const showLevelUp = Boolean(nextExercise);
  const [keptCurrent, setKeptCurrent] = useState(false);
  const { colors } = useCalisTheme();

  return (
    <View>
      <CalisText variant="caption" style={styles.sectionLabel}>
        YOUR PROGRESS
      </CalisText>

      {values.length === 0 ? (
        <CalisText variant="caption" style={styles.emptyProgress}>
          NO RECORDED SESSIONS YET
        </CalisText>
      ) : (
        <>
          <CalisText variant="caption" style={styles.inlineLabel}>
            LAST {values.length} {values.length === 1 ? 'SESSION' : 'SESSIONS'}
          </CalisText>
          <Text style={[styles.progressLine, { color: colors.primary }]}>
            {values.join(' → ')} {unit}
          </Text>

          {target != null ? (
            <>
              <CalisText variant="caption" style={styles.subLabel}>
                CURRENT TARGET
              </CalisText>
              <Text style={[styles.currentTarget, { color: colors.primary }]}>
                {target} {unit}
              </Text>
            </>
          ) : null}

          {showLevelUp && nextExercise && !keptCurrent ? (
            <CalisCard style={styles.levelUpCard}>
              <CalisText variant="caption" style={{ color: colors.accentText }}>
                READY FOR THE NEXT STEP
              </CalisText>
              <Text style={[styles.nextName, { color: colors.primary }]}>{exercise.name}</Text>
              <CalisText variant="body">
                You&apos;ve reached the current target. Your next progression is available.
              </CalisText>
              <CalisText variant="meta">{nextExercise.name}</CalisText>
              <View style={styles.levelUpActions}>
                <CalisButton
                  variant="ghost"
                  label="KEEP CURRENT"
                  accessibilityLabel="Keep current"
                  onPress={() => setKeptCurrent(true)}
                />
                <CalisButton label="LEVEL UP →" onPress={onLevelUp} />
              </View>
            </CalisCard>
          ) : (
            <>
              <CalisText variant="caption" style={styles.subLabel}>
                STATUS
              </CalisText>
              <CalisText variant="caption" style={styles.statusCopy}>
                {statusCopy(result)}
              </CalisText>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Calis.color.background,
    paddingHorizontal: Calis.space.xl,
  },
  topBar: {
    marginBottom: 8,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 4,
  },
  name: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  animation: {
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 0,
  },
  sectionLabel: {
    marginTop: Calis.space.hero,
    marginBottom: Calis.space.md,
  },
  block: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepIndex: {
    width: 20,
    fontSize: 15,
    fontWeight: '600',
    color: Calis.color.secondary,
    fontVariant: ['tabular-nums'],
  },
  stepCopy: {
    flex: 1,
    color: Calis.color.primary,
  },
  tipsCard: {
    gap: 10,
  },
  chainCard: {
    alignItems: 'center',
    gap: 8,
  },
  chainName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
    color: Calis.color.secondary,
    textAlign: 'center',
  },
  chainCurrent: {
    fontWeight: '700',
    color: Calis.color.primary,
  },
  chainArrow: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 16,
    color: Calis.color.secondary,
    textAlign: 'center',
  },
  emptyProgress: {
    letterSpacing: 1.4,
  },
  inlineLabel: {
    marginBottom: Calis.space.sm,
  },
  progressLine: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: Calis.color.primary,
  },
  subLabel: {
    marginTop: Calis.space.xl,
    marginBottom: Calis.space.sm,
  },
  currentTarget: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: Calis.color.primary,
  },
  statusCopy: {
    letterSpacing: 1.4,
  },
  levelUpCard: {
    marginTop: Calis.space.xl,
    gap: 10,
  },
  levelUpActions: {
    gap: 4,
    marginTop: 6,
  },
  nextName: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: Calis.color.primary,
  },
});
