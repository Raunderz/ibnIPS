// ICPS/screens/DebugScreen.tsx

import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { useMockMode } from '../hooks/useMockMode';
import { useToast } from '../hooks/useToast';
import { resetAllData } from '../services/storageService';
import { colors } from '../utils/colors';
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

export default function DebugScreen() {
  const navigation = useNavigation<any>();
  const { isMockMode, toggleMockMode, injectScenario } = useMockMode();
  const { toast, showToast } = useToast();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleInject = (id: MockScenario['id'], label: string) => {
    injectScenario(id);
    showToast(`Injected: ${label.replace('Inject: ', '')} data`, 'success');
  };

  const handleResetPress = () => {
    Alert.alert('Clear all app data?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await resetAllData();
          navigation.navigate('Onboarding');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeader}>TESTING</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Mock Mode</Text>
              <Text style={styles.helperText}>Use test data instead of live data</Text>
            </View>
            <Switch value={isMockMode} onValueChange={toggleMockMode} />
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

        <Text style={styles.sectionHeader}>ABOUT</Text>
        <View style={styles.card}>
          <Text style={styles.aboutText}>App Version: {APP_VERSION}</Text>
          <Text style={styles.aboutText}>Build Date: {BUILD_DATE}</Text>
        </View>

        <View style={{ height: spacing.componentSpacingVertical * 2 }} />
        <Button label="Reset All Data" onPress={handleResetPress} variant="danger" />

        <View style={{ height: spacing.componentSpacingVertical }} />
        <Button
          label="Onboarding Tutorial"
          onPress={() => navigation.navigate('Onboarding')}
          variant="secondary"
        />
      </ScrollView>

      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screenPaddingHorizontal, paddingVertical: 16 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.componentSpacingVertical * 1.5,
    marginBottom: 8,
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.shapeMedium, // MD3 Medium (12dp)
    padding: spacing.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1, // MD3 Elevated/Filled card style
  },
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
});