export const COMPASS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

export function compassFromVector(dx, dy) {
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  const idx = Math.round(deg / 45) % 8;
  return COMPASS[idx];
}

export function stepsBetween(a, b, stepScale = 8) {
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  return Math.max(1, Math.round(dist / stepScale));
}

export function makeBackendId(name, floor, existingIds = []) {
  const set = existingIds instanceof Set ? existingIds : new Set(existingIds);
  let base = String(name || 'node')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) base = 'node';
  base = `${base}_f${floor}`;
  let id = base;
  let i = 2;
  while (set.has(id)) id = `${base}_${i++}`;
  return id;
}

export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function inferType(name = '') {
  const n = name.toLowerCase();
  if (/(stair|elev|lift|lift|exit)/.test(n)) return 'stair';
  if (/(entrance|gate|lobby|reception)/.test(n)) return 'entrance';
  if (/(lab|room|office|class|auditorium|hall)/.test(n)) return 'room';
  return 'corridor';
}
