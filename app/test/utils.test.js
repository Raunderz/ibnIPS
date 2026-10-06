import assert from 'node:assert/strict'
import test from 'node:test'
import { searchNodes } from '../src/utils/searchNodes.js'
import { normalizeBaseUrl } from '../src/api/runtimeConfig.js'
import { getEmailError, normalizeEmail } from '../src/utils/validation.js'
import {
  formatDateTime,
  getFloorCountLabel,
  getFloorLabel,
  getLocationCountLabel,
  getLocationTitle,
  getUserInitials,
} from '../src/utils/location.js'

const NODES = [
  { nodeId: '3C-157', name: 'Lecture Hall 157', floor: 1 },
  { nodeId: '3C-158', name: 'Lecture Hall 158', floor: 1 },
  { nodeId: '3C-215', name: 'Seminar Room 215', floor: 2 },
  { nodeId: 'LIB-001', name: 'Central Library', floor: 1 },
]

test('an empty query matches nothing rather than everything', () => {
  assert.deepEqual(searchNodes(NODES, ''), [])
  assert.deepEqual(searchNodes(NODES, '   '), [])
})

test('a partial room number finds the room', () => {
  const results = searchNodes(NODES, '157')

  assert.equal(results.length, 1)
  assert.equal(results[0].nodeId, '3C-157')
})

test('search is case insensitive', () => {
  assert.equal(searchNodes(NODES, 'lecture')[0].nodeId, '3C-157')
  assert.equal(searchNodes(NODES, 'LIBRARY')[0].nodeId, 'LIB-001')
})

test('an exact name outranks a partial one', () => {
  const results = searchNodes(NODES, 'lecture hall')

  assert.ok(results.length >= 2)
  assert.equal(results[0].nodeId, '3C-157')
})

test('a node id is searchable', () => {
  assert.equal(searchNodes(NODES, 'LIB-001')[0].nodeId, 'LIB-001')
})

test('a spaced node id is searchable', () => {
  const results = searchNodes(NODES, '3c 157')

  assert.equal(results[0].nodeId, '3C-157')
})

test('every word must match somewhere', () => {
  assert.equal(searchNodes(NODES, 'lecture missing').length, 0)
})

test('a query that matches nothing returns nothing', () => {
  assert.deepEqual(searchNodes(NODES, 'zzzzz'), [])
})

test('results are capped so the list stays responsive', () => {
  const many = Array.from({ length: 200 }, (_unused, index) => ({
    nodeId: `N-${index}`,
    name: `Room ${index}`,
    floor: 1,
  }))

  assert.equal(searchNodes(many, 'room').length, 60)
})

test('a base url without a scheme is assumed to be http', () => {
  assert.equal(normalizeBaseUrl('192.168.1.10:3000'), 'http://192.168.1.10:3000')
  assert.equal(normalizeBaseUrl('ibnips.onrender.com'), 'http://ibnips.onrender.com')
})

test('an explicit scheme is preserved', () => {
  assert.equal(normalizeBaseUrl('https://ibnips.onrender.com'), 'https://ibnips.onrender.com')
  assert.equal(normalizeBaseUrl('http://localhost:3000'), 'http://localhost:3000')
})

test('a trailing slash and whitespace are tidied away', () => {
  assert.equal(normalizeBaseUrl('  https://ibnips.onrender.com/  '), 'https://ibnips.onrender.com')
  assert.equal(normalizeBaseUrl('http://localhost:3000///'), 'http://localhost:3000')
})

test('a base path is dropped, because every endpoint is an absolute path', () => {
  assert.equal(normalizeBaseUrl('http://localhost:5173/api'), 'http://localhost:5173')
})

test('an unsupported scheme is rejected rather than turned into a hostname', () => {
  assert.equal(normalizeBaseUrl('ftp://example.com'), null)
  assert.equal(normalizeBaseUrl('file:///etc/passwd'), null)
  assert.equal(normalizeBaseUrl('ws://example.com'), null)
})

test('a host and port without a scheme still works', () => {
  assert.equal(normalizeBaseUrl('localhost:3000'), 'http://localhost:3000')
})

test('an unusable address is rejected', () => {
  assert.equal(normalizeBaseUrl(''), null)
  assert.equal(normalizeBaseUrl('   '), null)
  assert.equal(normalizeBaseUrl('not a url'), null)
  assert.equal(normalizeBaseUrl(null), null)
  assert.equal(normalizeBaseUrl(42), null)
})

test('a KIIT email must be lowercase and on the right domain', () => {
  assert.equal(getEmailError('23b1234@kiit.ac.in'), null)
  assert.equal(getEmailError('  23b1234@kiit.ac.in  '), null)
  assert.ok(getEmailError(''))
  assert.ok(getEmailError('23B1234@kiit.ac.in'))
  assert.ok(getEmailError('someone@gmail.com'))
  assert.ok(getEmailError('23b1234@kiit.com'))
})

test('an email is trimmed and lower-cased before it is sent', () => {
  assert.equal(normalizeEmail('  23B1234@KIIT.ac.IN '), '23b1234@kiit.ac.in')
  assert.equal(normalizeEmail(undefined), '')
})

test('room labels read well for people', () => {
  assert.equal(getLocationTitle({ nodeId: '3C-157', name: 'Lecture Hall' }), 'Lecture Hall')
  assert.equal(getLocationTitle({ nodeId: '3C-157', name: '   ' }), '3C-157')
  assert.equal(getLocationTitle(null), 'Unknown location')
  assert.equal(getFloorLabel(2), 'Floor 2')
  assert.equal(getFloorLabel(undefined), 'Floor unavailable')
  assert.equal(getLocationCountLabel(1), '1 location')
  assert.equal(getLocationCountLabel(3), '3 locations')
  assert.equal(getFloorCountLabel(1), '1 floor')
  assert.equal(getFloorCountLabel(4), '4 floors')
})

test('initials fall back for a missing user id', () => {
  assert.equal(getUserInitials('23b1234'), '23')
  assert.equal(getUserInitials('  ab '), 'AB')
  assert.equal(getUserInitials(''), 'U')
  assert.equal(getUserInitials(undefined), 'U')
})

test('an impossible expiry formats as unknown instead of throwing', () => {
  assert.equal(formatDateTime(undefined), 'Unknown')
  assert.equal(formatDateTime(Number.NaN), 'Unknown')
})
