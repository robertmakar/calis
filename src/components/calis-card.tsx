import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';

export function CalisCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useCalisTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Calis.radius.card,
    borderWidth: Calis.card.borderWidth,
    paddingVertical: Calis.card.paddingVertical,
    paddingHorizontal: Calis.card.paddingHorizontal,
  },
});
