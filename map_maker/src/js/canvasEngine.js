export class CanvasEngine {
  constructor(canvasElement, containerElement) {
    this.canvas = canvasElement;
    this.container = containerElement;
    this.ctx = canvas.getContext('2d');

    // State Data
    this.nodes = [];
    this.edges = [];
    this.selectedNodeId = null;
    this.activeFloor = 1;

    // Viewport transform (Pan & Zoom)
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.startPanX = 0;
    this.startPanY = 0;

    // Canvas settings
    this.gridSize = 20;
    this.gridSnap = true;
    this.nodeRadius = 14;
    this.mode = 'select'; // 'select' | 'edge' | 'add_node'

    // Interactivity state
    this.draggedNode = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.edgeStartNode = null;
    this.hoveredNode = null;

    // Background floorplan image
    this.bgImage = null;
    this.bgImageOpacity = 0.5;

    // Callbacks
    this.onSelectionChange = null;
    this.onNodePositionChange = null;

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
      x: n.x || 100,
      y: n.y || 100,
      type: n.type || 'corridor'
    }));

    this.edges = edges.map(e => ({
      from: String(e.from || e.from_node),
      to: String(e.to || e.to_node),
      steps: e.steps || 1,
      direction: e.direction || 'N'
    }));

    this.render();
  }

  setMode(mode) {
    this.mode = mode;
    this.edgeStartNode = null;
    this.render();
  }

  setFloor(floorNum) {
    this.activeFloor = floorNum;
    this.selectedNodeId = null;
    if (this.onSelectionChange) this.onSelectionChange(null);
    this.render();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // Mouse Down
    this.canvas.addEventListener('mousedown', (e) => {
      const mouse = this.getCanvasMousePos(e);
      const clickedNode = this.findNodeAt(mouse.x, mouse.y);

      if (e.button === 1 || e.spaceKey || (e.button === 0 && e.altKey)) {
        // Pan canvas
        this.isPanning = true;
        this.startPanX = e.clientX - this.panX;
        this.startPanY = e.clientY - this.panY;
        this.container.classList.add('panning');
        return;
      }

      if (this.mode === 'select') {
        if (clickedNode) {
          this.selectedNodeId = clickedNode.id;
          this.draggedNode = clickedNode;
          this.dragOffsetX = mouse.x - clickedNode.x;
          this.dragOffsetY = mouse.y - clickedNode.y;
          if (this.onSelectionChange) this.onSelectionChange(clickedNode);
        } else {
          this.selectedNodeId = null;
          if (this.onSelectionChange) this.onSelectionChange(null);
        }
      } else if (this.mode === 'edge') {
        if (clickedNode) {
          if (!this.edgeStartNode) {
            this.edgeStartNode = clickedNode;
          } else if (this.edgeStartNode.id !== clickedNode.id) {
            // Add Edge
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
        const newNodeId = `node_${Date.now().toString().slice(-4)}`;
        const newNode = {
          id: newNodeId,
          name: `Room ${this.nodes.length + 1}`,
          floor: this.activeFloor,
          x: posX,
          y: posY,
          type: 'room'
        };
        this.nodes.push(newNode);
        this.selectedNodeId = newNode.id;
        if (this.onSelectionChange) this.onSelectionChange(newNode);
        this.mode = 'select';
      }

      this.render();
    });

    // Mouse Move
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.startPanX;
        this.panY = e.clientY - this.startPanY;
        this.render();
        return;
      }

      const mouse = this.getCanvasMousePos(e);
      this.hoveredNode = this.findNodeAt(mouse.x, mouse.y);

      if (this.draggedNode) {
        let newX = mouse.x - this.dragOffsetX;
        let newY = mouse.y - this.dragOffsetY;

        if (this.gridSnap) {
          newX = Math.round(newX / this.gridSize) * this.gridSize;
          newY = Math.round(newY / this.gridSize) * this.gridSize;
        }

        this.draggedNode.x = newX;
        this.draggedNode.y = newY;

        if (this.onNodePositionChange) this.onNodePositionChange(this.draggedNode);
      }

      this.render();
    });

    // Mouse Up
    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.container.classList.remove('panning');
      }
      this.draggedNode = null;
    });

    // Zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.2, Math.min(4.0, this.scale * zoomFactor));

      const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
      const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;

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
    return visibleNodes.find(n => {
      const dist = Math.hypot(n.x - x, n.y - y);
      return dist <= this.nodeRadius + 4;
    });
  }

  addEdge(fromId, toId) {
    const existing = this.edges.find(e => 
      (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );
    if (!existing) {
      this.edges.push({
        from: fromId,
        to: toId,
        steps: 5,
        direction: 'N'
      });
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    // Apply pan & zoom transform
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.scale, this.scale);

    // 1. Draw Grid Background
    this.drawGrid();

    // 2. Draw Floorplan Image Overlay
    if (this.bgImage) {
      this.ctx.globalAlpha = this.bgImageOpacity;
      this.ctx.drawImage(this.bgImage, 0, 0);
      this.ctx.globalAlpha = 1.0;
    }

    // Filter nodes for active floor
    const visibleNodes = this.nodes.filter(n => n.floor === this.activeFloor);
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    // 3. Draw Edges
    this.ctx.lineWidth = 2.5;
    this.edges.forEach(edge => {
      const n1 = nodeMap.get(edge.from);
      const n2 = nodeMap.get(edge.to);

      if (n1 && n2 && (n1.floor === this.activeFloor || n2.floor === this.activeFloor)) {
        this.ctx.beginPath();
        this.ctx.moveTo(n1.x, n1.y);
        this.ctx.lineTo(n2.x, n2.y);
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.stroke();

        // Edge label (steps)
        const midX = (n1.x + n2.x) / 2;
        const midY = (n1.y + n2.y) / 2;
        this.ctx.fillStyle = 'rgba(15, 20, 29, 0.8)';
        this.ctx.fillRect(midX - 12, midY - 9, 24, 18);
        this.ctx.font = '10px Inter, sans-serif';
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${edge.steps}s`, midX, midY);
      }
    });

    // 4. Draw Rubberband line in Edge creation mode
    if (this.mode === 'edge' && this.edgeStartNode) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.edgeStartNode.x, this.edgeStartNode.y);
      const mouse = this.getCanvasMousePos({ clientX: window.lastMouseX || 0, clientY: window.lastMouseY || 0 });
      this.ctx.lineTo(mouse.x, mouse.y);
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // 5. Draw Nodes
    visibleNodes.forEach(node => {
      const isSelected = node.id === this.selectedNodeId;
      const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
      const isEdgeStart = this.edgeStartNode && this.edgeStartNode.id === node.id;

      // Glow effect for selected
      if (isSelected || isEdgeStart) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, this.nodeRadius + 6, 0, Math.PI * 2);
        this.ctx.fillStyle = isEdgeStart ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.35)';
        this.ctx.fill();
      }

      // Outer circle
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = isSelected ? '#3b82f6' : (isHovered ? '#60a5fa' : '#1f2937');
      this.ctx.strokeStyle = isSelected ? '#ffffff' : '#4b5563';
      this.ctx.lineWidth = isSelected ? 3 : 2;
      this.ctx.fill();
      this.ctx.stroke();

      // Node label
      this.ctx.font = `${isSelected ? '600' : '400'} 11px Inter, sans-serif`;
      this.ctx.fillStyle = isSelected ? '#ffffff' : '#d1d5db';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.name || node.id, node.x, node.y + this.nodeRadius + 14);
    });

    this.ctx.restore();
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
