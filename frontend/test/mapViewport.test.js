import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampScale,
  getBounds,
  getFitView,
  getMapView,
  getNodeFocusTransform,
  getPinchTransform,
  getUnitsPerPixel,
  IDENTITY,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  zoomAround,
  zoomAroundCenter,
} from '../src/map/mapViewport.js'

const nodes = [
  { x: -400, y: -160 },
  { x: 60, y: 260 },
]

test('getBounds measures the real map extent', () => {
  assert.deepEqual(getBounds(nodes), {
    minX: -400,
    minY: -160,
    maxX: 60,
    maxY: 260,
  })
  assert.equal(getBounds([]), null)
})

test('getMapView pads the bounds and never collapses to zero', () => {
  const view = getMapView(nodes, 100)

  assert.equal(view.minX, -500)
  assert.equal(view.minY, -260)
  assert.ok(view.width >= 660)
  assert.ok(view.height >= 520)

  const empty = getMapView([], 100)
  assert.deepEqual(empty, {
    minX: -100,
    minY: -100,
    width: 200,
    height: 200,
  })
})

test('getFitView matches the viewport aspect so the map fills the screen', () => {
  const tall = getFitView(nodes, 0.46)
  const wide = getFitView(nodes, 2.4)

  assert.ok(Math.abs(tall.width / tall.height - 0.46) < 1e-9)
  assert.ok(Math.abs(wide.width / wide.height - 2.4) < 1e-9)
  assert.deepEqual(getFitView(nodes, 0), getMapView(nodes, 90))
  assert.equal(getFitView([], 1.5).width / getFitView([], 1.5).height, 1.5)
})

test('getFitView crops only slightly so a wide map still uses a phone screen', () => {
  const padded = getMapView(nodes, 90)
  const fitted = getFitView(nodes, 390 / 844, 90)
  const covered = fitted.width / padded.width

  assert.ok(covered > 0.5, `only ${(covered * 100).toFixed(0)}% of the map is visible`)
  assert.ok(covered < 1)

  const contained = getFitView(nodes, 390 / 844, 90, 0)
  assert.ok(contained.width >= padded.width)
  assert.ok(contained.height >= padded.height)
  assert.deepEqual(getFitView(nodes, padded.width / padded.height, 90, 0), padded)
  const cover = getFitView(nodes, 390 / 844, 90, 1)
  assert.ok(Math.abs(cover.height - padded.height) < 1e-9)
  assert.ok(cover.width < padded.width)
})

test('clampScale keeps zoom inside the usable range', () => {
  assert.equal(clampScale(99), MAX_SCALE)
  assert.equal(clampScale(0.001), MIN_SCALE)
  assert.equal(clampScale(Number.NaN), 1)
})

test('zoomAround keeps the focal map point under the finger', () => {
  const transform = { x: 10, y: -20, scale: 1 }
  const focalX = 320
  const focalY = 140
  const next = zoomAround(transform, 1.4, focalX, focalY)

  assert.ok(next.scale > transform.scale)
  const worldX = (focalX - transform.x) / transform.scale
  const worldY = (focalY - transform.y) / transform.scale
  assert.ok(Math.abs(next.scale * worldX + next.x - focalX) < 1e-9)
  assert.ok(Math.abs(next.scale * worldY + next.y - focalY) < 1e-9)

  const shrunk = zoomAround(next, 1 / 1.4, focalX, focalY)
  assert.ok(Math.abs(shrunk.scale - transform.scale) < 1e-9)
  assert.ok(Math.abs(shrunk.x - transform.x) < 1e-9)
  assert.ok(Math.abs(shrunk.y - transform.y) < 1e-9)
})

test('zoomAroundCenter is a no-op once the scale is clamped', () => {
  const maxed = { x: 4, y: 8, scale: MAX_SCALE }
  const view = { minX: 0, minY: 0, width: 100, height: 100 }

  assert.equal(zoomAroundCenter(view, maxed, 1.4), maxed)
  assert.equal(zoomAroundCenter(view, IDENTITY, 1.4).scale, 1.4)
})

test('panBy converts screen pixels into map units at the current scale', () => {
  const units = getUnitsPerPixel(
    { minX: 0, minY: 0, width: 600, height: 1200 },
    { width: 300, height: 600 },
  )

  assert.deepEqual(units, { x: 2, y: 2 })
  assert.deepEqual(getUnitsPerPixel({ width: 10, height: 10 }, null), {
    x: 1,
    y: 1,
  })

  const panned = panBy({ x: 0, y: 0, scale: 2 }, 10, -5, units)
  assert.deepEqual(panned, { x: 10, y: -5, scale: 2 })
})

test('getPinchTransform pins the world point under the pinch centre', () => {
  const start = { x: -120, y: 40, scale: 1, centerX: 300, centerY: 200, distance: 180 }
  const current = { centerX: 340, centerY: 180, distance: 360 }

  const next = getPinchTransform(start, current)

  assert.equal(next.scale, 2)
  const worldX = (start.centerX - start.x) / start.scale
  const worldY = (start.centerY - start.y) / start.scale
  assert.ok(Math.abs((current.centerX - next.x) / next.scale - worldX) < 1e-9)
  assert.ok(Math.abs((current.centerY - next.y) / next.scale - worldY) < 1e-9)

  const clamped = getPinchTransform({ ...start, scale: MAX_SCALE }, {
    ...current,
    distance: 900,
  })
  assert.equal(clamped.scale, MAX_SCALE)
  assert.deepEqual(getPinchTransform(start, { ...current, distance: 0 }), {
    scale: start.scale,
    x: start.x,
    y: start.y,
  })
})

test('getNodeFocusTransform centres a node and falls back to identity', () => {
  const view = { minX: 0, minY: 0, width: 400, height: 400 }
  const transform = getNodeFocusTransform({ x: 100, y: -50 }, view, 2)

  assert.equal(100 * transform.scale + transform.x, 200)
  assert.equal(-50 * transform.scale + transform.y, 200)
  assert.deepEqual(getNodeFocusTransform(null, view), IDENTITY)
})
