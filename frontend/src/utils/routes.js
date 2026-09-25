const ENTRY_ROUTES = new Set(['/', '/login', '/sign-in'])

export function getSafeReturnTo(value) {
  if (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
  ) {
    const pathname = value.split(/[?#]/, 1)[0]
    return ENTRY_ROUTES.has(pathname) ? '/account' : value
  }

  return '/account'
}
