import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { radius, spacing, typography, useTheme } from '../theme/index.js'

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  autoCapitalize = 'none',
  keyboardType = 'default',
  autoComplete,
  textContentType,
  secureTextEntry,
  onSubmitEditing,
  returnKeyType,
  testID,
  right = null,
  ...rest
}) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)

  const borderColor = error
    ? theme.danger
    : focused
      ? theme.primary
      : theme.border

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[typography.caption, styles.label, { color: theme.textMuted }]}>
          {label}
        </Text>
      ) : null}

      <View style={styles.field}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSubtle}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          textContentType={textContentType}
          secureTextEntry={secureTextEntry}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            typography.body,
            {
              backgroundColor: theme.surface,
              borderColor,
              color: theme.text,
              paddingRight: right ? spacing.xxl + spacing.lg : spacing.lg,
            },
          ]}
          {...rest}
        />

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>

      {error ? (
        <Text style={[typography.caption, styles.helper, { color: theme.danger }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[typography.caption, styles.helper, { color: theme.textMuted }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    marginLeft: spacing.xs,
  },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
  },
  field: {
    position: 'relative',
    justifyContent: 'center',
  },
  right: {
    position: 'absolute',
    right: spacing.md,
  },
  helper: {
    marginLeft: spacing.xs,
  },
})
