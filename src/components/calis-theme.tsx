import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { CalisColors, type CalisColorTokens } from '@/constants/theme';
import {
  DEFAULT_APPEARANCE,
  saveAppearancePreference,
  type AppearancePreference,
} from '@/lib/appearance';

type CalisScheme = 'light' | 'dark';

type CalisThemeValue = {
  preference: AppearancePreference;
  scheme: CalisScheme;
  colors: CalisColorTokens;
  setPreference: (preference: AppearancePreference) => Promise<void>;
};

const CalisThemeContext = createContext<CalisThemeValue>({
  preference: DEFAULT_APPEARANCE,
  scheme: 'light',
  colors: CalisColors.light,
  setPreference: async () => undefined,
});

function resolveScheme(
  preference: AppearancePreference,
  system: string | null | undefined
): CalisScheme {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return system === 'dark' ? 'dark' : 'light';
}

export function CalisThemeProvider({
  children,
  initialPreference = DEFAULT_APPEARANCE,
}: {
  children: ReactNode;
  initialPreference?: AppearancePreference;
}) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>(initialPreference);

  useEffect(() => {
    setPreferenceState(initialPreference);
  }, [initialPreference]);

  const setPreference = useCallback(async (next: AppearancePreference) => {
    setPreferenceState(next);
    await saveAppearancePreference(next);
  }, []);

  const scheme = resolveScheme(preference, system);
  const colors = CalisColors[scheme];

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  const value = useMemo(
    () => ({ preference, scheme, colors, setPreference }),
    [preference, scheme, colors, setPreference]
  );

  return <CalisThemeContext.Provider value={value}>{children}</CalisThemeContext.Provider>;
}

export function useCalisTheme() {
  return useContext(CalisThemeContext);
}

export function CalisStatusBar() {
  const { scheme } = useCalisTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}