import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';

import { resetOnboarding } from '@/lib/user-preferences';

export default function DevOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useCalisTheme();

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
          backgroundColor: colors.background,
        },
      ]}>
      <CalisStatusBar />
      <Text style={[styles.badge, { color: colors.secondary }]}>DEV ONLY · ONBOARDING RESET</Text>
      <Pressable
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
        hitSlop={12}>
        <Text style={[styles.back, { color: colors.primary }]}>← Back</Text>
      </Pressable>
      <Text style={[styles.copy, { color: colors.secondary }]}>
        Clears the onboarding-completed flag. Workout history and progression preferences are not
        deleted.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset onboarding"
        onPress={async () => {
          await resetOnboarding();
          router.replace('/onboarding');
        }}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.primaryLabel, { color: colors.onPrimary }]}>RESET ONBOARDING</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F3F0',
    paddingHorizontal: 24,
  },
  badge: {
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
  copy: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: '#8A8680',
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: '#111111',
    borderRadius: 22,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  pressed: {
    opacity: 0.85,
  },
});
