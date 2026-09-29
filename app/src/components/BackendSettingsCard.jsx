import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw, RotateCcw, Save, Server } from 'lucide-react-native'
import { useBackendStatus } from '../hooks/useBackendStatus.js'
import {
  clearApiBaseUrlOverride,
  getApiBaseUrlSource,
  setApiBaseUrlOverride,
} from '../api/runtimeConfig.js'
import { haptics } from '../utils/haptics.js'
import { spacing, typography, useTheme } from '../theme/index.js'
import { Badge } from './Badge.jsx'
import { Button } from './Button.jsx'
import { Card } from './Card.jsx'
import { TextField } from './TextField.jsx'

/**
 * Editor for the backend address.
 *
 * It lives in a component rather than a screen so the signed-out login screen
 * and the signed-in Account tab can both offer it, which matters because the
 * app has to be pointed at a laptop on the LAN before there is any session.
 */
export function BackendSettingsCard() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const backend = useBackendStatus()

  const [draftUrl, setDraftUrl] = useState(backend.baseUrl)
  const [saveError, setSaveError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [syncedBaseUrl, setSyncedBaseUrl] = useState(backend.baseUrl)

  // Re-point the field when the live address changes underneath us, such as
  // after a reset. Adjusting during render avoids a second render pass.
  if (syncedBaseUrl !== backend.baseUrl) {
    setSyncedBaseUrl(backend.baseUrl)
    setDraftUrl(backend.baseUrl)
    setSaveError(null)
  }

  const source = getApiBaseUrlSource()
  const isModified = draftUrl.trim() !== backend.baseUrl

  const saveBackend = async () => {
    setSaveError(null)
    setIsSaving(true)

    try {
      await setApiBaseUrlOverride(draftUrl)
      haptics.success()
      queryClient.clear()
    } catch (error) {
      setSaveError(error?.message ?? 'That address could not be saved.')
      haptics.error()
    } finally {
      setIsSaving(false)
    }
  }

  const resetBackend = async () => {
    setSaveError(null)
    setIsSaving(true)

    try {
      await clearApiBaseUrlOverride()
      haptics.success()
      queryClient.clear()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Server size={17} color={theme.textSubtle} />
        <Text style={[typography.body, styles.rowText, { color: theme.text }]}>
          {backend.state === 'online'
            ? (backend.health ?? 'Connected')
            : backend.state === 'checking'
              ? 'Checking connection'
              : 'Not reachable'}
        </Text>
        <Badge
          label={backend.state}
          tone={
            backend.state === 'online'
              ? 'success'
              : backend.state === 'checking'
                ? 'neutral'
                : 'danger'
          }
        />
      </View>

      <TextField
        label="Backend address"
        value={draftUrl}
        onChangeText={setDraftUrl}
        placeholder="http://192.168.1.10:3000"
        keyboardType="url"
        autoCapitalize="none"
        autoComplete="off"
        error={saveError}
        hint={`Currently using the ${
          source === 'override'
            ? 'saved address'
            : source === 'env'
              ? 'build default'
              : 'bundled default'
        }. To test a phone against your laptop, use your laptop's LAN address on port 3000.`}
      />

      <View style={styles.buttons}>
        <Button
          label="Save and reload"
          icon={Save}
          size="sm"
          loading={isSaving}
          disabled={!isModified}
          onPress={() => {
            void saveBackend()
          }}
          style={styles.grow}
        />
        <Button
          label="Reset"
          icon={RotateCcw}
          variant="secondary"
          size="sm"
          loading={isSaving}
          onPress={() => {
            void resetBackend()
          }}
        />
      </View>

      <Button
        label="Test connection"
        icon={RefreshCw}
        variant="ghost"
        size="sm"
        loading={backend.isRefetching}
        onPress={() => {
          void backend.refetch()
        }}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
})
