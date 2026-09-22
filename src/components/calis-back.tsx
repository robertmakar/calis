import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCalisTheme } from '@/components/calis-theme';

export function CalisBack({
  onPress,
  accessibilityLabel = 'Go back',
}: {
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useCalisTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={[styles.label, { color: colors.primary }]}>←</Text>
    </Pressable>
  );
}

export function CalisBackSlot() {
  return <View style={styles.button} />;
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  label: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '400',
  },
  pressed: {
    opacity: 0.85,
  },
});
