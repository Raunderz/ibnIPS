import { Compass, MapPinned, SearchX, ServerOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DestinationSheet from '../components/DestinationSheet.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LocationResultRow from '../components/LocationResultRow.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SearchField from '../components/SearchField.jsx'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import { useLocationCatalog } from '../hooks/useLocationCatalog.js'
import { useRecentDestinations } from '../hooks/useRecentDestinations.js'
import { getLocationCountLabel } from '../utils/location.js'
import { searchNodes } from '../utils/searchNodes.js'

const RECENT_LIMIT = 6
const EMPTY_NODES = []
const skeletonRows = [0, 1, 2, 3, 4, 5]

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [queryDraft, setQueryDraft] = useState(searchParams.get('q') ?? '')
  const debouncedQuery = useDebouncedValue(queryDraft, 140)
  const inputRef = useRef(null)
  const catalogQuery = useLocationCatalog()
  const { items: recentItems } = useRecentDestinations()

  const catalog = catalogQuery.data
  const nodes = useMemo(() => catalog?.nodes ?? EMPTY_NODES, [catalog])
  const isPartial = catalog?.isPartial ?? false
  const selectedId = searchParams.get('node')
  const results = useMemo(
    () => searchNodes(nodes, debouncedQuery),
    [nodes, debouncedQuery],
  )
  const knownIds = useMemo(
    () => new Set(nodes.map((node) => node.nodeId)),
    [nodes],
  )
  const recents = useMemo(
    () =>
      (knownIds.size > 0
        ? recentItems.filter((item) => knownIds.has(item.nodeId))
        : recentItems
      ).slice(0, RECENT_LIMIT),
    [recentItems, knownIds],
  )
  const selectedNode = useMemo(
    () => nodes.find((node) => node.nodeId === selectedId) ?? null,
    [nodes, selectedId],
  )

  useEffect(() => {
    const currentQuery = searchParams.get('q') ?? ''

    if (debouncedQuery === currentQuery) {
      return
    }

    const next = new URLSearchParams(searchParams)

    if (debouncedQuery) {
      next.set('q', debouncedQuery)
    } else {
      next.delete('q')
    }

    setSearchParams(next, { replace: true })
  }, [debouncedQuery, searchParams, setSearchParams])

  const selectNode = useCallback(
    (node) => {
      const next = new URLSearchParams(searchParams)

      if (node) {
        next.set('node', node.nodeId)
      } else {
        next.delete('node')
      }

      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const closeSheet = useCallback(() => selectNode(null), [selectNode])

  function handleKeyDown(event) {
    if (event.key === 'Enter' && results.length > 0) {
      event.preventDefault()
      selectNode(results[0])
      return
    }

    if (event.key === 'Escape' && queryDraft) {
      setQueryDraft('')
    }
  }

  const isSearching = queryDraft.trim().length > 0
  const resultLabel = isSearching && results.length > 0

  return (
    <div className="app-canvas screen-fill flex flex-col text-slate-100">
      <ScreenHeader
        title="Search"
        subtitle={
          catalogQuery.data
            ? `${getLocationCountLabel(nodes.length)} from the campus map`
            : 'Loading campus data'
        }
      />

      <div className="screen-scroll flex-1 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <SearchField
          value={queryDraft}
          onChange={setQueryDraft}
          onClear={() => {
            setQueryDraft('')
            inputRef.current?.focus()
          }}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          autoFocus
          resultLabel={resultLabel}
        />

        {isPartial ? (
          <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-3 py-2.5 text-xs leading-5 text-amber-100">
            Some campus sources did not respond, so results may be incomplete.
          </p>
        ) : null}

        <div className="mt-4">
          {catalogQuery.isPending ? (
            <ul className="space-y-2" aria-hidden="true">
              {skeletonRows.map((row) => (
                <li key={row} className="h-16 animate-pulse rounded-2xl bg-ink-850" />
              ))}
            </ul>
          ) : catalogQuery.isError ? (
            <EmptyState
              icon={ServerOff}
              tone="danger"
              title="Campus data unavailable"
              description={catalogQuery.error.message}
              action={
                <button
                  type="button"
                  onClick={() => catalogQuery.refetch()}
                  className="inline-flex min-h-11 items-center rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white active:bg-white/10"
                >
                  Try again
                </button>
              }
            />
          ) : nodes.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="No campus locations published"
              description="The backend returned an empty location list, so there is nothing to search yet."
              action={
                <button
                  type="button"
                  onClick={() => catalogQuery.refetch()}
                  className="inline-flex min-h-11 items-center rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white active:bg-white/10"
                >
                  Refresh
                </button>
              }
            />
          ) : isSearching ? (
            results.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title={`No matches for “${queryDraft.trim()}”`}
                description="Try a shorter part of the room, building, or node name."
                action={
                  <button
                    type="button"
                    onClick={() => setQueryDraft('')}
                    className="inline-flex min-h-11 items-center rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white active:bg-white/10"
                  >
                    Clear search
                  </button>
                }
              />
            ) : (
              <>
                <p
                  id="search-result-count"
                  aria-live="polite"
                  className="px-1 text-xs font-semibold text-slate-500"
                >
                  {results.length} match{results.length === 1 ? '' : 'es'}
                </p>
                <ul className="mt-2 space-y-2">
                  {results.map((node) => (
                    <LocationResultRow
                      key={node.nodeId}
                      node={node}
                      isSelected={node.nodeId === selectedId}
                      onSelect={selectNode}
                    />
                  ))}
                </ul>
              </>
            )
          ) : recents.length > 0 ? (
            <section aria-labelledby="recent-search-heading">
              <h2
                id="recent-search-heading"
                className="px-1 text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase"
              >
                Recent destinations
              </h2>
              <ul className="mt-2 space-y-2">
                {recents.map((node) => (
                  <LocationResultRow
                    key={node.nodeId}
                    node={node}
                    isSelected={node.nodeId === selectedId}
                    onSelect={selectNode}
                  />
                ))}
              </ul>
            </section>
          ) : (
            <EmptyState
              icon={Compass}
              title="Search for a destination"
              description="Type a room, building, or node name. Matching is case-insensitive and partial names work."
              action={
                <Link
                  to="/map"
                  className="inline-flex min-h-11 items-center rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white active:bg-white/10"
                >
                  Browse the map instead
                </Link>
              }
            />
          )}
        </div>
      </div>

      <DestinationSheet node={selectedNode} onClose={closeSheet} />
    </div>
  )
}
