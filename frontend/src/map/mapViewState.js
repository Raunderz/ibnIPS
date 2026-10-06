export const MAP_STATES = {
  loading: 'loading',
  error: 'error',
  empty: 'empty',
  ready: 'ready',
}

export function getMapViewState({ isPending = false, isError = false, nodeCount = 0 } = {}) {
  if (isPending) {
    return MAP_STATES.loading
  }

  if (isError) {
    return MAP_STATES.error
  }

  if (!nodeCount) {
    return MAP_STATES.empty
  }

  return MAP_STATES.ready
}

export function getDirectionLabel(direction) {
  return direction ? `head ${direction}` : 'continue straight'
}
