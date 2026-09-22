import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisButton } from '@/components/calis-button';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';
import {
  connectAppleHealth,
  getAppleHealthStatus,
  type AppleHealthStatus,
} from '@/lib/apple-health';

import { SettingsHeader } from './settings-header';

export default function AppleHealthSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useCalisTheme();
  const [status, setStatus] = useState<AppleHealthStatus>('notDetermined');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setStatus(getAppleHealthStatus());
  }, []);

  useFocusEffect(load);

  async function connect() {
    if (busy) {
      return;
    }
    setBusy(true);
    const next = await connectAppleHealth();
    setStatus(next);
    setBusy(false);
    if (next === 'authorized') {
      router.back();
    }
  }

  const connected = status === 'authorized';
  const unavailable = status === 'unavailable';
  const denied = status === 'denied';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CalisStatusBar />
      <SettingsHeader title="APPLE HEALTH" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <CalisText variant="display" style={styles.headline}>
          Keep your CALIS workouts in Apple Health.
        </CalisText>
        <CalisText variant="body" style={styles.copy}>
          CALIS will only save workouts you complete. It won&apos;t read your health data.
        </CalisText>

        {connected ? (
          <CalisText variant="caption" style={[styles.status, { color: colors.secondary }]}>
            CONNECTED
          </CalisText>
        ) : unavailable ? (
          <CalisText variant="caption" style={[styles.status, { color: colors.secondary }]}>
            UNAVAILABLE ON THIS DEVICE
          </CalisText>
        ) : (
          <>
            {denied ? (
              <CalisText variant="body" style={styles.copy}>
                Permission is off in Apple Health. You can enable it there, then connect again.
              </CalisText>
            ) : null}
            <View style={styles.cta}>
              <CalisButton
                label="CONNECT"
                accessibilityLabel="Connect Apple Health"
                disabled={busy}
                onPress={() => {
                  void connect();
                }}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Calis.color.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Calis.space.xl,
  },
  headline: {
    maxWidth: 320,
    marginBottom: Calis.space.lg,
  },
  copy: {
    maxWidth: 300,
    marginBottom: Calis.space.xl,
  },
  status: {
    marginTop: Calis.space.sm,
  },
  cta: {
    marginTop: Calis.space.sm,
  },
});
