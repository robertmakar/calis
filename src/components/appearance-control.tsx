import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CalisText } from '@/components/calis-text';
import { useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';
import { type AppearancePreference } from '@/lib/appearance';

const OPTIONS: { id: AppearancePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function AppearanceControl() {
  const { preference, setPreference, colors } = useCalisTheme();

  return (
    <View style={styles.block}>
      <CalisText variant="caption" style={styles.label}>
        APPEARANCE
      </CalisText>
      <View style={[styles.track, { borderColor: colors.border }]}>
        {OPTIONS.map((option) => {
          const selected = preference === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => {
                void setPreference(option.id);
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
