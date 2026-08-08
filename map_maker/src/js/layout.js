export function autoLayout(nodes, spacing = 140) {
  const byFloor = new Map();
  for (const n of nodes) {
    const f = n.floor || 1;
    if (!byFloor.has(f)) byFloor.set(f, []);
    byFloor.get(f).push(n);
  }

  for (const list of byFloor.values()) {
    const toPlace = list.filter(n => !n.autoPlaced && n.x === 0 && n.y === 0);
    if (toPlace.length === 0) continue;

    const cols = Math.max(1, Math.ceil(Math.sqrt(toPlace.length)));
    const rows = Math.ceil(toPlace.length / cols);
    const startX = -((cols - 1) * spacing) / 2;
    const startY = -((rows - 1) * spacing) / 2;

    toPlace.forEach((n, i) => {
      const cx = i % cols;
      const cy = Math.floor(i / cols);
      n.x = Math.round(startX + cx * spacing);
      n.y = Math.round(startY + cy * spacing);
      n.autoPlaced = true;
    });
  }

  return nodes;
}
