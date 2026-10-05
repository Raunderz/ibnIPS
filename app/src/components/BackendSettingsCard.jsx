import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { KeyRound, RefreshCw, RotateCcw, Save, Server } from 'lucide-react-native'
import { useBackendStatus } from '../hooks/useBackendStatus.js'
import {
  clearApiAccessKeyOverride,
  clearApiBaseUrlOverride,
  getApiAccessKey,
  getApiBaseUrlSource,
  setApiAccessKeyOverride,
  setApiBaseUrlOverride,
} from '../api/runtimeConfig.js'
import { haptics } from '../utils/haptics.js'
import { spacing, typography, useTheme } from '../theme/index.js'
import { Badge } from './Badge.jsx'
import { Button } from './Button.jsx'
import { Card } from './Card.jsx'
import { TextField } from './TextField.jsx'

/** Shows only the tail, so a pasted key is never readable in full. */
function maskAccessKey(value) {
  if (!value) {
    return ''
  }

  return value.length <= 4 ? '••••' : `${'•'.repeat(8)}${value.slice(-4)}`
}

/**
 * Editor for the backend address and access key.
 *
 * It lives in a component rather than a screen so the signed-out login screen
 * and the signed-in Account tab can both offer it, which matters because the
 * app has to be pointed at a laptop on the LAN before there is any session.
 *
 * `showAddress` is off by default. The Account tab hides it because the server
 * address is an implementation detail of the build with nothing a signed-in user
 * can do about it; the pre-login /server screen turns it on, since that is the
 * one place where pointing the app at a laptop is the whole point.
 */
export function BackendSettingsCard({ showAddress = false }) {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const backend = useBackendStatus()

  const [draftUrl, setDraftUrl] = useState(backend.baseUrl)
  const [draftKey, setDraftKey] = useState(getApiAccessKey())
  const [saveError, setSaveError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [syncedBaseUrl, setSyncedBaseUrl] = useState(backend.baseUrl)

  // Re-point the fields when the live values change underneath us, such as
  // after a reset. Adjusting during render avoids a second render pass.
  if (syncedBaseUrl !== backend.baseUrl) {
    setSyncedBaseUrl(backend.baseUrl)
    setDraftUrl(backend.baseUrl)
    setDraftKey(getApiAccessKey())
    setSaveError(null)
  }

  const source = getApiBaseUrlSource()
  const isModified =
    draftUrl.trim() !== backend.baseUrl || draftKey.trim() !== getApiAccessKey()

  const saveBackend = async () => {
    setSaveError(null)
    setIsSaving(true)

    try {
      if (showAddress && draftUrl.trim() !== backend.baseUrl) {
        await setApiBaseUrlOverride(draftUrl)
      }

      if (draftKey.trim() !== getApiAccessKey()) {
        await setApiAccessKeyOverride(draftKey)
      }

      haptics.success()
      queryClient.clear()
    } catch (error) {
      setSaveError(error?.message ?? 'Those settings could not be saved.')
      haptics.error()
    } finally {
      setIsSaving(false)
    }
  }

  const resetBackend = async () => {
    setSaveError(null)
    setIsSaving(true)

    try {
      if (showAddress) {
        await clearApiBaseUrlOverride()
      }

      await clearApiAccessKeyOverride()
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

      {getApiAccessKey() ? (
        <View style={styles.row}>
          <KeyRound size={17} color={theme.textSubtle} />
          <Text style={[typography.body, styles.rowText, { color: theme.text }]}>
            Access key {maskAccessKey(getApiAccessKey())}
          </Text>
          <Badge label="set" tone="success" />
        </View>
      ) : (
        <View style={styles.row}>
          <KeyRound size={17} color={theme.danger} />
          <Text style={[typography.body, styles.rowText, { color: theme.text }]}>
            No access key set
          </Text>
          <Badge label="needed" tone="warning" />
        </View>
      )}

      {showAddress ? (
        <TextField
          label="Backend address"
          value={draftUrl}
          onChangeText={setDraftUrl}
          placeholder="http://192.168.1.10:3000"
          keyboardType="url"
          autoCapitalize="none"
          autoComplete="off"
          hint={`Currently using the ${
            source === 'override'
              ? 'saved address'
              : source === 'env'
                ? 'build default'
                : 'bundled default'
          }. To test a phone against your laptop, use your laptop's LAN address on port 3000.`}
        />
      ) : null}

      <TextField
        label="Access key"
        value={draftKey}
        onChangeText={setDraftKey}
        placeholder="AUTH_KEY from the server"
        autoCapitalize="none"
        autoComplete="off"
        secureTextEntry={draftKey.length > 0}
        error={saveError}
        hint={
          getApiAccessKey()
            ? `Signing in with ${maskAccessKey(getApiAccessKey())}. The server needs this key on every sign-in.`
            : 'Required to sign in. Copy AUTH_KEY from the ibnIPS server. It is stored on this device only.'
        }
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
