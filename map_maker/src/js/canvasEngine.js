import { compassFromVector, stepsBetween, distToSegment } from './geometry.js';

const TYPE_COLORS = {
  corridor: '#3b82f6',
  room: '#10b981',
  stair: '#f59e0b',
  entrance: '#a78bfa',
  location: '#ec4899',
  default: '#64748b'
};

export class CanvasEngine {
  constructor(canvasElement, containerElement) {
    this.canvas = canvasElement;
    this.container = containerElement;
    this.ctx = canvasElement.getContext('2d');

    this.nodes = [];
    this.edges = [];
    this.selectedNodeId = null;
    this.selectedEdgeKey = null;
    this.activeFloor = 1;

    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.startPanX = 0;
    this.startPanY = 0;

    this.gridSize = 20;
    this.gridSnap = true;
    this.nodeRadius = 14;
    this.stepsScale = 8;
    this.mode = 'select';

    this.draggedNode = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.edgeStartNode = null;
    this.hoveredNode = null;
    this.hoveredEdgeKey = null;

    this.bgImage = null;
    this.bgImageOpacity = 0.5;

    this.makeNodeId = (name, floor) => `node_${Date.now().toString().slice(-6)}_f${floor}`;

    this.onSelectionChange = null;
    this.onEdgeSelectionChange = null;
    this.onNodePositionChange = null;
    this.onNodeAdded = null;

    this.initEvents();
    this.resizeCanvas();
  }

  resizeCanvas() {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    this.render();
  }

  setNodesAndEdges(nodes, edges) {
    this.nodes = nodes.map(n => ({
      id: String(n.id || n.node_id),
      name: n.name || n.node_id,
      floor: n.floor !== undefined ? n.floor : 1,
      x: n.x || 0,
      y: n.y || 0,
      type: n.type || 'corridor',
      autoPlaced: !!n.autoPlaced,
      raw: n.raw || null
    }));

    this.edges = edges.map(e => {
      const edge = {
        from: String(e.from || e.from_node),
        to: String(e.to || e.to_node),
        steps: e.steps != null ? e.steps : 1,
        direction: e.direction || '',
        manual: !!e.manual
      };
      if (!edge.manual) this.updateEdgeGeometry(edge);
      return edge;
    });

    this.selectedNodeId = null;
    this.selectedEdgeKey = null;
    this.render();
  }

  edgeKey(edge) {
    return `${edge.from}|${edge.to}`;
  }

  findEdgeByKey(key) {
    return this.edges.find(e => this.edgeKey(e) === key);
  }

  setMode(mode) {
    this.mode = mode;
    this.edgeStartNode = null;
    this.render();
  }

  setFloor(floorNum) {
    this.activeFloor = floorNum;
    this.selectedNodeId = null;
    this.selectedEdgeKey = null;
    if (this.onSelectionChange) this.onSelectionChange(null);
    if (this.onEdgeSelectionChange) this.onEdgeSelectionChange(null);
    this.render();
  }

