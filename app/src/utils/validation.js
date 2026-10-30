const emailPattern = /^[a-z0-9._-]+@kiit\.ac\.in$/i

export function getEmailError(value) {
  const email = typeof value === 'string' ? value.trim() : ''

  if (!email) {
    return 'Enter your KIIT email address.'
  }

  if (!emailPattern.test(email)) {
    return 'Use a lowercase roll number followed by @kiit.ac.in.'
  }

  return null
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/**
 * Validate an access code.
 *
 * During testing the code shape is whatever the auth service hands out, so we
 * only reject empty input and anything that would be a pointless round trip.
 */
export function getCodeError(value) {
  const code = typeof value === 'string' ? value.trim() : ''

  if (!code) {
    return 'Enter the access code from the kiit-auth service.'
  }

  return null
}
