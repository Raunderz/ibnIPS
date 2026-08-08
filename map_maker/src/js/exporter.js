export class Exporter {
  /**
   * Export final node & edge arrangement as JSON file download
   * @param {Array} nodes 
   * @param {Array} edges 
   */
  exportJson(nodes, edges) {
    const mapOutput = {
      building: "Main Campus Map",
      version: "1.0",
      created_at: new Date().toISOString(),
      nodes: nodes.map(n => ({
        node_id: n.id,
        name: n.name,
        floor: n.floor,
        x: Math.round(n.x),
        y: Math.round(n.y),
        type: n.type
      })),
      edges: edges.map(e => ({
        from_node: e.from,
        to_node: e.to,
        steps: e.steps || 1,
        direction: e.direction || 'N'
      }))
    };

    const jsonStr = JSON.stringify(mapOutput, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `map_layout_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
