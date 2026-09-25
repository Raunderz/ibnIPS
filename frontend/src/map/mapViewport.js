export const MIN_SCALE = 0.4
export const MAX_SCALE = 6
export const MAP_CROP_RATIO = 0.45
export const IDENTITY = { x: 0, y: 0, scale: 1 }

export function clampScale(scale) {
  if (!Number.isFinite(scale)) {
    return 1
  }

  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE)
}

export function getBounds(nodes) {
  if (nodes.length === 0) {
    return null
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x)
    maxY = Math.max(maxY, node.y)
  }

  return { minX, minY, maxX, maxY }
}

export function getMapView(nodes, padding = 140) {
  if (nodes.length === 0) {
    return {
      minX: -padding,
      minY: -padding,
      width: padding * 2,
      height: padding * 2,
    }
  }

  const bounds = getBounds(nodes)

  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    width: Math.max(bounds.maxX - bounds.minX, 160) + padding * 2,
    height: Math.max(bounds.maxY - bounds.minY, 160) + padding * 2,
  }
}

export function getFitView(
  nodes,
  aspect = 1,
  padding = 90,
  cropRatio = MAP_CROP_RATIO,
) {
  const content = getMapView(nodes, padding)

  if (!Number.isFinite(aspect) || aspect <= 0) {
    return content
  }

  const contentAspect = content.width / content.height
  const crop = Math.min(Math.max(cropRatio, 0), 1)
  const coverWidth = content.height * aspect
  const coverHeight = content.width / aspect

  let width
  let height

  if (contentAspect > aspect) {
    width = content.width + (coverWidth - content.width) * crop
    height = width / aspect
  } else {
    height = content.height + (coverHeight - content.height) * crop
    width = height * aspect
  }

  return {
    minX: content.minX + content.width / 2 - width / 2,
    minY: content.minY + content.height / 2 - height / 2,
    width,
    height,
  }
}

export function getUnitsPerPixel(view, viewport) {
  if (!viewport || !viewport.width || !viewport.height) {
    return { x: 1, y: 1 }
  }

  return { x: view.width / viewport.width, y: view.height / viewport.height }
}

export function zoomAround(transform, factor, focalX, focalY) {
  const nextScale = clampScale(transform.scale * factor)

  if (nextScale === transform.scale) {
    return transform
  }

  const ratio = nextScale / transform.scale

  return {
    scale: nextScale,
    x: focalX - (focalX - transform.x) * ratio,
    y: focalY - (focalY - transform.y) * ratio,
  }
}

export function zoomAroundCenter(view, transform, factor) {
  return zoomAround(
    transform,
    factor,
    view.minX + view.width / 2,
    view.minY + view.height / 2,
  )
}

export function panBy(transform, deltaX, deltaY, unitsPerPixel) {
  return {
    ...transform,
    x: transform.x + (deltaX * unitsPerPixel.x) / transform.scale,
    y: transform.y + (deltaY * unitsPerPixel.y) / transform.scale,
  }
}

export function getPinchTransform(start, current) {
  if (!start.distance || !current.distance) {
    return { scale: start.scale, x: start.x, y: start.y }
  }

  const worldX = (start.centerX - start.x) / start.scale
  const worldY = (start.centerY - start.y) / start.scale
  const scale = clampScale((start.scale * current.distance) / start.distance)

  return {
    scale,
    x: current.centerX - worldX * scale,
    y: current.centerY - worldY * scale,
  }
}

export function getNodeFocusTransform(node, view, scale = 1.8) {
  if (!node) {
    return IDENTITY
  }

  const nextScale = clampScale(scale)

  return {
    scale: nextScale,
    x: view.minX + view.width / 2 - nextScale * node.x,
    y: view.minY + view.height / 2 - nextScale * node.y,
  }
}
