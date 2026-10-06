import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCatalogFromSources } from '../src/api/campus.js'

const node = (nodeId, floor, x, y, name = nodeId) => ({
  nodeId,
  name,
  floor,
  x,
  y,
})

const reading = (bssid) => ({ bssid, ssid: 'IITB-WiFi', rssi: -55 })

test('counts Wi-Fi readings from the keyed fingerprints object', () => {
  const catalog = buildCatalogFromSources(
    [node('lab_201_f2', 2, 10, 20, 'Lab 201')],
    {
      nodes: [node('lab_201_f2', 2, 10, 20, 'Lab 201')],
      edges: [{ fromNode: 'lab_201_f2', toNode: 'lab_202_f2', steps: 15, direction: 'N' }],
      fingerprints: {
        lab_201_f2: [reading('aa:bb:cc:dd:ee:01'), reading('aa:bb:cc:dd:ee:02')],
      },
    },
  )

  assert.deepEqual(catalog.fingerprintCounts, { lab_201_f2: 2 })
  assert.equal(catalog.nodes.length, 1)
  assert.equal(catalog.edges.length, 1)
  assert.equal(catalog.isPartial, false)
})

test('an empty fingerprints object no longer breaks the catalog', () => {
  // The backend omits fingerprints entirely when nothing is tagged, and the
  // merge used to iterate that object directly, which threw "object is not
  // iterable" and took down every screen.
  const catalog = buildCatalogFromSources([], {
    nodes: [node('a', 1, 0, 0)],
    edges: [],
    fingerprints: {},
  })

  assert.deepEqual(catalog.fingerprintCounts, {})
  assert.equal(catalog.nodes.length, 1)
})

test('a malformed fingerprints value counts as zero instead of throwing', () => {
  const catalog = buildCatalogFromSources([], {
    nodes: [node('a', 1, 0, 0)],
    edges: [],
    fingerprints: { a: 'not-an-array' },
  })

  assert.deepEqual(catalog.fingerprintCounts, { a: 0 })
})

test('a missing map degrades to partial data rather than failing', () => {
  const catalog = buildCatalogFromSources(
    [node('a', 1, 0, 0), node('b', 1, 40, 0)],
    null,
    ['Unable to reach the ibnIPS backend.'],
  )

  assert.equal(catalog.nodes.length, 2)
  assert.deepEqual(catalog.edges, [])
  assert.equal(catalog.isPartial, true)
  assert.deepEqual(catalog.issues, ['Unable to reach the ibnIPS backend.'])
})

test('a missing node list still renders the map that did load', () => {
  const catalog = buildCatalogFromSources([], {
    nodes: [node('a', 1, 0, 0)],
    edges: [],
    fingerprints: {},
  })

  assert.equal(catalog.nodes.length, 1)
  assert.equal(catalog.isPartial, false)
})

test('map nodes win over duplicate database rows', () => {
  const catalog = buildCatalogFromSources(
    [node('a', 1, 0, 0)],
    { nodes: [node('a', 1, 999, 999)], edges: [], fingerprints: {} },
  )

  assert.equal(catalog.nodes.length, 1)
  assert.equal(catalog.nodes[0].x, 999)
})

test('unpositioned rooms get grid slots without mutating the input', () => {
  const placed = node('placed', 1, 10, 20)
  const missing = node('missing', 1, 0, 0)
  const catalog = buildCatalogFromSources([placed, missing], null)

  assert.equal(catalog.nodes.length, 2)
  assert.equal(placed.x, 10)
  assert.equal(missing.x, 0)
  assert.equal(missing.y, 0)

  const generated = catalog.nodes.find((entry) => entry.nodeId === 'missing')
  assert.ok(generated.x > 0 && generated.y > 0)
})

test('nodes are sorted by floor then name', () => {
  const catalog = buildCatalogFromSources([
    node('b_f2', 2, 0, 0, 'B-2'),
    node('a_f1', 1, 0, 0, 'A-10'),
  ])

  assert.deepEqual(
    catalog.nodes.map((entry) => entry.nodeId),
    ['a_f1', 'b_f2'],
  )
})

test('buildCatalogFromSources tolerates missing arguments', () => {
  const catalog = buildCatalogFromSources()

  assert.deepEqual(catalog.nodes, [])
  assert.deepEqual(catalog.edges, [])
  assert.equal(catalog.isPartial, false)
})
