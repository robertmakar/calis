import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { CalisText } from '@/components/calis-text';
import { useCalisTheme } from '@/components/calis-theme';

type CalisMarkProps = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function CalisMark({
  size = 24,
  color,
  style,
}: CalisMarkProps) {
  const { colors } = useCalisTheme();
  const ink = color ?? colors.primary;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityRole="image"
      accessibilityLabel="CALIS"
      style={style}>
      <Path
        d="M16.95 17.5A7.4 7.4 0 1 1 16.95 6.5"
        stroke={ink}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <G transform="rotate(-14 12 12)">
        <Path
          d="M14.23 15.56A4.2 4.2 0 1 1 14.23 8.44"
          stroke={ink}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

export function CalisWordmark({
  size = 16,
  color,
  style,
}: CalisMarkProps) {
  const { colors } = useCalisTheme();
  const ink = color ?? colors.primary;
  const fontSize = Math.round(size * 0.75);
  return (
    <View style={[styles.lockup, style]}>
      <CalisMark size={size} color={ink} />
      <CalisText
        variant="brand"
        style={{ color: ink, fontSize, letterSpacing: 4 }}>
        CALIS
      </CalisText>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
