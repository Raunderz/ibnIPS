// ICPS/screens/DebugScreen.tsx
// Settings page — theme-aware with colorful section accents.

import React from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { useMockMode } from '../hooks/useMockMode';
import { useToast } from '../hooks/useToast';
import { resetAllData } from '../services/storageService';
import {
  useThemeColors,
  ThemeColors,
  useAccentKey,
  setAccentKey,
  ACCENT_KEYS,
  AccentKey,
} from '../utils/colors';
import { spacing } from '../utils/spacing';
import { APP_VERSION, BUILD_DATE } from '../utils/constants';
import { MockScenario } from '../types';

const SCENARIO_BUTTONS: { id: MockScenario['id']; label: string }[] = [
  { id: 'ground', label: 'Inject: Ground Floor' },
  { id: 'lab_201', label: 'Inject: Lab 201' },
  { id: 'hall_1f', label: 'Inject: Hall 1F' },
  { id: 'physics', label: 'Inject: Physics' },
  { id: 'edge_case', label: 'Inject: Edge Case' },
];

const ACCENT_LABELS: Record<AccentKey, string> = {
  purple: 'Purple',
  pink: 'Pink',
  teal: 'Teal',
  orange: 'Orange',
  blue: 'Blue',
  green: 'Green',
  cyan: 'Cyan',
  indigo: 'Indigo',
  red: 'Red',
  amber: 'Amber',
};

export default function DebugScreen() {
  const router = useRouter();
  const { isMockMode, toggleMockMode, injectScenario } = useMockMode();
  const { toast, showToast } = useToast();
  const themeColors = useThemeColors();
  const accentKey = useAccentKey();
  const styles = getStyles(themeColors);

  const handleInject = (id: MockScenario['id'], label: string) => {
    injectScenario(id);
    showToast(`Injected: ${label.replace('Inject: ', '')} data`, 'success');
  };

  const handleSelectAccent = (key: AccentKey) => {
    setAccentKey(key);
    showToast(`Theme color: ${ACCENT_LABELS[key]}`, 'success');
  };

  const handleResetPress = () => {
    Alert.alert('Clear all app data?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await resetAllData();
          router.push('/onboarding');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionHeader, { color: themeColors.teal }]}>TESTING</Text>
        <View style={[styles.card, styles.cardTesting]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Mock Mode</Text>
              <Text style={styles.helperText}>Use test data instead of live data</Text>
            </View>
            <Switch
              value={isMockMode}
              onValueChange={toggleMockMode}
              trackColor={{ true: themeColors.primary }}
            />
          </View>
        </View>

        {isMockMode && (
          <View style={styles.scenarioGrid}>
            {SCENARIO_BUTTONS.map((scenario) => (
              <View key={scenario.id} style={styles.scenarioButtonWrapper}>
                <Button
                  label={scenario.label}
                  onPress={() => handleInject(scenario.id, scenario.label)}
                  variant="secondary"
                />
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionHeader, { color: themeColors.primary }]}>THEME COLORS</Text>
        <View style={[styles.card, { borderLeftColor: themeColors.primary }]}>
          <Text style={styles.helperText}>Tap a color to change the app theme</Text>
          <View style={[styles.previewBanner, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.previewText}>
              Theme: {ACCENT_LABELS[accentKey]} — {accentKey.toUpperCase()}
            </Text>
          </View>
          <View style={styles.swatchRow}>
            {ACCENT_KEYS.map((key) => {
              const isSelected = accentKey === key;
              const swatchColor = themeColors[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => handleSelectAccent(key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Theme color: ${ACCENT_LABELS[key]}`}
                  accessibilityState={{ selected: isSelected }}
                  style={styles.swatchCell}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: swatchColor },
                      isSelected && styles.swatchSelected,
                    ]}
                  >
                    {isSelected ? (
                      <Text style={styles.swatchCheck}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.swatchLabel}>{ACCENT_LABELS[key]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: themeColors.indigo }]}>WIFI</Text>
        <View style={[styles.card, styles.cardIndigo]}>
          <Button
            label="Wi-Fi Networks"
            onPress={() => router.push('/wifi-debug')}
            variant="secondary"
          />
        </View>

        <Text style={[styles.sectionHeader, { color: themeColors.pink }]}>ABOUT</Text>
        <View style={[styles.card, styles.cardPink]}>
          <Text style={styles.aboutText}>App Version: {APP_VERSION}</Text>
          <Text style={styles.aboutText}>Build Date: {BUILD_DATE}</Text>
        </View>

        <Text style={[styles.sectionHeader, { color: themeColors.red }]}>DANGER ZONE</Text>
        <View style={[styles.card, styles.cardRed]}>
          <Button label="Reset All Data" onPress={handleResetPress} variant="danger" />
          <View style={{ height: spacing.componentSpacingVertical }} />
          <Button
            label="Onboarding Tutorial"
            onPress={() => router.push('/onboarding')}
            variant="secondary"
          />
        </View>
      </ScrollView>

      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.screenPaddingHorizontal, paddingVertical: 16 },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      marginTop: spacing.componentSpacingVertical * 1.5,
      marginBottom: 8,
      paddingLeft: 4,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: spacing.shapeMedium,
      padding: spacing.cardPadding,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 1,
      borderLeftWidth: 4,
    },
    cardTesting: { borderLeftColor: colors.teal },
    cardBlue: { borderLeftColor: colors.blue },
    cardIndigo: { borderLeftColor: colors.indigo },
    cardPink: { borderLeftColor: colors.pink },
    cardRed: { borderLeftColor: colors.red },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    toggleLabel: { fontSize: 16, fontWeight: '600', color: colors.onSurface },
    helperText: { fontSize: 14, color: colors.onSurfaceVariant, marginTop: 2 },
    scenarioGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.componentSpacingVertical,
      marginHorizontal: -4,
    },
    scenarioButtonWrapper: {
      width: '50%',
      padding: 4,
    },
    aboutText: { fontSize: 14, color: colors.onSurface, marginBottom: 6 },
    previewBanner: {
      marginTop: spacing.componentSpacingVertical,
      borderRadius: spacing.shapeMedium,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    previewText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.3,
      textShadowColor: 'rgba(0,0,0,0.25)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    swatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.componentSpacingVertical,
      marginHorizontal: -4,
    },
    swatchCell: {
      width: '20%',
      padding: 4,
      alignItems: 'center',
    },
    swatch: {
      width: '100%',
      height: 28,
      borderRadius: spacing.shapeSmall,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchSelected: {
      borderWidth: 2,
      borderColor: colors.onSurface,
    },
    swatchCheck: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    swatchLabel: {
      marginTop: 4,
      fontSize: 10,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
    },
  });
