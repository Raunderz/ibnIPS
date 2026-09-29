const ENTRY_ROUTES = new Set(['/', '/login'])

/**
 * Guards `returnTo` values that arrive from a query string.
 *
 * Only same-origin, single-slash paths are accepted, so a crafted link cannot
 * bounce the user to another host after sign-in.
 */
export function getSafeReturnTo(value, fallback = '/') {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\')
  ) {
    return fallback
  }

  const pathname = value.split(/[?#]/, 1)[0]

  return ENTRY_ROUTES.has(pathname) ? fallback : value
}

export function buildHref(path, params) {
  if (!params || Object.keys(params).length === 0) {
    return path
  }

  const search = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&')

  return search ? `${path}?${search}` : path
}
