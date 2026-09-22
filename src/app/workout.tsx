import * as Haptics from 'expo-haptics';
import { useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisBack, CalisBackSlot } from '@/components/calis-back';
import { CalisButton } from '@/components/calis-button';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { ExerciseAnimation } from '@/components/exercise-animation';
import { Calis } from '@/constants/theme';
import { REST_SECONDS } from '@/constants/workout';
import { type DailyWorkout } from '@/constants/workouts';
import {
  beginPersonalizedWorkoutSession,
  releasePersonalizedWorkoutLock,
} from '@/lib/personalized-workout';
import { evaluateExerciseProgression } from '@/lib/progression';
import {
  hasLegitimateProgressionTarget,
  PROGRESS_READY_LABEL,
} from '@/lib/progress-insights';
import { getUserPreferences } from '@/lib/user-preferences';
import { getWorkoutHistory, setPendingWorkoutPerformance } from '@/lib/workout-history';

type Phase = 'active' | 'hold' | 'rest' | 'ready';

type LeaveAction = {
  type: string;
  payload?: object;
  source?: string;
  target?: string;
};

type PendingLeave =
  | { kind: 'action'; action: LeaveAction }
  | { kind: 'back' }
  | { kind: 'complete' };

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function WorkoutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [workout, setWorkout] = useState<DailyWorkout | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [leaveAllowed, setLeaveAllowed] = useState(false);
  const pendingLeaveRef = useRef<PendingLeave | null>(null);
  const leaveHandledRef = useRef(false);
  const { colors } = useCalisTheme();

  useLayoutEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  useEffect(() => {
    let active = true;
    beginPersonalizedWorkoutSession().then((value) => {
      if (active) {
        setWorkout(value);
      }
    });
    return () => {
      active = false;
      releasePersonalizedWorkoutLock();
    };
  }, []);

  usePreventRemove(!leaveAllowed, ({ data }) => {
    pendingLeaveRef.current = { kind: 'action', action: data.action };
    setConfirmVisible(true);
  });

  useEffect(() => {
    if (!leaveAllowed || leaveHandledRef.current) {
      return;
    }
    leaveHandledRef.current = true;

    const pending = pendingLeaveRef.current;
    pendingLeaveRef.current = null;

    if (pending?.kind === 'action') {
      navigation.dispatch(pending.action);
      return;
    }

    if (pending?.kind === 'complete') {
      router.replace('/complete');
      return;
    }

    router.back();
  }, [leaveAllowed, navigation, router]);

  const requestLeave = useCallback(() => {
    setConfirmVisible(true);
  }, []);

  const keepWorkout = useCallback(() => {
    pendingLeaveRef.current = null;
    setConfirmVisible(false);
  }, []);

  const endWorkout = useCallback(() => {
    if (pendingLeaveRef.current == null) {
      pendingLeaveRef.current = { kind: 'back' };
    }
    setConfirmVisible(false);
    setLeaveAllowed(true);
  }, []);

  const permitLeave = useCallback(() => {
    pendingLeaveRef.current = { kind: 'complete' };
    setLeaveAllowed(true);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {workout ? (
        <ActiveWorkout
          workout={workout}
          onRequestLeave={requestLeave}
          permitLeave={permitLeave}
        />
      ) : (
        <CalisStatusBar />
      )}
      <WorkoutEdgeLeaveGuard
        enabled={!confirmVisible && !leaveAllowed}
        onRequestLeave={requestLeave}
      />
      <EndWorkoutConfirm visible={confirmVisible} onKeep={keepWorkout} onEnd={endWorkout} />
    </View>
  );
}

