import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CalisText } from '@/components/calis-text';
import { useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';

export function CalisExerciseRow({
  index,
  name,
  prescription,
  detail,
  detailAccent = false,
  onPress,
  onReplace,
  hint,
}: {
  index: number;
  name: string;
  prescription: string;
  detail?: string;
  detailAccent?: boolean;
  onPress: () => void;
  onReplace?: () => void;
  hint?: string;
}) {
  const { colors } = useCalisTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} details`}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <Text style={[styles.number, { color: colors.secondary }]}>
          {String(index + 1).padStart(2, '0')}
        </Text>
        <View style={styles.copy}>
          <Text style={[styles.name, { color: colors.primary }]} numberOfLines={1}>
            {name}
          </Text>
          {detail ? (
            <CalisText
              variant="caption"
              style={[styles.detail, detailAccent && { color: colors.accentText }]}>
              {detail}
            </CalisText>
          ) : null}
          {hint ? (
            <CalisText variant="caption" style={[styles.detail, { color: colors.accentText }]}>
              {hint}
            </CalisText>
          ) : null}
        </View>
        <Text style={[styles.prescription, { color: colors.secondary }]}>{prescription}</Text>
      </Pressable>
      {onReplace ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Replace ${name}`}
          hitSlop={8}
          onPress={onReplace}
          style={({ pressed }) => [styles.replaceHit, pressed && styles.pressed]}>
          <Text style={[styles.replace, { color: colors.secondary }]}>REPLACE</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Calis.space.md,
    minHeight: 28,
  },
  number: {
    width: 28,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  prescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  detail: {
    marginTop: 1,
  },
  replaceHit: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginLeft: 40,
  },
  replace: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  pressed: {
    opacity: 0.7,
  },
});
