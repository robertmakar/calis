import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisBack, CalisBackSlot } from '@/components/calis-back';
import { CalisButton } from '@/components/calis-button';
import { CalisMark } from '@/components/calis-mark';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';
import {
  completeOnboarding,
  getUserPreferences,
  saveUserPreferences,
  toggleEquipmentSelection,
  type EquipmentOption,
  type ExperienceLevel,
  type Goal,
} from '@/lib/user-preferences';

const EXPERIENCE_OPTIONS: {
  id: ExperienceLevel;
  title: string;
  detail: string;
}[] = [
  { id: 'beginner', title: 'BEGINNER', detail: 'New to structured training' },
  { id: 'some-experience', title: 'SOME EXPERIENCE', detail: 'Know the basics' },
  { id: 'experienced', title: 'EXPERIENCED', detail: 'Train regularly' },
];

const EQUIPMENT_OPTIONS: {
  id: EquipmentOption;
  title: string;
  detail: string;
}[] = [
  { id: 'none', title: 'NONE', detail: 'Bodyweight only' },
  { id: 'chair', title: 'CHAIR', detail: 'A sturdy chair nearby' },
  { id: 'pull-up-bar', title: 'PULL-UP BAR', detail: 'If you have one' },
  { id: 'gym', title: 'GYM', detail: 'Optional — never required' },
];

const GOAL_OPTIONS: {
  id: Goal;
  title: string;
  detail: string;
}[] = [
  { id: 'strength', title: 'STRENGTH', detail: 'Get stronger over time' },
  { id: 'muscle', title: 'MUSCLE', detail: 'Build size and control' },
  { id: 'calisthenics', title: 'CALISTHENICS', detail: 'Learn the movement' },
  { id: 'consistency', title: 'CONSISTENCY', detail: 'Show up and stay with it' },
];

