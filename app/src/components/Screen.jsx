import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/index.js'

export function Screen({ children, style, edges = ['top'], ...rest }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const padding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  }

  return (
    <View
      {...rest}
      style={[styles.root, { backgroundColor: theme.background }, padding, style]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
