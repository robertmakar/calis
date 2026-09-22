import Constants from 'expo-constants';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppearanceControl } from '@/components/appearance-control';
import { AppIconControl } from '@/components/app-icon-control';
import { CalisCard } from '@/components/calis-card';
import { CalisMark } from '@/components/calis-mark';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { getExerciseById } from '@/constants/exercises';
import { Calis } from '@/constants/theme';
import {
  getProgressionPreferences,
  resetProgressionPreferences,
  type ProgressionPreferences,
} from '@/lib/progression-preferences';
import {
  getUserPreferences,
  resetOnboarding,
  type UserPreferences,
} from '@/lib/user-preferences';
import { resetWorkoutProgress } from '@/lib/workout-history';
import { getAppleHealthStatus, type AppleHealthStatus } from '@/lib/apple-health';

import { labelForEquipment, labelForExperience, labelForGoal } from './labels';
import { SettingsHeader } from './settings-header';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

function displayValue(value: string) {
  return value.toUpperCase();
}

function displayEquipment(values: UserPreferences['equipment']) {
  const label = labelForEquipment(values);
  if (label === 'Nothing') {
    return 'NO EQUIPMENT';
  }
  return displayValue(label);
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [progression, setProgression] = useState<ProgressionPreferences>({});
  const [healthStatus, setHealthStatus] = useState<AppleHealthStatus>('unavailable');
  const { colors } = useCalisTheme();

  const load = useCallback(() => {
    let active = true;
    Promise.all([getUserPreferences(), getProgressionPreferences()]).then(
      ([user, savedProgression]) => {
        if (!active) {
          return;
        }
        setPreferences(user);
        setProgression(savedProgression);
        setHealthStatus(getAppleHealthStatus());
      }
    );
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(load);

  const mappings = Object.entries(progression);

  function confirmReset() {
    Alert.alert(
      'Reset onboarding?',
      'You’ll go through setup again. Workout history is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
            router.replace('/onboarding');
          },
        },
      ]
    );
  }

  function confirmResetProgress() {
    Alert.alert(
      'Reset progress?',
      'This will permanently delete your workout history, streak, and progression. Your profile and settings will stay unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Progress',
          style: 'destructive',
          onPress: async () => {
            await resetWorkoutProgress();
            await resetProgressionPreferences();
            const [user, savedProgression] = await Promise.all([
              getUserPreferences(),
              getProgressionPreferences(),
            ]);
            setPreferences(user);
            setProgression(savedProgression);
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CalisStatusBar />
      <SettingsHeader title="SETTINGS" subtitle="Customize your CALIS experience." />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}>
        <CalisText variant="caption" style={styles.sectionLabel}>
          PROFILE
        </CalisText>
        <CalisCard style={styles.group}>
          <SettingsRow
            label="Experience"
            value={preferences ? displayValue(labelForExperience(preferences.experienceLevel)) : '—'}
            onPress={() => router.push('/settings/experience')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            label="Goal"
            value={preferences ? displayValue(labelForGoal(preferences.goal)) : '—'}
            onPress={() => router.push('/settings/goal')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            label="Equipment"
            value={preferences ? displayEquipment(preferences.equipment) : '—'}
            onPress={() => router.push('/settings/equipment')}
          />
        </CalisCard>

        <CalisText variant="caption" style={styles.sectionLabel}>
          PROGRESSION
        </CalisText>
        {mappings.length === 0 ? (
          <CalisText variant="body" style={styles.emptyCopy}>
            No preferred variations yet.
          </CalisText>
        ) : (
          <CalisCard style={styles.group}>
            {mappings.map(([fromId, toId], index) => {
              const from = getExerciseById(fromId);
              const to = getExerciseById(toId);
              return (
                <View key={fromId}>
                  {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
                  <SettingsRow
                    label={from?.name ?? fromId}
                    value={displayValue(to?.name ?? toId)}
                    onPress={() => router.push(`/settings/progression/${fromId}`)}
                  />
                </View>
              );
            })}
          </CalisCard>
        )}

        <AppearanceControl />
        <AppIconControl />

        <CalisText variant="caption" style={styles.sectionLabel}>
          APPLE HEALTH
        </CalisText>
        <CalisCard style={styles.group}>
          <SettingsRow
            label="Apple Health"
            value={
              healthStatus === 'unavailable'
                ? 'Unavailable on this device'
                : healthStatus === 'authorized'
                  ? 'Connected'
                  : 'Connect your workouts to Apple Health'
            }
            accessory={healthStatus === 'authorized' ? 'check' : healthStatus === 'unavailable' ? 'none' : 'chevron'}
            onPress={
              healthStatus === 'unavailable' ? undefined : () => router.push('/settings/apple-health' as Href)
            }
          />
        </CalisCard>

        <CalisText variant="caption" style={styles.sectionLabel}>
          APP
        </CalisText>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset progress"
            onPress={confirmResetProgress}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Text style={[styles.progressResetLabel, { color: colors.destructive }]}>RESET PROGRESS</Text>
            <CalisText variant="body" style={styles.actionCopy}>
              Clear your workout history, streak, and progression.
            </CalisText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset onboarding"
            onPress={confirmReset}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Text style={[styles.resetLabel, { color: colors.secondary }]}>RESET ONBOARDING</Text>
            <CalisText variant="body" style={styles.actionCopy}>
              Run the setup again and update your preferences.
            </CalisText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <CalisMark size={18} color={colors.secondary} />
          <CalisText variant="brand" style={[styles.footerBrand, { color: colors.secondary }]}>
            CALIS
          </CalisText>
          <CalisText variant="caption" style={styles.footerVersion}>
            Version {APP_VERSION}
          </CalisText>
          <CalisText variant="caption" style={styles.footerCredit}>
            Developed by Robz!
          </CalisText>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  accessory = 'chevron',
}: {
  label: string;
  value: string;
  onPress?: () => void;
  accessory?: 'chevron' | 'check' | 'none';
}) {
  const { colors } = useCalisTheme();
  const body = (
    <>
      <Text style={[styles.rowLabel, { color: colors.primary }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.rowTrailing}>
        <Text style={[styles.rowValue, { color: colors.secondary }]} numberOfLines={2}>
          {value}
        </Text>
        {accessory === 'chevron' ? (
          <Text style={[styles.chevron, { color: colors.secondary }]}>›</Text>
        ) : accessory === 'check' ? (
          <Text style={[styles.check, { color: colors.secondary }]}>✓</Text>
        ) : null}
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Calis.color.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Calis.space.xl,
  },
  sectionLabel: {
    marginBottom: Calis.space.md,
  },
  group: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: Calis.space.hero,
  },
  row: {
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  rowLabel: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Calis.color.primary,
  },
  rowTrailing: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: Calis.type.caption.fontSize,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: Calis.color.secondary,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '300',
    color: Calis.color.secondary,
  },
  check: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: Calis.color.secondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Calis.color.border,
    marginHorizontal: 16,
  },
  emptyCopy: {
    marginBottom: Calis.space.hero,
  },
  actions: {
    gap: Calis.space.xxl,
    marginBottom: Calis.space.hero,
  },
  action: {
    alignItems: 'flex-start',
  },
  actionCopy: {
    marginTop: 6,
    maxWidth: 280,
  },
  resetLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Calis.color.secondary,
  },
  progressResetLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Calis.color.destructive,
  },
  footer: {
    alignItems: 'center',
    gap: 8,
    paddingTop: Calis.space.md,
  },
  footerBrand: {
    color: Calis.color.secondary,
    letterSpacing: 5,
  },
  footerVersion: {
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'none',
  },
  footerCredit: {
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  pressed: {
    opacity: 0.75,
  },
});