function ActiveWorkout({
  workout,
  onRequestLeave,
  permitLeave,
}: {
  workout: DailyWorkout;
  onRequestLeave: () => void;
  permitLeave: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useCalisTheme();
  const holdHandledRef = useRef(false);
  const restConsumedRef = useRef(false);
  const busyRef = useRef(false);
  const fade = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const exercises = workout.exercises;
  const totalExercises = exercises.length;
  const totalSets = exercises.reduce((sum, item) => sum + item.sets, 0);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('active');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [readyIds, setReadyIds] = useState<Set<string>>(() => new Set());
  const [progressAck, setProgressAck] = useState<string | null>(null);
  const secondsLeftRef = useRef(0);
  const readyIdsRef = useRef<Set<string>>(new Set());
  const ackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const performanceRef = useRef(
    exercises.map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      sets: [] as { target: number; completed: number }[],
    }))
  );

  secondsLeftRef.current = secondsLeft;
  readyIdsRef.current = readyIds;

  useEffect(() => {
    let active = true;
    Promise.all([getWorkoutHistory(), getUserPreferences()]).then(([history, preferences]) => {
      if (!active) {
        return;
      }
      const next = new Set(
        exercises
          .filter((item) =>
            hasLegitimateProgressionTarget(
              evaluateExerciseProgression(item.id, history),
              preferences.equipment
            )
          )
          .map((item) => item.id)
      );
      readyIdsRef.current = next;
      setReadyIds(next);
    });
    return () => {
      active = false;
    };
  }, [exercises]);

  useEffect(
    () => () => {
      if (ackTimeoutRef.current) {
        clearTimeout(ackTimeoutRef.current);
      }
    },
    []
  );

  const exercise = exercises[exerciseIndex];
  const nextExercise = exercises[exerciseIndex + 1];
  const lastSetOfExercise = setIndex >= exercise.sets - 1;
  const showNextExercise = lastSetOfExercise && Boolean(nextExercise);
  const setsCompleted =
    exercises.slice(0, exerciseIndex).reduce((sum, item) => sum + item.sets, 0) + setIndex;
  const setAwareProgress =
    totalSets === 0
      ? 0
      : (setsCompleted + (phase === 'active' || phase === 'hold' ? 1 : 0)) / totalSets;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: setAwareProgress,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [setAwareProgress, progressAnim]);

  useEffect(() => {
    if (phase === 'active' || phase === 'hold') {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [exerciseIndex, fade, phase]);

  const recordCompletedSet = useCallback(() => {
    const current = exercises[exerciseIndex];
    const target =
      current.kind === 'timed' ? (current.durationSec ?? 0) : (current.reps ?? 0);
    const completed =
      current.kind === 'timed' ? Math.max(0, target - secondsLeftRef.current) : target;

    performanceRef.current[exerciseIndex] = {
      ...performanceRef.current[exerciseIndex],
      sets: [
        ...performanceRef.current[exerciseIndex].sets,
        { target, completed },
      ],
    };
  }, [exerciseIndex, exercises]);

  const advanceToNextExercise = useCallback(() => {
    setProgressAck(null);
    setExerciseIndex((value) => value + 1);
    setSetIndex(0);
    setPhase('active');
    setSecondsLeft(0);
  }, []);

  const completeExerciseAfterRest = useCallback(() => {
    const current = exercises[exerciseIndex];
    const isLastExercise = exerciseIndex >= exercises.length - 1;

    if (!isLastExercise) {
      const recorded = performanceRef.current[exerciseIndex].sets;
      const last = recorded[recorded.length - 1];
      const earned =
        Boolean(last && last.completed >= last.target) && readyIdsRef.current.has(current.id);
      if (earned && last) {
        setProgressAck(`${last.completed} / ${last.target}`);
        ackTimeoutRef.current = setTimeout(() => {
          ackTimeoutRef.current = null;
          advanceToNextExercise();
        }, 1400);
        return;
      }
      advanceToNextExercise();
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPendingWorkoutPerformance(performanceRef.current.map((item) => ({ ...item, sets: [...item.sets] })));
    permitLeave();
  }, [advanceToNextExercise, exerciseIndex, exercises, permitLeave]);

  const finishSet = useCallback(() => {
    const current = exercises[exerciseIndex];
    recordCompletedSet();
    const lastSet = setIndex >= current.sets - 1;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!lastSet) {
      setSetIndex((value) => value + 1);
    }
    restConsumedRef.current = false;
    setPhase('rest');
    setSecondsLeft(REST_SECONDS);
  }, [exerciseIndex, exercises, recordCompletedSet, setIndex]);

  useEffect(() => {
    busyRef.current = false;
    setBusy(false);
  }, [exerciseIndex, phase, setIndex]);

  useEffect(() => {
    if ((phase !== 'rest' && phase !== 'hold') || secondsLeft <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (secondsLeft !== 0) {
      return;
    }

    if (phase === 'rest') {
      if (restConsumedRef.current) {
        return;
      }
      restConsumedRef.current = true;
      const current = exercises[exerciseIndex];
      if (setIndex >= current.sets - 1) {
        completeExerciseAfterRest();
        return;
      }
      setPhase('ready');
      return;
    }

    if (phase === 'hold' && !holdHandledRef.current) {
      holdHandledRef.current = true;
      finishSet();
    }
  }, [secondsLeft, phase, finishSet, completeExerciseAfterRest, exerciseIndex, exercises, setIndex]);

  function requestFinishSet() {
    if (busyRef.current || phase !== 'active') {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    finishSet();
  }

  function startHold() {
    if (busyRef.current || exercise.kind !== 'timed') {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    holdHandledRef.current = false;
    setPhase('hold');
    setSecondsLeft(exercise.durationSec ?? 20);
  }

  function startNextSet() {
    if (busyRef.current || phase !== 'ready') {
      return;
    }

    if (exercise.kind === 'timed') {
      startHold();
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setPhase('active');
  }

  function skipRest() {
    if (phase !== 'rest') {
      return;
    }
    setSecondsLeft(0);
  }
  const prescriptionLabel =
    exercise.kind === 'reps' ? `${exercise.reps} REPS` : `${exercise.durationSec} SEC`;
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const showWorkStage = phase === 'active' || phase === 'hold';
  const holdClock =
    phase === 'hold' ? secondsLeft : (exercise.durationSec ?? 0);

  const cta =
    progressAck ? (
      <View style={styles.ctaPlaceholder} />
    ) : phase === 'rest' ? (
      <CalisButton
        variant="ghost"
        label="SKIP REST →"
        accessibilityLabel="Skip rest"
        onPress={skipRest}
      />
    ) : phase === 'ready' ? (
      <CalisButton
        label="START SET →"
        accessibilityLabel="Start set"
        disabled={busy}
        onPress={startNextSet}
      />
    ) : phase === 'active' && exercise.kind === 'reps' ? (
      <CalisButton
        label="COMPLETE SET →"
        accessibilityLabel="Complete set"
        disabled={busy}
        onPress={requestFinishSet}
      />
    ) : phase === 'active' ? (
      <CalisButton
        label="START SET →"
        accessibilityLabel="Start set"
        disabled={busy}
        onPress={startHold}
      />
    ) : (
      <View style={styles.ctaPlaceholder} />
    );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>
      <CalisStatusBar />

      <View style={styles.topBar}>
        <CalisBack accessibilityLabel="Close workout" onPress={onRequestLeave} />
        <View style={styles.progressMeta}>
          <View style={styles.dots} accessibilityLabel={`Exercise ${exerciseIndex + 1} of ${totalExercises}`}>
            {exercises.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === exerciseIndex ? colors.accent : index < exerciseIndex ? colors.primary : colors.border,
                  },
                  index === exerciseIndex && styles.dotCurrent,
                ]}
              />
            ))}
          </View>
          <CalisText variant="caption" style={styles.progressLabel}>
            {exerciseIndex + 1} / {totalExercises}
          </CalisText>
        </View>
        <CalisBackSlot />
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.accent }]} />
      </View>

      <View style={styles.header}>
        <CalisText variant="caption">EXERCISE</CalisText>
        <Text style={[styles.exerciseName, { color: colors.primary }]} numberOfLines={2}>
          {exercise.name.toUpperCase()}
        </Text>
        <Text style={[styles.repCount, { color: colors.secondary }]}>{prescriptionLabel}</Text>
        {readyIds.has(exercise.id) && !progressAck ? (
          <CalisText variant="caption" style={[styles.progressHint, { color: colors.accentText }]}>
            {PROGRESS_READY_LABEL}
          </CalisText>
        ) : null}
      </View>

      <View style={styles.body}>
        {progressAck ? (
          <Animated.View style={[styles.phaseCopy, { opacity: fade }]}>
            <Text style={[styles.ackScore, { color: colors.primary }]}>{progressAck}</Text>
            <CalisText variant="caption" style={{ color: colors.accentText }}>
              {PROGRESS_READY_LABEL}
            </CalisText>
          </Animated.View>
        ) : null}

        {!progressAck && phase === 'rest' ? (
          <Animated.View style={[styles.phaseCopy, { opacity: fade }]}>
            <CalisText variant="caption">REST</CalisText>
            <Text style={[styles.timer, { color: colors.primary }]}>{formatClock(secondsLeft)}</Text>
            <CalisText variant="body" style={styles.phaseSupport}>
              Catch your breath. The next set starts when the timer ends.
            </CalisText>
          </Animated.View>
        ) : null}

        {!progressAck && phase === 'ready' ? (
          <Animated.View style={[styles.phaseCopy, { opacity: fade }]}>
            <Text style={[styles.readyTitle, { color: colors.primary }]}>READY</Text>
            <SetProgress current={setIndex + 1} total={exercise.sets} />
          </Animated.View>
        ) : null}

        {!progressAck && showWorkStage ? (
          <View style={styles.activeStage}>
            <View style={styles.animationSlot}>
              <ExerciseAnimation
                key={exercise.id}
                exerciseName={exercise.name}
                animationType={exercise.animationType}
                maxHeight={236}
              />
            </View>
            {exercise.kind === 'timed' ? (
              <View style={styles.holdTimer}>
                {phase === 'hold' ? <CalisText variant="caption">HOLD</CalisText> : null}
                <Text style={[styles.workTimer, { color: colors.primary }]}>
                  {formatClock(holdClock)}
                </Text>
              </View>
            ) : null}
            <SetProgress current={setIndex + 1} total={exercise.sets} />
            <Text style={[styles.instruction, { color: colors.secondary }]} numberOfLines={3}>
              {exercise.instruction}
            </Text>
            {showNextExercise ? (
              <Text style={[styles.nextHint, { color: colors.secondary }]} numberOfLines={1}>
                NEXT  {nextExercise.name}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + Calis.cta.paddingBottom, backgroundColor: colors.background }]}>{cta}</View>
    </View>
  );
}

