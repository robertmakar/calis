import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '@/app/(tabs)/index';
import ProgressScreen from '@/app/(tabs)/explore';
import { CalisBrandHeader } from '@/components/calis-brand-header';
import { useCalisTheme } from '@/components/calis-theme';

const PAGES = ['/', '/explore'] as const;

function isTabPathname(pathname: string) {
  return pathname === '/' || pathname === '' || pathname === '/explore';
}

function indexFromPathname(pathname: string) {
  if (pathname === '/explore') {
    return 1;
  }
  if (pathname === '/' || pathname === '') {
    return 0;
  }
  return null;
}

export default function AppTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const settledIndexRef = useRef(indexFromPathname(pathname) ?? 0);
  const pathnameRef = useRef(pathname);
  const windowWidthRef = useRef(windowWidth);
  const [activeIndex, setActiveIndex] = useState(() => indexFromPathname(pathname) ?? 0);

  pathnameRef.current = pathname;
  windowWidthRef.current = windowWidth;

  useEffect(() => {
    const routeIndex = indexFromPathname(pathname);
    if (routeIndex == null) {
      return;
    }
    if (routeIndex === settledIndexRef.current) {
      return;
    }
    settledIndexRef.current = routeIndex;
    setActiveIndex(routeIndex);
    scrollRef.current?.scrollTo({
      x: windowWidthRef.current * routeIndex,
      animated: false,
    });
  }, [pathname]);

  function settleFromOffset(offsetX: number) {
    if (!isTabPathname(pathnameRef.current)) {
      return;
    }
    const width = windowWidthRef.current;
    if (width <= 0) {
      return;
    }
    const index = Math.round(offsetX / width) === 1 ? 1 : 0;
    settledIndexRef.current = index;
    setActiveIndex(index);
    const href = PAGES[index];
    if (href && pathnameRef.current !== href) {
      router.navigate(href);
    }
  }

  function onScrollSettled(event: NativeSyntheticEvent<NativeScrollEvent>) {
    settleFromOffset(event.nativeEvent.contentOffset.x);
  }

  function goToPage(index: number) {
    if (!isTabPathname(pathnameRef.current)) {
      return;
    }
    settledIndexRef.current = index;
    setActiveIndex(index);
    scrollRef.current?.scrollTo({
      x: windowWidthRef.current * index,
      animated: true,
    });
  }

  const { colors } = useCalisTheme();
  const pageStyle = {
    width: windowWidth,
    height: '100%' as const,
    flexGrow: 0,
    flexShrink: 0,
  };

  return (
    <View style={[styles.screen, { width: windowWidth, backgroundColor: colors.background }]}>
      <CalisBrandHeader />
      <View style={[styles.pagerHost, { width: windowWidth }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          directionalLockEnabled
          nestedScrollEnabled
          disableIntervalMomentum
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={styles.pagerContent}
          style={[styles.pager, { width: windowWidth }]}
          contentOffset={{ x: windowWidth * (indexFromPathname(pathname) ?? 0), y: 0 }}
          onMomentumScrollEnd={onScrollSettled}
          onScrollEndDrag={(event) => {
            if (Math.abs(event.nativeEvent.velocity?.x ?? 0) < 0.05) {
              onScrollSettled(event);
            }
          }}>
          <View key="home" collapsable={false} style={pageStyle}>
            <HomeScreen />
          </View>
          <View key="progress" collapsable={false} style={pageStyle}>
            <ProgressScreen />
          </View>
        </ScrollView>
      </View>

      <View
        style={[
          styles.tabBar,
          {
            width: windowWidth,
            paddingBottom: Math.max(insets.bottom, 10),
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}>
        <TabItem
          label="Home"
          icon={require('@/assets/images/tabIcons/home.png')}
          selected={activeIndex === 0}
          onPress={() => goToPage(0)}
        />
        <TabItem
          label="Progress"
          icon={require('@/assets/images/tabIcons/explore.png')}
          selected={activeIndex === 1}
          onPress={() => goToPage(1)}
        />
      </View>
    </View>
  );
}

function TabItem({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: ImageSourcePropType;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useCalisTheme();
  const color = selected ? colors.primary : colors.secondary;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}>
      <Image source={icon} style={[styles.tabIcon, { tintColor: color }]} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  pagerHost: {
    flex: 1,
    overflow: 'hidden',
  },
  pager: {
    flex: 1,
  },
  pagerContent: {
    flexGrow: 0,
  },
  tabBar: {
    flexDirection: 'row',
    flexGrow: 0,
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 40,
  },
  tabIcon: {
    width: 20,
    height: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  pressed: {
    opacity: 0.7,
  },
});
