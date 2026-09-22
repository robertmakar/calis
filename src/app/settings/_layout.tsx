import { Stack } from 'expo-router';

import { useCalisTheme } from '@/components/calis-theme';

export default function SettingsLayout() {
  const { colors } = useCalisTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
