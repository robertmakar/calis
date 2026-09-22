import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisBack } from '@/components/calis-back';
import { CalisText } from '@/components/calis-text';
import { Calis } from '@/constants/theme';

export function SettingsHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.backWrap}>
        <CalisBack onPress={() => router.back()} />
      </View>
      {subtitle ? (
        <View style={styles.hero}>
          <CalisText variant="display">{title}</CalisText>
          <CalisText variant="body" style={styles.subtitle}>
            {subtitle}
          </CalisText>
        </View>
      ) : (
        <CalisText variant="title" style={styles.pageTitle}>
          {title}
        </CalisText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Calis.space.xl,
    marginBottom: Calis.space.xl,
  },
  backWrap: {
    marginBottom: Calis.space.sm,
  },
  hero: {
    gap: 8,
  },
  subtitle: {
    maxWidth: 280,
  },
  pageTitle: {
    letterSpacing: -0.4,
  },
});
