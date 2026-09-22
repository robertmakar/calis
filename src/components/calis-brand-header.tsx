import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisMark } from '@/components/calis-mark';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { SettingsGear } from '@/components/settings-gear';
import { Calis } from '@/constants/theme';

export function CalisBrandHeader() {
  const insets = useSafeAreaInsets();
  const { colors } = useCalisTheme();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          backgroundColor: colors.background,
        },
      ]}>
      <CalisStatusBar />
      <View style={styles.row}>
        <View accessible accessibilityLabel="CALIS" style={styles.lockup}>
          <CalisMark size={24} />
          <CalisText
            variant="brand"
            style={[styles.alis, { color: colors.primary }]}>
            ALIS
          </CalisText>
        </View>
        <SettingsGear />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Calis.space.xl,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  alis: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 4,
    includeFontPadding: false,
    marginLeft: -4,
  },
});
