import { queryClient } from '../api/queryClient.js'

/**
 * Refresh everything the app has cached.
 *
 * This is the "overall" refresh: every query, active or not, is refetched so a
 * page the user has not opened yet also picks up new campus data. It never
 * throws, because a failing request here must not take down the screen that
 * asked for the refresh.
 */
export async function refreshAllData() {
  try {
    await queryClient.resumePausedMutations()
  } catch {
  }

  try {
    await queryClient.refetchQueries(
      { type: 'all' },
      { throwOnError: false, cancelRefetch: true },
    )
  } catch {
  }
}

/**
 * Drop cached queries and start them again from scratch. Useful when the
 * backend answered with something unusable and the old value is poisoning the
 * screen.
 */
export async function resetAndRefresh() {
  try {
    await queryClient.invalidateQueries({ type: 'all', refetchType: 'all' })
  } catch {
  }
}

/**
 * Reload the whole app. Used by the crash screens and the global control when
 * cached state is what keeps breaking.
 */
export function reloadApp() {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

/**
 * Refresh if the browser says it is online, otherwise reload. A refresh while
 * offline cannot succeed, so the honest fallback is a full reload once the
 * connection is back.
 */
export function refreshOrReload() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return reloadApp()
  }

  return refreshAllData()
}