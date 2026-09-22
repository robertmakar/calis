import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { CalisThemeProvider, useCalisTheme } from '@/components/calis-theme';
import { setNativeAppIcon } from 'calis-native';
import {
  DEFAULT_APPEARANCE,
  getAppearancePreference,
  type AppearancePreference,
} from '@/lib/appearance';
import { getAppIconPreference } from '@/lib/app-icon';
import { isOnboardingComplete } from '@/lib/user-preferences';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [appearance, setAppearance] = useState<AppearancePreference | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([isOnboardingComplete(), getAppearancePreference(), getAppIconPreference()]).then(
      ([onboardingComplete, preference, iconPreference]) => {
        if (active) {
          setOnboarded(onboardingComplete);
          setAppearance(preference);
          void setNativeAppIcon(iconPreference);
        }
      }
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <CalisThemeProvider initialPreference={appearance ?? DEFAULT_APPEARANCE}>
      {onboarded === null || appearance === null ? (
        <BootPlaceholder />
      ) : (
        <RootNavigator onboarded={onboarded} />
      )}
    </CalisThemeProvider>
  );
}

function BootPlaceholder() {
  return null;
}

function RootNavigator({ onboarded }: { onboarded: boolean }) {
  const { colors, scheme } = useCalisTheme();
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.primary,
        border: colors.border,
      },
    };
  }, [colors, scheme]);

  return (
    <ThemeProvider value={navigationTheme}>
      <AnimatedSplashOverlay />
      <Stack
        initialRouteName={onboarded ? '(tabs)' : 'onboarding'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen name="workout" options={{ gestureEnabled: false }} />
        <Stack.Screen name="workout-overview" />
        <Stack.Screen name="replace-exercise" />
        <Stack.Screen name="exercise/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="level-up" />
        <Stack.Screen name="dev/progression" />
        <Stack.Screen name="dev/onboarding" />
        <Stack.Screen name="dev/animations" />
        <Stack.Screen
          name="complete"
          options={{ animation: 'fade', gestureEnabled: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
