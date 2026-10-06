import { Tabs } from 'expo-router'
import { CircleUser, Map, Navigation, Radar } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/index.js'

const BASE_TAB_BAR_HEIGHT = 62
const BASE_TAB_BAR_PADDING_BOTTOM = 8

export default function TabsLayout() {
  const theme = useTheme()
  // Android's system navigation bar (back / home / recents, or the gesture
  // pill) is drawn over the app window. Without this inset the tab bar sits at
  // the very bottom of the window and its labels land underneath those buttons.
  const insets = useSafeAreaInsets()
  const bottomInset = insets.bottom

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
          height: BASE_TAB_BAR_HEIGHT + bottomInset,
          paddingTop: 6,
          paddingBottom: BASE_TAB_BAR_PADDING_BOTTOM + bottomInset,
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
