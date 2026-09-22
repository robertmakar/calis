import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisCard } from '@/components/calis-card';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';
import { getUserPreferences, saveUserPreferences, type ExperienceLevel } from '@/lib/user-preferences';

import { EXPERIENCE_OPTIONS } from './labels';
import { SettingsHeader } from './settings-header';

export default function ExperienceSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<ExperienceLevel | null>(null);
  const { colors } = useCalisTheme();

  useEffect(() => {
    getUserPreferences().then((prefs) => setSelected(prefs.experienceLevel));
  }, []);

  async function choose(id: ExperienceLevel) {
    const prefs = await getUserPreferences();
    await saveUserPreferences({ ...prefs, experienceLevel: id });
    router.back();
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CalisStatusBar />
      <SettingsHeader title="EXPERIENCE" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <CalisCard style={styles.group}>
          {EXPERIENCE_OPTIONS.map((option, index) => {
            const active = selected === option.id;
            return (
              <View key={option.id}>
                {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => choose(option.id)}
                  style={({ pressed }) => [
                    styles.option,
                    active && { backgroundColor: colors.primary },
                    pressed && styles.pressed,
                  ]}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: colors.primary },
                      active && { color: colors.onPrimary },
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </CalisCard>
      </ScrollView>
    </View>
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
  group: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  option: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
  },
  optionSelected: {
    backgroundColor: Calis.color.primary,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Calis.color.primary,
  },
  optionLabelSelected: {
    color: Calis.color.onPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Calis.color.border,
    marginHorizontal: 16,
  },
  pressed: {
    opacity: 0.85,
  },
});