  deleteSelectedNode() {
    if (!this.selectedNodeId) return false;
    const id = this.selectedNodeId;
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.from !== id && e.to !== id);
    this.selectedNodeId = null;
    if (this.onSelectionChange) this.onSelectionChange(null);
    this.render();
    return true;
  }

  deleteSelectedEdge() {
    if (!this.selectedEdgeKey) return false;
    this.edges = this.edges.filter(e => this.edgeKey(e) !== this.selectedEdgeKey);
    this.selectedEdgeKey = null;
    if (this.onEdgeSelectionChange) this.onEdgeSelectionChange(null);
    this.render();
    return true;
  }

  fitView(floor = this.activeFloor) {
    const nodes = this.nodes.filter(n => n.floor === floor);
    if (nodes.length === 0) {
      this.scale = 1;
      this.panX = 0;
      this.panY = 0;
      this.render();
      return;
    }

    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const pad = 120;
    const vw = this.canvas.width - pad * 2;
    const vh = this.canvas.height - pad * 2;
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);

    this.scale = Math.max(0.2, Math.min(2.5, Math.min(vw / bw, vh / bh)));
    this.panX = (this.canvas.width - (minX + maxX) * this.scale) / 2;
    this.panY = (this.canvas.height - (minY + maxY) * this.scale) / 2;
    this.render();
  }

  zoomBy(factor) {
    const newScale = Math.max(0.2, Math.min(4.0, this.scale * factor));
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    this.panX = cx - (cx - this.panX) * (newScale / this.scale);
    this.panY = cy - (cy - this.panY) * (newScale / this.scale);
    this.scale = newScale;
    this.render();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('mousedown', (e) => {
      const mouse = this.getCanvasMousePos(e);
      const clickedNode = this.findNodeAt(mouse.x, mouse.y);

      if (e.button === 1 || e.altKey) {
        this.isPanning = true;
        this.startPanX = e.clientX - this.panX;
        this.startPanY = e.clientY - this.panY;
        this.container.classList.add('panning');
        return;
      }

      if (this.mode === 'select') {
        if (clickedNode) {
          this.selectedNodeId = clickedNode.id;
          this.selectedEdgeKey = null;
          if (this.onEdgeSelectionChange) this.onEdgeSelectionChange(null);
          this.draggedNode = clickedNode;
          this.dragOffsetX = mouse.x - clickedNode.x;
          this.dragOffsetY = mouse.y - clickedNode.y;
          if (this.onSelectionChange) this.onSelectionChange(clickedNode);
        } else {
          const edge = this.findEdgeAt(mouse.x, mouse.y);
          if (edge) {
            this.selectedEdgeKey = this.edgeKey(edge);
            this.selectedNodeId = null;
            if (this.onSelectionChange) this.onSelectionChange(null);
            if (this.onEdgeSelectionChange) this.onEdgeSelectionChange(edge);
          } else {
            this.selectedNodeId = null;
            this.selectedEdgeKey = null;
            if (this.onSelectionChange) this.onSelectionChange(null);
            if (this.onEdgeSelectionChange) this.onEdgeSelectionChange(null);
          }
        }
      } else if (this.mode === 'edge') {
        if (clickedNode) {
          if (!this.edgeStartNode) {
            this.edgeStartNode = clickedNode;
          } else if (this.edgeStartNode.id !== clickedNode.id) {
            this.addEdge(this.edgeStartNode.id, clickedNode.id);
            this.edgeStartNode = null;
          }
        } else {
          this.edgeStartNode = null;
        }
      } else if (this.mode === 'add_node') {
        let posX = mouse.x;
        let posY = mouse.y;
        if (this.gridSnap) {
          posX = Math.round(posX / this.gridSize) * this.gridSize;
          posY = Math.round(posY / this.gridSize) * this.gridSize;
        }
        const name = `Room ${this.nodes.length + 1}`;
        const newNode = {
          id: this.makeNodeId(name, this.activeFloor),
          name,
          floor: this.activeFloor,
          x: posX,
          y: posY,
          type: 'corridor',
          autoPlaced: false
        };
        this.nodes.push(newNode);
        this.selectedNodeId = newNode.id;
        this.selectedEdgeKey = null;
        if (this.onSelectionChange) this.onSelectionChange(newNode);
        if (this.onEdgeSelectionChange) this.onEdgeSelectionChange(null);
        if (this.onNodeAdded) this.onNodeAdded(newNode);
        this.mode = 'select';
      }

      this.render();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.startPanX;
        this.panY = e.clientY - this.startPanY;
        this.render();
        return;
      }

      const mouse = this.getCanvasMousePos(e);
      this.hoveredNode = this.findNodeAt(mouse.x, mouse.y);
      this.hoveredEdgeKey = this.hoveredNode ? null : (this.findEdgeAt(mouse.x, mouse.y) ? this.edgeKey(this.findEdgeAt(mouse.x, mouse.y)) : null);

      if (this.draggedNode) {
        let newX = mouse.x - this.dragOffsetX;
        let newY = mouse.y - this.dragOffsetY;

        if (this.gridSnap) {
          newX = Math.round(newX / this.gridSize) * this.gridSize;
          newY = Math.round(newY / this.gridSize) * this.gridSize;
        }

        this.draggedNode.x = newX;
        this.draggedNode.y = newY;
        this.draggedNode.autoPlaced = false;

        this.updateConnectedEdges(this.draggedNode.id);

        if (this.onNodePositionChange) this.onNodePositionChange(this.draggedNode);
      }

      this.render();
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.container.classList.remove('panning');
      }
      this.draggedNode = null;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.2, Math.min(4.0, this.scale * zoomFactor));

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;

      this.render();
    }, { passive: false });
  }

  getCanvasMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    return {
      x: (clientX - this.panX) / this.scale,
      y: (clientY - this.panY) / this.scale
    };
  }

  findNodeAt(x, y) {
    const visibleNodes = this.nodes.filter(n => n.floor === this.activeFloor);
    return visibleNodes.find(n => Math.hypot(n.x - x, n.y - y) <= this.nodeRadius + 4);
  }

  findEdgeAt(x, y) {
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    for (const edge of this.edges) {
      const n1 = nodeMap.get(edge.from);
      const n2 = nodeMap.get(edge.to);
      if (!n1 || !n2) continue;
      if (n1.floor !== this.activeFloor && n2.floor !== this.activeFloor) continue;
      const d = distToSegment(x, y, n1.x, n1.y, n2.x, n2.y);
      if (d <= 6) return edge;
    }
    return null;
  }

  addEdge(fromId, toId) {
    const existing = this.edges.find(e =>
      (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );
    if (existing) return existing;

    const edge = { from: fromId, to: toId, steps: 1, direction: '', manual: false };
    this.updateEdgeGeometry(edge);
    this.edges.push(edge);
    return edge;
  }

  updateEdgeGeometry(edge) {
    if (edge.manual) return;
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    const n1 = nodeMap.get(edge.from);
    const n2 = nodeMap.get(edge.to);
    if (!n1 || !n2) return;
    edge.steps = stepsBetween(n1, n2, this.stepsScale);
    edge.direction = compassFromVector(n2.x - n1.x, n2.y - n1.y);
  }

  updateConnectedEdges(nodeId) {
    for (const edge of this.edges) {
      if (edge.from === nodeId || edge.to === nodeId) this.updateEdgeGeometry(edge);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    const visibleNodes = this.nodes.filter(n => n.floor === this.activeFloor);

    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.scale, this.scale);

    this.drawGrid();

    if (this.bgImage) {
      this.ctx.globalAlpha = this.bgImageOpacity;
      this.ctx.drawImage(this.bgImage, 0, 0);
      this.ctx.globalAlpha = 1.0;
    }

    this.edges.forEach(edge => {
      const n1 = nodeMap.get(edge.from);
      const n2 = nodeMap.get(edge.to);
      if (!n1 || !n2) return;
      if (n1.floor !== this.activeFloor && n2.floor !== this.activeFloor) return;

      const isSelected = this.edgeKey(edge) === this.selectedEdgeKey;
      const isHovered = this.edgeKey(edge) === this.hoveredEdgeKey;
      const isCrossFloor = n1.floor !== n2.floor;

      this.ctx.beginPath();
      this.ctx.moveTo(n1.x, n1.y);
      this.ctx.lineTo(n2.x, n2.y);
      this.ctx.strokeStyle = isSelected ? '#f59e0b' : (isHovered ? '#60a5fa' : '#3b82f6');
      this.ctx.globalAlpha = isCrossFloor ? 0.35 : 1;
      this.ctx.lineWidth = isSelected ? 3.5 : 2.5;
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;

      if (!isCrossFloor) {
        const midX = (n1.x + n2.x) / 2;
        const midY = (n1.y + n2.y) / 2;
        this.ctx.fillStyle = 'rgba(15, 20, 29, 0.85)';
        this.ctx.fillRect(midX - 15, midY - 9, 30, 18);
        this.ctx.font = '10px Inter, sans-serif';
        this.ctx.fillStyle = isSelected ? '#fde68a' : '#9ca3af';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${edge.steps}s ${edge.direction || ''}`, midX, midY);
      }
    });

    if (this.mode === 'edge' && this.edgeStartNode) {
      const mouse = this.getCanvasMousePos({ clientX: window.lastMouseX || 0, clientY: window.lastMouseY || 0 });
      this.ctx.beginPath();
      this.ctx.moveTo(this.edgeStartNode.x, this.edgeStartNode.y);
      this.ctx.lineTo(mouse.x, mouse.y);
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    visibleNodes.forEach(node => {
      const isSelected = node.id === this.selectedNodeId;
      const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
      const isEdgeStart = this.edgeStartNode && this.edgeStartNode.id === node.id;
      const color = TYPE_COLORS[node.type] || TYPE_COLORS.default;

      if (isSelected || isEdgeStart) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, this.nodeRadius + 6, 0, Math.PI * 2);
        this.ctx.fillStyle = isEdgeStart ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.35)';
        this.ctx.fill();
      }

      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = isSelected ? color : (isHovered ? '#60a5fa' : color);
      this.ctx.globalAlpha = 0.85;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
      this.ctx.strokeStyle = isSelected ? '#ffffff' : '#111827';
      this.ctx.lineWidth = isSelected ? 3 : 1.5;
      this.ctx.stroke();

      if (node.autoPlaced) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, this.nodeRadius + 3, 0, Math.PI * 2);
        this.ctx.setLineDash([3, 3]);
        this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      this.ctx.font = `${isSelected ? '600' : '400'} 11px Inter, sans-serif`;
      this.ctx.fillStyle = isSelected ? '#ffffff' : '#d1d5db';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.name || node.id, node.x, node.y + this.nodeRadius + 14);
    });

    this.ctx.restore();

    this.canvas.style.cursor =
      this.isPanning ? 'grabbing'
        : this.mode === 'add_node' ? 'crosshair'
        : (this.hoveredNode || this.hoveredEdgeKey) ? 'pointer'
        : 'grab';

    if (this.onViewChange) this.onViewChange();
  }

  drawGrid() {
    const width = this.canvas.width / this.scale;
    const height = this.canvas.height / this.scale;
    const startX = Math.floor(-this.panX / (this.scale * this.gridSize)) * this.gridSize;
    const startY = Math.floor(-this.panY / (this.scale * this.gridSize)) * this.gridSize;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    for (let x = startX; x < startX + width + this.gridSize; x += this.gridSize) {
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, startY + height + this.gridSize);
    }
    for (let y = startY; y < startY + height + this.gridSize; y += this.gridSize) {
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(startX + width + this.gridSize, y);
    }
    this.ctx.stroke();
  }
}
