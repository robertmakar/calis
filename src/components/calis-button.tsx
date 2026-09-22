import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';

type CalisButtonProps = {
  label: string;
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
  accessibilityLabel?: string;
  variant?: 'primary' | 'ghost';
};

export function CalisButton({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
  variant = 'primary',
}: CalisButtonProps) {
  const ghost = variant === 'ghost';
  const { colors } = useCalisTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        ghost ? styles.ghost : { backgroundColor: colors.primary },
        (pressed || disabled) && styles.pressed,
      ]}>
      <Text
        style={[
          styles.label,
          ghost
            ? [styles.ghostLabel, { color: colors.secondary }]
            : { color: colors.onPrimary },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Calis.button.height,
    borderRadius: Calis.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: 52,
  },
  label: {
    fontSize: Calis.button.labelSize,
    fontWeight: '700',
    letterSpacing: Calis.button.letterSpacing,
  },
  ghostLabel: {
    fontSize: 14,
    letterSpacing: 1.2,
  },
  pressed: {
    opacity: 0.85,
  },
});
