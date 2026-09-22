import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CalisText } from '@/components/calis-text';
import { useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';
import {
  getAppIconPreference,
  saveAppIconPreference,
  type AppIconPreference,
} from '@/lib/app-icon';

const OPTIONS: { id: AppIconPreference; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function AppIconControl() {
  const { colors } = useCalisTheme();
  const [preference, setPreference] = useState<AppIconPreference>('light');

  useEffect(() => {
    getAppIconPreference().then(setPreference);
  }, []);

  return (
    <View style={styles.block}>
      <CalisText variant="caption" style={styles.label}>
        APP ICON
      </CalisText>
      <View style={[styles.track, { borderColor: colors.border }]}>
        {OPTIONS.map((option) => {
          const selected = preference === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} app icon`}
              onPress={() => {
                setPreference(option.id);
                void saveAppIconPreference(option.id);
              }}
              style={({ pressed }) => [
                styles.option,
                selected && { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.optionLabel,
                  { color: selected ? colors.onPrimary : colors.secondary },
                ]}>
                {option.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: Calis.space.hero,
  },
  label: {
    marginBottom: Calis.space.md,
  },
  track: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Calis.radius.button,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  pressed: {
    opacity: 0.85,
  },
});
