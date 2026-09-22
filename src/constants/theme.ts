/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform, StyleSheet } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export type CalisColorTokens = {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  border: string;
  onPrimary: string;
  destructive: string;
  accent: string;
  accentMuted: string;
  accentText: string;
};

export const CalisColors = {
  light: {
    background: '#F4F3F0',
    surface: '#FFFFFF',
    primary: '#111111',
    secondary: '#8A8680',
    border: '#E4E2DC',
    onPrimary: '#FFFFFF',
    destructive: '#9A4A3C',
    accent: '#C4622D',
    accentMuted: '#E8D5C8',
    accentText: '#C4622D',
  },
  dark: {
    background: '#0D0D0D',
    surface: '#181818',
    primary: '#F4F3F0',
    secondary: '#A3A3A3',
    border: '#2A2A2A',
    onPrimary: '#0D0D0D',
    destructive: '#C9786A',
    accent: '#E08A58',
    accentMuted: '#3A2A22',
    accentText: '#E08A58',
  },
} as const satisfies Record<'light' | 'dark', CalisColorTokens>;

export const Calis = {
  color: CalisColors.light,
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    hero: 40,
  },
  radius: {
    card: 8,
    button: 10,
    track: 1,
  },
  type: {
    brand: {
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 4,
      color: CalisColors.light.primary,
    },
    caption: {
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 1.6,
      color: CalisColors.light.secondary,
      textTransform: 'uppercase' as const,
    },
    display: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '600' as const,
      letterSpacing: -0.6,
      color: CalisColors.light.primary,
    },
    title: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600' as const,
      letterSpacing: -0.3,
      color: CalisColors.light.primary,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500' as const,
      color: CalisColors.light.secondary,
    },
    meta: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '500' as const,
      color: CalisColors.light.secondary,
    },
  },
  button: {
    height: 52,
    labelSize: 15,
    letterSpacing: 1,
  },
  cta: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CalisColors.light.border,
  },
} as const;
