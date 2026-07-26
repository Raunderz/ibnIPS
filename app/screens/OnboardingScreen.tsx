// ICPS/screens/OnboardingScreen.tsx

import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button from '../components/Button';
import { setHasSeenOnboarding } from '../services/storageService';
import { colors } from '../utils/colors';
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
  const navigation = useNavigation<any>();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const isFirst = index === 0;

  const finish = async () => {
    await setHasSeenOnboarding(true);
    navigation.replace('Map');
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screenPaddingHorizontal,
    justifyContent: 'space-between',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  illustrationPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: colors.secondaryButtonBg,
    marginBottom: 24,
  },
  body: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});