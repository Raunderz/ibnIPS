/**
 * Validate an access code.
 *
 * The code is issued by the kiit-auth service after it verifies a Google
 * identity, so the only thing worth rejecting here is an empty field.
 */
export function getCodeError(value) {
  const code = typeof value === 'string' ? value.trim() : ''

  if (!code) {
    return 'Enter the access code from the kiit-auth service.'
  }

  return null
}

const emailPattern = /^[a-z0-9._-]+@kiit\.ac\.in$/i

export function getEmailError(value) {
  const email = value.trim()

  if (!email) {
    return 'Enter your KIIT email address.'
  }

  if (!emailPattern.test(email)) {
    return 'Use a lowercase roll number followed by @kiit.ac.in.'
  }

  return null
}
