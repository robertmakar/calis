import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalisButton } from '@/components/calis-button';
import { CalisCard } from '@/components/calis-card';
import { CalisMark } from '@/components/calis-mark';
import { CalisText } from '@/components/calis-text';
import { CalisStatusBar, useCalisTheme } from '@/components/calis-theme';
import { Calis } from '@/constants/theme';
import {
  getTodaysLevelUpOffers,
  type LevelUpOffer,
} from '@/lib/personalized-workout';
import { setPreferredExercise } from '@/lib/progression-preferences';

type Choice = 'keep' | 'level-up';

export default function LevelUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [offers, setOffers] = useState<LevelUpOffer[] | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [starting, setStarting] = useState(false);
  const { colors } = useCalisTheme();

  useEffect(() => {
    let active = true;
    getTodaysLevelUpOffers().then((value) => {
      if (!active) {
        return;
      }
      if (value.length === 0) {
        router.replace('/workout');
        return;
      }
      setOffers(value);
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function startWorkout(override?: Record<string, Choice>) {
    if (starting || !offers) {
      return;
    }
    setStarting(true);

    const selected = override ?? choices;
    await Promise.all(
      offers.map((offer) => {
        if (selected[offer.currentId] === 'level-up') {
          return setPreferredExercise(offer.currentId, offer.nextId);
        }
        return Promise.resolve();
      })
    );

    router.replace('/workout');
  }

  if (!offers) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <CalisStatusBar />
      </View>
    );
  }

  const single = offers.length === 1 ? offers[0] : null;

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + Calis.cta.paddingBottom,
          backgroundColor: colors.background,
        },
      ]}>
      <CalisStatusBar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <CalisMark size={28} />
          <CalisText variant="caption" style={styles.eyebrow}>
            LEVEL UP
          </CalisText>
          <CalisText variant="display" style={styles.title}>
            You&apos;re ready.
          </CalisText>
        </View>

        {single ? (
          <>
            <CalisText variant="caption" style={styles.stepLabel}>
              READY FOR THE NEXT STEP
            </CalisText>
            <CalisText variant="title" style={styles.currentName}>
              {single.currentName}
            </CalisText>
            <CalisText variant="body" style={styles.subtitle}>
              You&apos;ve reached the current target. Your next progression is available.
            </CalisText>
            <CalisCard style={styles.card}>
              <CalisText variant="caption">NEXT</CalisText>
              <CalisText variant="title" style={styles.nextName}>
                {single.nextName}
              </CalisText>
            </CalisCard>
          </>
        ) : (
          <>
            <CalisText variant="body" style={styles.subtitle}>
              Choose what to progress today.
            </CalisText>
            <View style={styles.list}>
              {offers.map((offer) => {
                const choice = choices[offer.currentId];
                return (
                  <CalisCard key={offer.currentId}>
                    <Text style={[styles.offerFrom, { color: colors.primary }]}>{offer.currentName}</Text>
                    <Text style={[styles.offerArrow, { color: colors.secondary }]}>→ {offer.nextName}</Text>
                    <View style={styles.offerActions}>
                      <Pressable
                        onPress={() =>
                          setChoices((current) => ({ ...current, [offer.currentId]: 'keep' }))
                        }
                        style={({ pressed }) => [
                          styles.choiceButton,
                          { backgroundColor: colors.background },
                          choice === 'keep' && { backgroundColor: colors.border },
                          pressed && styles.pressed,
                        ]}>
                        <Text
                          style={[
                            styles.choiceLabel,
                            { color: colors.secondary },
                            choice === 'keep' && { color: colors.primary },
                          ]}>
                          KEEP
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          setChoices((current) => ({ ...current, [offer.currentId]: 'level-up' }))
                        }
                        style={({ pressed }) => [
                          styles.choiceButton,
                          { backgroundColor: colors.primary },
                          choice === 'level-up' && styles.choicePrimarySelected,
                          pressed && styles.pressed,
                        ]}>
                        <Text
                          style={[
                            styles.choicePrimaryLabel,
                            { color: colors.onPrimary },
                          ]}>
                          LEVEL UP
                        </Text>
                      </Pressable>
                    </View>
                  </CalisCard>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {single ? (
        <View style={styles.actions}>
          <CalisButton
            variant="ghost"
            label="KEEP CURRENT"
            accessibilityLabel="Keep current"
            disabled={starting}
            onPress={() => startWorkout({ [single.currentId]: 'keep' })}
          />
          <CalisButton
            label="LEVEL UP →"
            accessibilityLabel="Level up"
            disabled={starting}
            onPress={() => startWorkout({ [single.currentId]: 'level-up' })}
          />
        </View>
      ) : (
        <CalisButton
          label="START WORKOUT →"
          accessibilityLabel="Start workout"
          disabled={starting}
          onPress={() => {
            startWorkout();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Calis.color.background,
    paddingHorizontal: Calis.space.xl,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  eyebrow: {
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  stepLabel: {
    textAlign: 'center',
    marginBottom: 8,
  },
  currentName: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 28,
  },
  card: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 28,
  },
  nextName: {
    textAlign: 'center',
  },
  list: {
    gap: Calis.space.md,
  },
  offerFrom: {
    fontSize: 18,
    fontWeight: '600',
    color: Calis.color.primary,
  },
  offerArrow: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '500',
    color: Calis.color.secondary,
    marginBottom: 16,
  },
  offerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Calis.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Calis.color.background,
  },
  choiceSelected: {
    backgroundColor: Calis.color.border,
  },
  choicePrimary: {
    backgroundColor: Calis.color.primary,
  },
  choicePrimarySelected: {
    opacity: 0.92,
  },
  choiceLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Calis.color.secondary,
  },
  choiceLabelSelected: {
    color: Calis.color.primary,
  },
  choicePrimaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Calis.color.onPrimary,
  },
  choicePrimaryLabelSelected: {
    color: Calis.color.onPrimary,
  },
  actions: {
    gap: 8,
    paddingTop: Calis.cta.paddingTop,
  },
  pressed: {
    opacity: 0.85,
  },
});