const QUESTION_COUNT = 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [equipment, setEquipment] = useState<EquipmentOption[]>(['none']);
  const [goal, setGoal] = useState<Goal>('strength');
  const [saving, setSaving] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const shift = useRef(new Animated.Value(0)).current;
  const { colors } = useCalisTheme();
  const stepRef = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    let active = true;
    getUserPreferences().then((prefs) => {
      if (!active || stepRef.current > 0) {
        return;
      }
      setExperienceLevel(prefs.experienceLevel);
      setEquipment(prefs.equipment);
      setGoal(prefs.goal);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) {
        goTo(step - 1);
        return true;
      }
      return true;
    });
    return () => sub.remove();
  }, [step]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current);
      }
    };
  }, []);

  function goTo(next: number) {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(shift, {
        toValue: 8,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(next);
      shift.setValue(-8);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(shift, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  async function persistDraft(next?: {
    experienceLevel?: ExperienceLevel;
    equipment?: EquipmentOption[];
    goal?: Goal;
  }) {
    const current = await getUserPreferences();
    await saveUserPreferences({
      ...current,
      experienceLevel: next?.experienceLevel ?? experienceLevel,
      equipment: next?.equipment ?? equipment,
      goal: next?.goal ?? goal,
      onboardingCompleted: false,
    });
  }

  async function continueFrom(next: number) {
    await persistDraft();
    goTo(next);
  }

  function selectAndAdvance(
    apply: () => void,
    draft: {
      experienceLevel?: ExperienceLevel;
      equipment?: EquipmentOption[];
      goal?: Goal;
    },
    next: number
  ) {
    apply();
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
    }
    advanceTimer.current = setTimeout(() => {
      persistDraft(draft).then(() => goTo(next));
    }, 180);
  }

  async function finish() {
    if (saving) {
      return;
    }
    setSaving(true);
    await completeOnboarding({ experienceLevel, equipment, goal });
    router.replace('/');
  }

  const questionIndex = step >= 1 && step <= QUESTION_COUNT ? step : 0;
  const showBack = step > 0;
  const showProgress = questionIndex > 0;

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

      <View style={styles.topBar}>
        {showBack ? <CalisBack onPress={() => goTo(step - 1)} /> : <CalisBackSlot />}
        {showProgress ? (
          <CalisText variant="caption" style={styles.progress}>
            {String(questionIndex).padStart(2, '0')} / {String(QUESTION_COUNT).padStart(2, '0')}
          </CalisText>
        ) : (
          <CalisBackSlot />
        )}
      </View>

      <Animated.View
        style={[
          styles.body,
          {
            opacity: fade,
            transform: [{ translateY: shift }],
          },
        ]}>
        {step === 0 ? (
          <View style={styles.welcome}>
            <CalisMark size={96} />
            <CalisText variant="brand" style={styles.welcomeBrand}>
              CALIS
            </CalisText>
            <CalisText variant="display" style={styles.welcomeTitle}>
              Let&apos;s build your routine.
            </CalisText>
            <CalisText variant="body" style={styles.welcomeCopy}>
              A workout that adapts as you get stronger.
            </CalisText>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {step === 1 ? (
              <>
                <CalisText variant="caption">YOUR EXPERIENCE</CalisText>
                <CalisText variant="display" style={styles.headline}>
                  How often do you train?
                </CalisText>
                <View style={styles.options}>
                  {EXPERIENCE_OPTIONS.map((option, index) => (
                    <ChoiceRow
                      key={option.id}
                      title={option.title}
                      detail={option.detail}
                      selected={experienceLevel === option.id}
                      last={index === EXPERIENCE_OPTIONS.length - 1}
                      onPress={() =>
                        selectAndAdvance(
                          () => setExperienceLevel(option.id),
                          { experienceLevel: option.id },
                          2
                        )
                      }
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <CalisText variant="caption">YOUR EQUIPMENT</CalisText>
                <CalisText variant="display" style={styles.headline}>
                  What can you train with?
                </CalisText>
                <CalisText variant="body" style={styles.support}>
                  None is a complete starting point. Gym access is never required.
                </CalisText>
                <View style={styles.options}>
                  {EQUIPMENT_OPTIONS.map((option, index) => (
                    <ChoiceRow
                      key={option.id}
                      title={option.title}
                      detail={option.detail}
                      selected={equipment.includes(option.id)}
                      last={index === EQUIPMENT_OPTIONS.length - 1}
                      onPress={() =>
                        setEquipment((current) => toggleEquipmentSelection(current, option.id))
                      }
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <CalisText variant="caption">YOUR GOAL</CalisText>
                <CalisText variant="display" style={styles.headline}>
                  What are you training for?
                </CalisText>
                <View style={styles.options}>
                  {GOAL_OPTIONS.map((option, index) => (
                    <ChoiceRow
                      key={option.id}
                      title={option.title}
                      detail={option.detail}
                      selected={goal === option.id}
                      last={index === GOAL_OPTIONS.length - 1}
                      onPress={() =>
                        selectAndAdvance(() => setGoal(option.id), { goal: option.id }, 4)
                      }
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === 4 ? (
              <View style={styles.ready}>
                <CalisText variant="display" style={styles.readyTitle}>
                  You&apos;re ready.
                </CalisText>
                <CalisText variant="body" style={styles.readyCopy}>
                  Your workouts will adapt as you get stronger.
                </CalisText>
              </View>
            ) : null}
          </ScrollView>
        )}
      </Animated.View>

      {step === 0 || step === 2 || step === 4 ? (
        <View style={styles.footer}>
          {step === 0 ? (
            <CalisButton label="GET STARTED →" onPress={() => goTo(1)} />
          ) : null}
          {step === 2 ? (
            <CalisButton label="CONTINUE →" onPress={() => continueFrom(3)} />
          ) : null}
          {step === 4 ? (
            <CalisButton label="START TRAINING →" disabled={saving} onPress={finish} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ChoiceRow({
  title,
  detail,
  selected,
  last,
  onPress,
}: {
  title: string;
  detail: string;
  selected: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  const { colors } = useCalisTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
        selected && { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.indicator,
          { backgroundColor: selected ? colors.accent : 'transparent' },
        ]}
      />
      <View style={styles.choiceCopy}>
        <Text style={[styles.choiceTitle, { color: colors.primary }]}>{title}</Text>
        <Text style={[styles.choiceDetail, { color: colors.secondary }]}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: Calis.space.xl,
  },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Calis.space.sm,
  },
  progress: {
    letterSpacing: 1.8,
  },
  body: {
    flex: 1,
  },
  welcome: {
    flex: 1,
    paddingTop: Calis.space.hero,
    alignItems: 'flex-start',
  },
  welcomeBrand: {
    marginTop: Calis.space.xl,
    marginBottom: Calis.space.hero,
  },
  welcomeTitle: {
    marginBottom: Calis.space.lg,
    maxWidth: 320,
  },
  welcomeCopy: {
    maxWidth: 280,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: Calis.space.md,
    paddingBottom: Calis.space.xxl,
  },
  headline: {
    marginTop: Calis.space.sm,
    marginBottom: Calis.space.lg,
    maxWidth: 320,
  },
  support: {
    marginBottom: Calis.space.xl,
    maxWidth: 300,
  },
  options: {
    marginHorizontal: -Calis.space.sm,
  },
  choice: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Calis.space.md,
    paddingVertical: Calis.space.lg,
    paddingHorizontal: Calis.space.sm,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  choiceCopy: {
    flex: 1,
    gap: 4,
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  choiceDetail: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  ready: {
    flexGrow: 1,
    paddingTop: Calis.space.hero,
  },
  readyTitle: {
    marginBottom: Calis.space.lg,
  },
  readyCopy: {
    maxWidth: 280,
  },
  footer: {
    paddingTop: Calis.cta.paddingTop,
  },
  pressed: {
    opacity: 0.85,
  },
});
