import { Component, useEffect, useState, useSyncExternalStore } from 'react'
import { StyleSheet, Text, useColorScheme, View } from 'react-native'
import * as ExpoSplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient.js'
import {
  getApiBaseUrl,
  hydrateApiConfig,
  subscribeToApiConfig,
} from '../api/runtimeConfig.js'
import { PositionProvider } from '../positioning/PositionProvider.jsx'
import { useTheme } from '../theme/index.js'
import {SplashScreen} from '../components/SplashScreen.jsx'

/**
 * Restores the backend address before the first render, so screens never flash
 * before the async storage read resolves. Authentication is no longer required;
 * users enter the app directly.
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

    void hydrateApiConfig().finally(() => {
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
    return <SplashScreen message="Starting ibnIPS" />
  }

  return children
}

/**
 * Pass-through gate: authentication is disabled, so children render immediately.
 */
function AuthGate({ children }) {
  return children
}

class RootErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text>{String(this.state.error?.message ?? this.state.error)}</Text>
        </View>
      )
    }
    return this.props.children
  }
}

function RootLayout() {
  const theme = useTheme()
  const isDark = useColorScheme() === 'dark'

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {})
  }, [])

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

export default function RootLayoutWithErrorBoundary(props) {
  return (
    <RootErrorBoundary>
      <RootLayout {...props} />
    </RootErrorBoundary>
  )
}
