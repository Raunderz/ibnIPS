import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { radius, spacing, typography, useTheme } from '../theme/index.js'
import { haptics } from '../utils/haptics.js'

const VARIANTS = {
  primary: { background: 'primary', pressed: 'primaryPressed', text: 'onPrimary', border: null },
  secondary: { background: 'surfaceMuted', pressed: 'surfaceMuted', text: 'text', border: 'border' },
  outline: { background: 'transparent', pressed: 'surfaceMuted', text: 'primary', border: 'primary' },
  danger: { background: 'danger', pressed: 'danger', text: 'onPrimary', border: null },
  ghost: { background: 'transparent', pressed: 'surfaceMuted', text: 'textMuted', border: null },
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  loading = false,
  style,
  testID,
}) {
  const theme = useTheme()
  const tokens = VARIANTS[variant] ?? VARIANTS.primary
  const isDisabled = disabled || loading

  const height = size === 'lg' ? 54 : size === 'sm' ? 38 : 46
  const textStyle =
    size === 'lg' ? typography.heading : size === 'sm' ? typography.caption : typography.bodyStrong

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={() => {
        haptics.light()
        onPress?.()
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: pressed ? theme[tokens.pressed] : theme[tokens.background],
          borderColor: tokens.border ? theme[tokens.border] : 'transparent',
          borderWidth: tokens.border ? StyleSheet.hairlineWidth * 2 : 0,
          opacity: isDisabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme[tokens.text]} size="small" />
      ) : (
        <View style={styles.content}>
          {Icon ? <Icon size={18} color={theme[tokens.text]} /> : null}
          <Text
            numberOfLines={1}
            style={[textStyle, { color: theme[tokens.text] }]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
})
