import { useEffect, useState, useSyncExternalStore } from 'react'
import { StyleSheet, useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Redirect, Stack, usePathname } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient.js'
import {
  getApiBaseUrl,
  hydrateApiConfig,
  subscribeToApiConfig,
} from '../api/runtimeConfig.js'
import { hydrateAuthSession } from '../services/authSession.js'
import { useAuthSession } from '../hooks/useAuthSession.js'
import { PositionProvider } from '../positioning/PositionProvider.jsx'
import { useTheme } from '../theme/index.js'
import { SplashScreen } from '../components/SplashScreen.jsx'

const PUBLIC_ROUTES = new Set(['/login', '/server', '/+not-found'])

/**
 * Restores the persisted session and backend address before the first render,
 * so protected screens never flash before the async storage read resolves.
 */
function Bootstrap({ children }) {
  const [ready, setReady] = useState(false)
  const baseUrl = useSyncExternalStore(
    subscribeToApiConfig,
    getApiBaseUrl,
    getApiBaseUrl,
  )

  useEffect(() => {
    let active = true

    void Promise.all([hydrateAuthSession(), hydrateApiConfig()]).finally(() => {
      if (active) {
        setReady(true)
      }
    })

    return () => {
      active = false
    }
  }, [])

  // Switching backends must not leave the previous campus map in the cache.
  useEffect(() => {
    queryClient.clear()
  }, [baseUrl])

  if (!ready) {
    return <SplashScreen message="Restoring your session" />
  }

  return children
}

function AuthGate({ children }) {
  const { isAuthenticated, isHydrated } = useAuthSession()
  const pathname = usePathname()

  if (!isHydrated) {
    return <SplashScreen />
  }

  const isPublic = PUBLIC_ROUTES.has(pathname)

  if (!isAuthenticated && !isPublic) {
    return <Redirect href="/login" />
  }

  if (isAuthenticated && pathname === '/login') {
    return <Redirect href="/" />
  }

  return children
}

export default function RootLayout() {
  const theme = useTheme()
  const isDark = useColorScheme() === 'dark'

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Bootstrap>
            <AuthGate>
              <PositionProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.background },
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="login" options={{ animation: 'fade' }} />
                  <Stack.Screen
                    name="search"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen
                    name="server"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen name="+not-found" />
                </Stack>
              </PositionProvider>
            </AuthGate>
          </Bootstrap>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
