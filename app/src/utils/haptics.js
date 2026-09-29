import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android'

export const haptics = {
  selection() {
    if (isSupported) {
      void Haptics.selectionAsync()
    }
  },
  light() {
    if (isSupported) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  },
  medium() {
    if (isSupported) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
  },
  success() {
    if (isSupported) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  },
  warning() {
    if (isSupported) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }
  },
  error() {
    if (isSupported) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  },
}
