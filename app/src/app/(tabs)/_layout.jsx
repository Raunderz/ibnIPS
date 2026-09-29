import { Tabs } from 'expo-router'
import { CircleUser, Map, Navigation, Radar } from 'lucide-react-native'
import { Platform } from 'react-native'
import { useTheme } from '../../theme/index.js'

export default function TabsLayout() {
  const theme = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSubtle,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 62,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        sceneStyle: {
          backgroundColor: theme.background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Radar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="navigate"
        options={{
          title: 'Navigate',
          tabBarIcon: ({ color, size }) => <Navigation color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <CircleUser color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
