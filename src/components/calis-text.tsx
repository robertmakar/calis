import { type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';

type CalisTextVariant = 'brand' | 'caption' | 'display' | 'title' | 'body' | 'meta';

const TONE: Record<CalisTextVariant, 'primary' | 'secondary'> = {
  brand: 'primary',
  caption: 'secondary',
  display: 'primary',
  title: 'primary',
  body: 'secondary',
  meta: 'secondary',
};

export function CalisText({
  variant,
  children,
  style,
  ...rest
}: TextProps & {
  variant: CalisTextVariant;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useCalisTheme();

  return (
    <Text style={[styles[variant], { color: colors[TONE[variant]] }, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  brand: Calis.type.brand,
  caption: Calis.type.caption,
  display: Calis.type.display,
  title: Calis.type.title,
  body: Calis.type.body,
  meta: Calis.type.meta,
});
