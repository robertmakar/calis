import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CalisButton } from '@/components/calis-button';
import { CalisExerciseRow } from '@/components/calis-exercise-row';
import { CalisText } from '@/components/calis-text';
import { useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';
import { type DailyWorkout, type SessionExercise, deriveWorkoutTitle } from '@/constants/workouts';
import { getPersonalizedWorkout } from '@/lib/personalized-workout';
import {
  getProgressInsights,
  type NextTargetInsight,
  type StrengthInsight,
} from '@/lib/progress-insights';
import { getUserPreferences } from '@/lib/user-preferences';
import {
  dateFromLocalKey,
  formatHistoryDate,
  getProgressSummary,
  getWorkoutHistory,
  localDateKey,
  type ProgressSummary,
  type WeekDayActivity,
} from '@/lib/workout-history';

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

function formatWorkoutCount(count: number) {
  return `${count} ${count === 1 ? 'WORKOUT' : 'WORKOUTS'}`;
}

function formatDetail(exercise: SessionExercise) {
  if (exercise.kind === 'timed') {
    return `${exercise.sets} × ${exercise.durationSec}s`;
  }

  return `${exercise.sets} × ${exercise.reps}`;
}

function weekdayHeading(dateKey: string) {
  return dateFromLocalKey(dateKey)
    .toLocaleDateString(undefined, { weekday: 'long' })
    .toUpperCase();
}

function dayNumber(dateKey: string) {
  return String(dateFromLocalKey(dateKey).getDate());
}

export default function ProgressScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [stronger, setStronger] = useState<StrengthInsight[]>([]);
  const [nextTarget, setNextTarget] = useState<NextTargetInsight | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey());
  const [scheduled, setScheduled] = useState<DailyWorkout | null>(null);
  const { colors } = useCalisTheme();

  const loadProgress = useCallback(() => {
    let active = true;
    Promise.all([getProgressSummary(), getWorkoutHistory(), getUserPreferences()]).then(
      ([value, history, preferences]) => {
        if (!active) {
          return;
        }
        setSummary(value);
        const insights = getProgressInsights(
          history,
          preferences.equipment,
          new Date(),
          preferences.experienceLevel
        );
        setStronger(insights.stronger);
        setNextTarget(insights.nextTarget);
        const today = value.week.find((day) => day.isToday)?.date ?? localDateKey();
        setSelectedDate((current) => {
          if (value.week.some((day) => day.date === current)) {
            return current;
          }
          return today;
        });
      }
    );
    getPersonalizedWorkout(dateFromLocalKey(selectedDate)).then((value) => {
      if (active) {
        setScheduled(value);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedDate]);

  useFocusEffect(loadProgress);

  useEffect(() => {
    if (pathname !== '/explore') {
      return;
    }
    return loadProgress();
  }, [loadProgress, pathname]);

  const empty = summary !== null && summary.workoutCount === 0;
  const week = summary?.week ?? [];
  const selectedDay = week.find((day) => day.date === selectedDate);
  const todayKey = week.find((day) => day.isToday)?.date ?? localDateKey();
  const isToday = selectedDate === todayKey;
  const isCompleted = selectedDay?.completed ?? false;
  const totalSets = scheduled?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0;
  const canStartToday = isToday && !isCompleted;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 8,
            paddingBottom: 24,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CalisText variant="brand">YOUR PROGRESS</CalisText>
        </View>

        {summary ? (
          <>
            <CalisText variant="caption" style={styles.sectionLabel}>
              WEEK
            </CalisText>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekScroll}>
              {week.map((day, index) => (
                <WeekDayButton
                  key={day.date}
                  day={day}
                  label={WEEKDAY_LABELS[index] ?? day.label}
                  selected={day.date === selectedDate}
                  onPress={() => setSelectedDate(day.date)}
                />
              ))}
            </ScrollView>

            {scheduled ? (
              <View style={styles.preview}>
                <CalisText variant="caption">{weekdayHeading(selectedDate)}</CalisText>
                <Text style={[styles.previewTitle, { color: colors.primary }]}>
                  {scheduled.title.toUpperCase()}
                </Text>
                <Text style={[styles.previewMeta, { color: colors.secondary }]}>
                  {scheduled.estimatedMinutes} MIN · {scheduled.level.toUpperCase()}
                </Text>
                <Text style={[styles.previewCount, { color: colors.secondary }]}>
                  {scheduled.exercises.length}{' '}
                  {scheduled.exercises.length === 1 ? 'EXERCISE' : 'EXERCISES'} · {totalSets}{' '}
                  {totalSets === 1 ? 'SET' : 'SETS'}
                </Text>

                {isCompleted ? (
                  <View style={styles.completeStatus}>
                    <Text style={[styles.completeStatusLabel, { color: colors.primary }]}>
                      WORKOUT COMPLETE
                    </Text>
                  </View>
                ) : canStartToday ? (
                  <View style={styles.startWrap}>
                    <CalisButton
                      label="START WORKOUT →"
                      accessibilityLabel="Start workout"
                      onPress={() => router.push('/workout-overview')}
                    />
                  </View>
                ) : (
                  <CalisText variant="meta" style={styles.scheduledHint}>
                    {isToday ? 'SCHEDULED' : 'SCHEDULED · PREVIEW'}
                  </CalisText>
                )}

                <View style={[styles.exerciseList, { borderTopColor: colors.border }]}>
                  {scheduled.exercises.map((exercise, index) => (
                    <CalisExerciseRow
                      key={exercise.id}
                      index={index}
                      name={exercise.name}
                      prescription={formatDetail(exercise)}
                      onPress={() => router.push(`/exercise/${exercise.id}`)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {empty ? (
          <CalisText variant="body" style={styles.emptyBody}>
            Complete a few workouts to start seeing your progress here.
          </CalisText>
        ) : summary ? (
          <>
            <View style={styles.hero}>
              <Text
                style={[styles.streakValue, { color: colors.accentText }]}
                accessibilityRole="text"
                accessibilityLabel={`${summary.streak} day streak`}>
                🔥 {summary.streak} {summary.streak === 1 ? 'DAY' : 'DAYS'} STREAK
              </Text>
              <CalisText variant="meta">{formatWorkoutCount(summary.workoutCount)}</CalisText>
            </View>

            {stronger.length > 0 ? (
              <>
                <CalisText variant="caption" style={styles.sectionLabel}>
                  GETTING STRONGER
                </CalisText>
                <View style={[styles.logList, { borderTopColor: colors.border }]}>
                  {stronger.map((item) => (
                    <View key={item.id} style={[styles.strongerRow, { borderBottomColor: colors.border }]}>
                      <View style={styles.strongerTop}>
                        <Text style={[styles.strongerName, { color: colors.primary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.from !== item.name ? (
                          <Text style={[styles.strongerFrom, { color: colors.secondary }]}>{item.from}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.strongerTo, { color: colors.accentText }]}>→ {item.to}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {nextTarget ? (
              <>
                <CalisText variant="caption" style={[styles.sectionLabel, { color: colors.accentText }]}>
                  NEXT TARGET
                </CalisText>
                <View style={styles.nextTarget}>
                  <Text style={[styles.strongerName, { color: colors.primary }]} numberOfLines={1}>
                    {nextTarget.name}
                  </Text>
                  <CalisText variant="meta">{nextTarget.prescription}</CalisText>
                </View>
              </>
            ) : null}

            {summary.recent.length > 0 ? (
              <>
                <CalisText variant="caption" style={styles.sectionLabel}>
                  RECENT WORKOUTS
                </CalisText>
                <View style={[styles.logList, { borderTopColor: colors.border }]}>
                  {summary.recent.map((workout) => (
                    <View key={workout.date} style={[styles.recentRow, { borderBottomColor: colors.border }]}>
                      <CalisText variant="caption">{formatHistoryDate(workout.date).toUpperCase()}</CalisText>
                      <Text style={[styles.recentTitle, { color: colors.primary }]}>
                        {deriveWorkoutTitle({})}
                      </Text>
                      <CalisText variant="meta">
                        {workout.exercises.length} exercises · {workout.totalSets} sets
                      </CalisText>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function WeekDayButton({
  day,
  label,
  selected,
  onPress,
}: {
  day: WeekDayActivity;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useCalisTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} ${dayNumber(day.date)}${day.isToday ? ', today' : ''}${day.completed ? ', completed' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.weekDay,
        selected && { backgroundColor: colors.accentMuted },
        pressed && styles.weekDayPressed,
      ]}>
      <Text
        style={[
          styles.weekLabel,
          { color: selected ? colors.accentText : day.isToday ? colors.primary : colors.secondary },
        ]}>
        {label}
      </Text>
      <Text
        style={[
          styles.weekDate,
          { color: selected ? colors.accentText : day.isToday ? colors.primary : colors.secondary },
        ]}>
        {dayNumber(day.date)}
      </Text>
      <View style={styles.weekMarks}>
        {day.isToday ? (
          <View style={[styles.todayMark, { backgroundColor: colors.accent }]} />
        ) : (
          <View style={styles.todayMarkSpacer} />
        )}
        <View
          style={[
            styles.dot,
            {
              backgroundColor: day.completed ? colors.accent : 'transparent',
            },
          ]}
        />
      </View>
    </Pressable>
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
  header: {
    gap: 4,
    marginBottom: Calis.space.xxl,
  },
  emptyBody: {
    maxWidth: 280,
    marginBottom: Calis.space.hero,
  },
  hero: {
    marginBottom: Calis.space.hero,
    gap: 8,
  },
  streakValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sectionLabel: {
    marginBottom: Calis.space.md,
  },
  weekScroll: {
    flexGrow: 1,
    gap: 4,
    marginBottom: Calis.space.xl,
  },
  weekDay: {
    minWidth: 44,
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Calis.radius.card,
    gap: 4,
  },
  weekDayPressed: {
    opacity: 0.72,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  weekDate: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  weekMarks: {
    alignItems: 'center',
    gap: 4,
    minHeight: 14,
  },
  todayMark: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  todayMarkSpacer: {
    width: 4,
    height: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  preview: {
    marginBottom: Calis.space.hero,
  },
  previewTitle: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  previewMeta: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  previewCount: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  startWrap: {
    marginTop: 16,
  },
  completeStatus: {
    marginTop: 16,
    minHeight: Calis.button.height,
    justifyContent: 'center',
  },
  completeStatusLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  scheduledHint: {
    marginTop: 16,
    letterSpacing: 0.8,
  },
  exerciseList: {
    marginTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logList: {
    marginBottom: Calis.space.hero,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  strongerRow: {
    paddingVertical: 14,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  strongerTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Calis.space.md,
  },
  strongerName: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  strongerFrom: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  strongerTo: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  nextTarget: {
    marginBottom: Calis.space.hero,
    gap: 4,
  },
  recentRow: {
    paddingVertical: 14,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
});
