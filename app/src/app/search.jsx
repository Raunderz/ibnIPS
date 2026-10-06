import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Search, SearchX, X } from 'lucide-react-native'
import { usePosition } from '../positioning/PositionProvider.jsx'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import { searchNodes } from '../utils/searchNodes.js'
import { getFloorLabel } from '../utils/location.js'
import { haptics } from '../utils/haptics.js'
import { spacing, typography, useTheme } from '../theme/index.js'
import { EmptyState } from '../components/EmptyState.jsx'
import { NodeRow } from '../components/NodeRow.jsx'
import { TextField } from '../components/TextField.jsx'

const PURPOSE_TITLES = {
  destination: 'Choose a destination',
  source: 'Choose your starting room',
  browse: 'Find a room',
}

export default function SearchScreen() {
  const theme = useTheme()
  const router = useRouter()
  const params = useLocalSearchParams()
  const position = usePosition()

  const purpose =
    typeof params.purpose === 'string' ? params.purpose : 'browse'
  const from = typeof params.from === 'string' ? params.from : null

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 200)

  const nodes = useMemo(() => position.catalog?.nodes ?? [], [position.catalog])
  const results = useMemo(
    () => searchNodes(nodes, debouncedQuery),
    [debouncedQuery, nodes],
  )

  const handleSelect = (node) => {
    haptics.selection()

    if (purpose === 'destination') {
      router.replace(`/navigate?${from ? `from=${from}&` : ''}to=${node.nodeId}`)
      return
    }

    if (purpose === 'source') {
      router.replace(`/navigate?from=${node.nodeId}`)
      return
    }

    router.replace(`/map?node=${node.nodeId}`)
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[typography.title, { color: theme.text }]}>
            {PURPOSE_TITLES[purpose] ?? PURPOSE_TITLES.browse}
          </Text>
          <Text style={[typography.caption, { color: theme.textMuted }]}>
            {nodes.length} rooms indexed
          </Text>
        </View>

        <Text
          accessibilityRole="button"
          onPress={() => {
            haptics.light()
            router.back()
          }}
          style={[typography.bodyStrong, styles.cancel, { color: theme.primary }]}
        >
          Cancel
        </Text>
      </View>

      <View style={styles.field}>
        <TextField
          testID="search-input"
          value={query}
          onChangeText={setQuery}
          placeholder="Search by room, e.g. 3C-157"
          autoFocus
          returnKeyType="search"
          autoComplete="off"
          right={
            query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => {
                  haptics.light()
                  setQuery('')
                }}
                style={({ pressed }) => [
                  styles.clear,
                  { backgroundColor: pressed ? theme.surfaceMuted : 'transparent' },
                ]}
              >
                <X size={16} color={theme.textSubtle} />
              </Pressable>
            ) : null
          }
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(node) => node.nodeId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={debouncedQuery ? SearchX : Search}
            title={debouncedQuery ? 'No rooms match' : 'Start typing'}
            message={
              debouncedQuery
                ? `Nothing matches "${debouncedQuery}". Try a shorter room number such as 157.`
                : 'Search by room name or number to jump straight to it.'
            }
          />
        }
        renderItem={({ item }) => (
          <NodeRow
            node={item}
            meta={getFloorLabel(item.floor)}
            onPress={handleSelect}
          />
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  cancel: {
    paddingVertical: spacing.sm,
  },
  field: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md + 18 + spacing.md,
  },
  clear: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
