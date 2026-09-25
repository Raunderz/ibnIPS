export function getSafeReturnTo(value) {
  if (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
  ) {
    const pathname = value.split(/[?#]/, 1)[0]
    return pathname === '/sign-in' ? '/account' : value
  }

  return '/account'
}
