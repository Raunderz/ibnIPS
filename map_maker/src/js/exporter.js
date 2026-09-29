import { COMPASS } from './geometry.js';

export class Exporter {
  buildMap(nodes, edges) {
    return {
      nodes: nodes.map(n => ({
        node_id: n.id,
        name: n.name,
        floor: n.floor,
        x: Math.round(n.x),
        y: Math.round(n.y)
      })),
      edges: edges.map(e => ({
        from_node: e.from,
        to_node: e.to,
        steps: Math.max(1, Math.round(e.steps || 1)),
        direction: COMPASS.includes(e.direction) ? e.direction : ''
      }))
    };
  }

  validate(nodes, edges) {
    const warnings = [];
    const ids = new Set(nodes.map(n => n.id));

    if (ids.size !== nodes.length) warnings.push('Duplicate node ids detected.');

    nodes.forEach(n => {
      if (!n.autoPlaced && n.x === 0 && n.y === 0) {
        warnings.push(`Node "${n.name}" (${n.id}) is still at (0,0) — not positioned.`);
      }
    });

    edges.forEach(e => {
      if (!ids.has(e.from)) warnings.push(`Edge references missing node "${e.from}".`);
      if (!ids.has(e.to)) warnings.push(`Edge references missing node "${e.to}".`);
      if (!COMPASS.includes(e.direction)) {
        warnings.push(`Edge ${e.from}→${e.to} has invalid direction "${e.direction}".`);
      }
      if (!(e.steps > 0)) {
        warnings.push(`Edge ${e.from}→${e.to} has steps <= 0.`);
      }
    });

    return warnings;
  }

  exportJson(nodes, edges) {
    const warnings = this.validate(nodes, edges);
    if (warnings.length) {
      const ok = window.confirm(
        `Export warnings:\n\n• ${warnings.join('\n• ')}\n\nExport anyway?`
      );
      if (!ok) return;
    }
    this.download('map.json', this.buildMap(nodes, edges));
  }

  saveProject(nodes, edges, meta = {}) {
    const project = {
      type: 'mapproj',
      version: '1.0',
      saved_at: new Date().toISOString(),
      ...meta,
      nodes,
      edges
    };
    this.download('map_project.mapproj', project);
  }

  download(filename, obj) {
    const jsonStr = JSON.stringify(obj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
