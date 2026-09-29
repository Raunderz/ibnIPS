import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LogIn, Navigation, ShieldCheck } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authenticate } from '../api/auth.js'
import { saveAuthSession } from '../services/authSession.js'
import { useBackendStatus } from '../hooks/useBackendStatus.js'
import { getSafeReturnTo } from '../utils/routes.js'
import { getEmailError, normalizeEmail } from '../utils/validation.js'
import { haptics } from '../utils/haptics.js'
import { radius, spacing, typography, useTheme } from '../theme/index.js'
import { BackendStatusChip } from '../components/BackendStatusChip.jsx'
import { Button } from '../components/Button.jsx'
import { TextField } from '../components/TextField.jsx'

export default function LoginScreen() {
  const theme = useTheme()
  const router = useRouter()
  const params = useLocalSearchParams()
  const backend = useBackendStatus()

  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)

  const emailError = touched ? getEmailError(email) : null

  const mutation = useMutation({
    mutationFn: (value) => authenticate(value),
    onSuccess: ({ token, userId }) => {
      haptics.success()
      saveAuthSession(token, userId)
      router.replace(getSafeReturnTo(params.returnTo, '/'))
    },
    onError: () => {
      haptics.error()
    },
  })

  const submit = () => {
    setTouched(true)

    if (getEmailError(email)) {
      return
    }

    mutation.mutate(normalizeEmail(email))
  }

  const serverMessage =
    mutation.error?.details ?? mutation.error?.message ?? null

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={[styles.mark, { backgroundColor: theme.primary }]}>
              <Navigation size={28} color={theme.onPrimary} strokeWidth={2.5} />
            </View>
            <Text style={[typography.display, styles.title, { color: theme.text }]}>
              ibnIPS
            </Text>
            <Text
              style={[typography.body, styles.tagline, { color: theme.textMuted }]}
            >
              Indoor wayfinding across campus, powered by ambient Wi-Fi.
            </Text>
          </View>

          <View style={styles.form}>
            <TextField
              testID="email-input"
              label="KIIT email"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={submit}
              returnKeyType="go"
              placeholder="23b1234@kiit.ac.in"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              error={emailError}
              hint="Your roll number before the @ becomes your user id."
            />

            {serverMessage ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: theme.dangerSoft,
                    borderColor: theme.danger,
                  },
                ]}
              >
                <ShieldCheck size={16} color={theme.danger} />
                <Text style={[typography.caption, styles.errorText, { color: theme.danger }]}>
                  {serverMessage}
                </Text>
              </View>
            ) : null}

            <Button
              testID="sign-in-button"
              label="Sign in"
              icon={LogIn}
              size="lg"
              loading={mutation.isPending}
              onPress={submit}
            />

            <Text
              style={[typography.caption, styles.footnote, { color: theme.textSubtle }]}
            >
              Signing in registers a 24 hour session with the ibnIPS backend. The
              backend has no sign-out endpoint, so signing out here only clears the
              token on this device.
            </Text>
          </View>

          <View style={styles.footer}>
            <BackendStatusChip
              state={backend.state}
              baseUrl={backend.baseUrl}
              onPress={() => router.push('/server')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  mark: {
    width: 68,
    height: 68,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    letterSpacing: -0.5,
  },
  tagline: {
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  form: {
    gap: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  errorText: {
    flex: 1,
  },
  footnote: {
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
  },
})
