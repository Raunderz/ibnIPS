const emailPattern = /^[a-z0-9._-]+@kiit\.ac\.in$/

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
