// ICPS/screens/OnboardingScreen.tsx

import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import { setHasSeenOnboarding } from '../services/storageService';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';

const SLIDES = [
  {
    title: 'Welcome to ICPS',
    body: 'Navigate your campus indoors with real-time position tracking.',
  },
  {
    title: 'Understanding the Map',
    body: 'Blue pin = Your location. Tap floor buttons to navigate.',
  },
  {
    title: 'Help Us Improve Accuracy',
    body: 'Tap "Tag Location" to tell us where you are. This helps other users get better results.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);
  const isLast = index === SLIDES.length - 1;
  const isFirst = index === 0;

  const finish = async () => {
    await setHasSeenOnboarding(true);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button label="Skip" onPress={finish} variant="secondary" />

      <View style={styles.slide}>
        <Text style={styles.title}>{SLIDES[index].title}</Text>
        <View style={styles.illustrationPlaceholder} />
        <Text style={styles.body}>{SLIDES[index].body}</Text>
      </View>

      <View style={styles.navRow}>
        {!isFirst && (
          <Button label="← Back" onPress={() => setIndex((i) => i - 1)} variant="secondary" />
        )}
        <View style={{ width: spacing.componentSpacingVertical }} />
        <Button
          label={isLast ? 'Done ✓' : 'Next →'}
          onPress={isLast ? finish : () => setIndex((i) => i + 1)}
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screenPaddingHorizontal,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  illustrationPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: spacing.shapeLarge, // MD3 Large Shape (16dp)
    backgroundColor: colors.surfaceContainer,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  body: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});