function SetProgress({ current, total }: { current: number; total: number }) {
  const { colors } = useCalisTheme();

  return (
    <View
      style={styles.setProgress}
      accessibilityRole="text"
      accessibilityLabel={`Set ${current} of ${total}`}>
      <CalisText variant="caption">SET</CalisText>
      <View style={styles.setProgressRow}>
        <Text style={[styles.setCurrent, { color: colors.primary }]}>{current}</Text>
        <Text style={[styles.setOf, { color: colors.secondary }]}>OF {total}</Text>
      </View>
    </View>
  );
}

function WorkoutEdgeLeaveGuard({
  enabled,
  onRequestLeave,
}: {
  enabled: boolean;
  onRequestLeave: () => void;
}) {
  const insets = useSafeAreaInsets();
  const onRequestLeaveRef = useRef(onRequestLeave);
  onRequestLeaveRef.current = onRequestLeave;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (!enabled) {
            return false;
          }
          return gesture.dx > 10 && Math.abs(gesture.dy) < 24;
        },
        onPanResponderGrant: () => {
          onRequestLeaveRef.current();
        },
      }),
    [enabled]
  );

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <View
      {...pan.panHandlers}
      pointerEvents={enabled ? 'auto' : 'none'}
      style={[styles.swipeGuard, { top: insets.top + 44 }]}
    />
  );
}

