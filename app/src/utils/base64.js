const STANDARD_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const LOOKUP = (() => {
  const table = new Int16Array(256).fill(-1)

  for (let index = 0; index < STANDARD_ALPHABET.length; index += 1) {
    table[STANDARD_ALPHABET.charCodeAt(index)] = index
  }

  return table
})()

/**
 * Decodes a base64url segment into raw bytes.
 *
 * Implemented by hand rather than via `atob` or `base-64` because Hermes does
 * not expose `atob` on every runtime version, and because this module is also
 * imported directly by the Node test runner.
 */
export function base64UrlToBytes(value) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = []

  let buffer = 0
  let bitCount = 0

  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index)

    if (code === 0x3d) {
      break
    }

    const digit = code < LOOKUP.length ? LOOKUP[code] : -1

    if (digit < 0) {
      continue
    }

    buffer = (buffer << 6) | digit
    bitCount += 6

    if (bitCount >= 8) {
      bitCount -= 8
      bytes.push((buffer >> bitCount) & 0xff)
    }
  }

  return bytes
}

function bytesToUtf8(bytes) {
  let result = ''

  for (let index = 0; index < bytes.length; ) {
    const byte = bytes[index]

    if (byte < 0x80) {
      result += String.fromCharCode(byte)
      index += 1
    } else if (byte >= 0xc0 && byte < 0xe0) {
      const code = ((byte & 0x1f) << 6) | (bytes[index + 1] & 0x3f)
      result += String.fromCharCode(code)
      index += 2
    } else if (byte >= 0xe0 && byte < 0xf0) {
      const code =
        ((byte & 0x0f) << 12) |
        ((bytes[index + 1] & 0x3f) << 6) |
        (bytes[index + 2] & 0x3f)
      result += String.fromCharCode(code)
      index += 3
    } else {
      const code =
        ((byte & 0x07) << 18) |
        ((bytes[index + 1] & 0x3f) << 12) |
        ((bytes[index + 2] & 0x3f) << 6) |
        (bytes[index + 3] & 0x3f)
      const offset = code - 0x10000
      result += String.fromCharCode(
        0xd800 + (offset >> 10),
        0xdc00 + (offset & 0x3ff),
      )
      index += 4
    }
  }

  return result
}

/** Decodes a base64url segment into a UTF-8 string, or null when malformed. */
export function decodeBase64Url(value) {
  const bytes = base64UrlToBytes(value)

  if (bytes === null) {
    return null
  }

  try {
    return bytesToUtf8(bytes)
  } catch {
    return null
  }
}

/** Parses a base64url segment as JSON, returning null when it is not valid. */
export function decodeBase64UrlJson(value) {
  const decoded = decodeBase64Url(value)

  if (decoded === null) {
    return null
  }

  try {
    const parsed = JSON.parse(decoded)
    return parsed !== null && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}
