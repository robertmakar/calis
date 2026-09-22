import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';

import { ExerciseAnimation } from '@/components/exercise-animation';
import { EXERCISES } from '@/constants/exercises';
import { Calis } from '@/constants/theme';

export default function DevAnimationGalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const exercises = useMemo(() => EXERCISES, []);
  const [index, setIndex] = useState(0);
  const { colors } = useCalisTheme();

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const exercise = exercises[index];
  if (!exercise) {
    return null;
  }

  const goTo = (nextIndex: number) => {
    const count = exercises.length;
    setIndex(((nextIndex % count) + count) % count);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>
      <CalisStatusBar />
      <View style={styles.top}>
        <Text style={[styles.badge, { color: colors.secondary }]}>DEV ONLY · ANIMATION GALLERY</Text>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          hitSlop={12}>
          <Text style={[styles.back, { color: colors.primary }]}>← Back</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={[styles.count, { color: colors.secondary }]}>
          {index + 1} / {exercises.length}
        </Text>
        <Text style={[styles.name, { color: colors.primary }]}>{exercise.name.toUpperCase()}</Text>
        <Text style={[styles.type, { color: colors.secondary }]}>{exercise.animationType}</Text>

        <View style={styles.animation}>
          <ExerciseAnimation
            key={exercise.id}
            exerciseName={exercise.name}
            animationType={exercise.animationType}
            maxHeight={240}
          />
        </View>

        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous exercise"
            onPress={() => goTo(index - 1)}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.navLabel, { color: colors.onPrimary }]}>PREV</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next exercise"
            onPress={() => goTo(index + 1)}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.navLabel, { color: colors.onPrimary }]}>NEXT</Text>
          </Pressable>
        </View>

        <Text style={[styles.listLabel, { color: colors.secondary }]}>ALL EXERCISES</Text>
        {exercises.map((item, itemIndex) => {
          const selected = itemIndex === index;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${item.name}`}
              onPress={() => setIndex(itemIndex)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
                pressed && styles.pressed,
              ]}>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowName, { color: colors.primary }]}>{item.name}</Text>
                <Text style={[styles.rowType, { color: colors.secondary }]}>{item.animationType}</Text>
              </View>
              <Text style={[styles.rowIndex, { color: colors.secondary }]}>{itemIndex + 1}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Calis.color.background,
  },
  top: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Calis.color.secondary,
    marginBottom: 16,
  },
  back: {
    fontSize: 16,
    color: Calis.color.primary,
  },
  content: {
    paddingHorizontal: 24,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Calis.color.secondary,
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: Calis.color.primary,
  },
  type: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: Calis.color.secondary,
  },
  animation: {
    marginTop: 20,
    marginBottom: 20,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  navButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: Calis.radius.button,
    backgroundColor: Calis.color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    color: Calis.color.onPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  listLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Calis.color.secondary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Calis.radius.card,
    backgroundColor: Calis.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Calis.color.border,
    marginBottom: 8,
  },
  rowSelected: {
    borderColor: Calis.color.primary,
    borderWidth: 1.5,
  },
  rowCopy: {
    flex: 1,
    paddingRight: 12,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    color: Calis.color.primary,
  },
  rowNameSelected: {
    fontWeight: '800',
  },
  rowType: {
    marginTop: 2,
    fontSize: 13,
    color: Calis.color.secondary,
  },
  rowIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: Calis.color.secondary,
  },
  pressed: {
    opacity: 0.88,
  },
});