function EndWorkoutConfirm({
  visible,
  onKeep,
  onEnd,
}: {
  visible: boolean;
  onKeep: () => void;
  onEnd: () => void;
}) {
  const { colors, scheme } = useCalisTheme();
  const overlay = scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(17,17,17,0.28)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onKeep}
      statusBarTranslucent>
      <View style={[styles.confirmRoot, { backgroundColor: overlay }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keep workout"
          onPress={onKeep}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.confirmCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <CalisText variant="caption">END WORKOUT?</CalisText>
          <CalisText variant="body" style={styles.confirmMessage}>
            Are you sure you want to end this workout?
          </CalisText>
          <CalisButton label="KEEP WORKOUT" accessibilityLabel="Keep workout" onPress={onKeep} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End workout"
            onPress={onEnd}
            style={({ pressed }) => [styles.confirmEnd, pressed && styles.confirmEndPressed]}>
            <Text style={[styles.confirmEndLabel, { color: colors.destructive }]}>END WORKOUT</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Calis.color.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Calis.space.xl,
    marginBottom: 10,
  },
  progressMeta: {
    alignItems: 'center',
    gap: 8,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotFilled: {
    backgroundColor: Calis.color.primary,
  },
  dotEmpty: {
    backgroundColor: Calis.color.border,
  },
  dotCurrent: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  progressLabel: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 1.2,
  },
  progressTrack: {
    height: 1,
    backgroundColor: Calis.color.border,
    overflow: 'hidden',
    marginHorizontal: Calis.space.xl,
    marginBottom: 20,
  },
  progressFill: {
    height: 1,
    backgroundColor: Calis.color.primary,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Calis.space.xl,
    marginBottom: 12,
  },
  body: {
    flex: 1,
    paddingHorizontal: Calis.space.xl,
  },
  activeStage: {
    flex: 1,
    alignItems: 'center',
  },
  animationSlot: {
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  holdTimer: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  workTimer: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '600',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  phaseCopy: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Calis.space.lg,
    paddingBottom: Calis.space.md,
  },
  phaseSupport: {
    textAlign: 'center',
    maxWidth: 260,
  },
  exerciseName: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: Calis.color.primary,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    color: Calis.color.secondary,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 4,
    marginBottom: 8,
  },
  setProgress: {
    alignItems: 'center',
    marginBottom: 4,
    gap: 2,
  },
  setProgressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  setCurrent: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '600',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  setOf: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  nextHint: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: Calis.color.secondary,
    textAlign: 'center',
  },
  repCount: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: Calis.color.secondary,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  progressHint: {
    marginTop: 8,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  ackScore: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  timer: {
    fontSize: 64,
    lineHeight: 70,
    fontWeight: '600',
    color: Calis.color.primary,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  readyTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '600',
    color: Calis.color.primary,
    letterSpacing: -0.6,
  },
  ctaBar: {
    paddingHorizontal: Calis.cta.paddingHorizontal,
    paddingTop: Calis.cta.paddingTop,
    backgroundColor: Calis.color.background,
  },
  ctaPlaceholder: {
    minHeight: Calis.button.height,
  },
  swipeGuard: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 28,
    zIndex: 20,
  },
  confirmRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Calis.space.xl,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Calis.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Calis.space.xl,
    paddingTop: Calis.space.xxl,
    paddingBottom: Calis.space.lg,
    gap: Calis.space.md,
  },
  confirmMessage: {
    marginBottom: Calis.space.sm,
  },
  confirmEnd: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmEndPressed: {
    opacity: 0.85,
  },
  confirmEndLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
