import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisButton } from '@/components/calis-button';
import { CalisCard } from '@/components/calis-card';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { getExerciseById, getProgressionChain } from '@/constants/exercises';
import { Calis } from '@/constants/theme';
import {
  getExerciseProgressionStatus,
  type ExerciseProgressionResult,
} from '@/lib/progression';
import {
  clearPreferredExercise,
  getPreferredExercise,
  setPreferredExercise,
} from '@/lib/progression-preferences';

import { SettingsHeader } from '../settings-header';

function paramId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default function ProgressionPreferenceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const fromId = paramId(params.id) ?? '';
  const from = getExerciseById(fromId);
  const chain = from ? getProgressionChain(from) : [];
  const [preferredId, setPreferredId] = useState<string | null>(null);
  const [result, setResult] = useState<ExerciseProgressionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const { colors } = useCalisTheme();

  useEffect(() => {
    if (!fromId) {
      return;
    }
    getPreferredExercise(fromId).then(setPreferredId);
    getExerciseProgressionStatus(fromId).then(setResult);
  }, [fromId]);

  async function choose(nextId: string) {
    if (saving) {
      return;
    }
    setSaving(true);
    if (nextId === fromId) {
      await clearPreferredExercise(fromId);
    } else {
      await setPreferredExercise(fromId, nextId);
    }
    router.back();
  }

  async function clear() {
    if (saving) {
      return;
    }
    setSaving(true);
    await clearPreferredExercise(fromId);
    router.back();
  }

  const currentId = preferredId ?? fromId;
  const proposedId =
    result?.status === 'ready-for-next-variation' &&
    result.nextExerciseId &&
    from?.harderVariationId &&
    result.nextExerciseId === from.harderVariationId
      ? result.nextExerciseId
      : undefined;
  const proposed = proposedId ? getExerciseById(proposedId) : undefined;
  const canLevelUp = Boolean(proposed && from?.harderVariationId === proposed.id);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CalisStatusBar />
      <SettingsHeader title="PROGRESSION" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <CalisText variant="body" style={styles.intro}>
          {preferredId
            ? `${from?.name ?? 'This exercise'} currently uses a saved variation.`
            : `Choose the variation CALIS should use for ${from?.name ?? 'this exercise'}.`}
        </CalisText>

        {chain.length > 0 ? (
          <CalisCard style={styles.chainCard}>
            {chain.map((exercise, index) => {
              const isCurrent = exercise.id === fromId;
              const isPreferred = exercise.id === currentId;
              const isProposed = exercise.id === proposedId;
              return (
                <View key={exercise.id} style={styles.chainItem}>
                  {index > 0 ? <Text style={[styles.chainArrow, { color: colors.secondary }]}>↓</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isPreferred }}
                    onPress={() => choose(exercise.id)}
                    style={({ pressed }) => [
                      styles.chainButton,
                      isPreferred && { backgroundColor: colors.primary },
                      pressed && styles.pressed,
                    ]}>
                    <Text
                      style={[
                        styles.chainName,
                        { color: colors.secondary },
                        isPreferred && { color: colors.onPrimary },
                      ]}>
                      {exercise.name.toUpperCase()}
                    </Text>
                    {isCurrent ? (
                      <CalisText
                        variant="caption"
                        style={[
                          styles.chainMeta,
                          { color: isPreferred ? colors.onPrimary : colors.secondary },
                        ]}>
                        CURRENT
                      </CalisText>
                    ) : null}
                    {isProposed && !isCurrent ? (
                      <CalisText
                        variant="caption"
                        style={[
                          styles.chainMeta,
                          { color: isPreferred ? colors.onPrimary : colors.secondary },
                        ]}>
                        NEXT
                      </CalisText>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </CalisCard>
        ) : null}

        {canLevelUp && proposed ? (
          <View style={styles.actions}>
            <CalisButton
              variant="ghost"
              label="KEEP CURRENT"
              accessibilityLabel="Keep current"
              disabled={saving}
              onPress={() => choose(fromId)}
            />
            <CalisButton
              label="LEVEL UP →"
              accessibilityLabel="Level up"
              disabled={saving}
              onPress={() => choose(proposed.id)}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear preferred variation"
            onPress={clear}
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
            <Text style={[styles.clearLabel, { color: colors.secondary }]}>Use default</Text>
          </Pressable>
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
  intro: {
    marginBottom: Calis.space.xl,
  },
  chainCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: Calis.space.xl,
  },
  chainItem: {
    width: '100%',
    alignItems: 'center',
  },
  chainArrow: {
    marginVertical: 8,
    fontSize: 16,
    color: Calis.color.secondary,
    textAlign: 'center',
  },
  chainButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Calis.radius.card,
  },
  chainButtonSelected: {
    backgroundColor: Calis.color.primary,
  },
  chainName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Calis.color.secondary,
    textAlign: 'center',
  },
  chainNameSelected: {
    color: Calis.color.onPrimary,
  },
  chainMeta: {
    marginTop: 4,
    color: Calis.color.secondary,
  },
  chainMetaOn: {
    marginTop: 4,
    color: '#C8C4BE',
  },
  actions: {
    gap: 4,
  },
  clearButton: {
    marginTop: Calis.space.sm,
    alignItems: 'flex-start',
  },
  clearLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Calis.color.secondary,
  },
  pressed: {
    opacity: 0.85,
  },
});
