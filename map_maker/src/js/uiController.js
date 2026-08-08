export class UiController {
  constructor(canvasEngine, dbLoader, exporter) {
    this.engine = canvasEngine;
    this.dbLoader = dbLoader;
    this.exporter = exporter;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Buttons
    this.btnLoadDb = document.getElementById('btn-load-db');
    this.dbFileInput = document.getElementById('db-file-input');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnImportJson = document.getElementById('btn-import-json');
    this.jsonFileInput = document.getElementById('json-file-input');
    this.bgImageInput = document.getElementById('bg-image-input');

    // Toolbar Tools
    this.toolSelect = document.getElementById('tool-select');
    this.toolEdge = document.getElementById('tool-edge');
    this.toolAddNode = document.getElementById('tool-add-node');
    this.toolDelete = document.getElementById('tool-delete');
    this.toolSnap = document.getElementById('tool-snap');

    // Sidebar Properties
    this.nodePropsForm = document.getElementById('node-props-form');
    this.inputNodeId = document.getElementById('prop-node-id');
    this.inputNodeName = document.getElementById('prop-node-name');
    this.selectNodeFloor = document.getElementById('prop-node-floor');
    this.selectNodeType = document.getElementById('prop-node-type');
    this.inputNodeX = document.getElementById('prop-node-x');
    this.inputNodeY = document.getElementById('prop-node-y');

    // Floor Tabs
    this.floorTabsContainer = document.getElementById('floor-tabs');

    // Stats
    this.statNodesCount = document.getElementById('stat-nodes-count');
    this.statEdgesCount = document.getElementById('stat-edges-count');
  }

  bindEvents() {
    // Database File Upload
    this.btnLoadDb.addEventListener('click', () => this.dbFileInput.click());
    this.dbFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const buffer = await file.arrayBuffer();
        const data = await this.dbLoader.loadDatabaseBuffer(buffer);
        this.engine.setNodesAndEdges(data.nodes, data.edges);
        this.updateStats();
        this.renderFloorTabs();
      } catch (err) {
        alert('Failed to parse database file: ' + err.message);
      }
    });

    // JSON Export & Import
    this.btnExportJson.addEventListener('click', () => {
      this.exporter.exportJson(this.engine.nodes, this.engine.edges);
    });

    this.btnImportJson.addEventListener('click', () => this.jsonFileInput.click());
    this.jsonFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        this.engine.setNodesAndEdges(data.nodes || [], data.edges || []);
        this.updateStats();
        this.renderFloorTabs();
      } catch (err) {
        alert('Failed to import JSON map: ' + err.message);
      }
    });

    // Toolbar mode switching
    this.toolSelect.addEventListener('click', () => this.setActiveTool('select', this.toolSelect));
    this.toolEdge.addEventListener('click', () => this.setActiveTool('edge', this.toolEdge));
    this.toolAddNode.addEventListener('click', () => this.setActiveTool('add_node', this.toolAddNode));

    this.toolDelete.addEventListener('click', () => {
      if (this.engine.selectedNodeId) {
        this.engine.nodes = this.engine.nodes.filter(n => n.id !== this.engine.selectedNodeId);
        this.engine.edges = this.engine.edges.filter(e => 
          e.from !== this.engine.selectedNodeId && e.to !== this.engine.selectedNodeId
        );
        this.engine.selectedNodeId = null;
        this.updateSelectionPanel(null);
        this.engine.render();
        this.updateStats();
      }
    });

    this.toolSnap.addEventListener('click', () => {
      this.engine.gridSnap = !this.engine.gridSnap;
      this.toolSnap.classList.toggle('active', this.engine.gridSnap);
    });

    // Floorplan Image Overlay
    this.bgImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const img = new Image();
          img.onload = () => {
            this.engine.bgImage = img;
            this.engine.render();
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    // Node property form edits
    this.inputNodeName.addEventListener('input', (e) => {
      const node = this.engine.nodes.find(n => n.id === this.engine.selectedNodeId);
      if (node) {
        node.name = e.target.value;
        this.engine.render();
      }
    });

    this.selectNodeFloor.addEventListener('change', (e) => {
      const node = this.engine.nodes.find(n => n.id === this.engine.selectedNodeId);
      if (node) {
        node.floor = parseInt(e.target.value, 10);
        this.engine.render();
        this.renderFloorTabs();
      }
    });

    this.selectNodeType.addEventListener('change', (e) => {
      const node = this.engine.nodes.find(n => n.id === this.engine.selectedNodeId);
      if (node) {
        node.type = e.target.value;
        this.engine.render();
      }
    });

    // Canvas Selection Callback
    this.engine.onSelectionChange = (node) => {
      this.updateSelectionPanel(node);
    };

    this.engine.onNodePositionChange = (node) => {
      if (node && node.id === this.engine.selectedNodeId) {
        this.inputNodeX.value = Math.round(node.x);
        this.inputNodeY.value = Math.round(node.y);
      }
      this.updateStats();
    };
  }

  setActiveTool(mode, activeBtn) {
    [this.toolSelect, this.toolEdge, this.toolAddNode].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
    this.engine.setMode(mode);
  }

  updateSelectionPanel(node) {
    if (!node) {
      this.nodePropsForm.style.opacity = '0.4';
      this.nodePropsForm.style.pointerEvents = 'none';
      this.inputNodeId.value = '';
      this.inputNodeName.value = '';
      this.inputNodeX.value = '';
      this.inputNodeY.value = '';
    } else {
      this.nodePropsForm.style.opacity = '1.0';
      this.nodePropsForm.style.pointerEvents = 'all';
      this.inputNodeId.value = node.id;
      this.inputNodeName.value = node.name || '';
      this.selectNodeFloor.value = node.floor || 1;
      this.selectNodeType.value = node.type || 'corridor';
      this.inputNodeX.value = Math.round(node.x);
      this.inputNodeY.value = Math.round(node.y);
    }
  }

  renderFloorTabs() {
    const floors = Array.from(new Set(this.engine.nodes.map(n => n.floor || 1))).sort((a,b) => a - b);
    if (floors.length === 0) floors.push(1);

    this.floorTabsContainer.innerHTML = '';
    floors.forEach(f => {
      const tab = document.createElement('div');
      tab.className = `floor-tab ${f === this.engine.activeFloor ? 'active' : ''}`;
      tab.innerText = `Floor ${f}`;
      tab.addEventListener('click', () => {
        this.engine.setFloor(f);
        this.renderFloorTabs();
      });
      this.floorTabsContainer.appendChild(tab);
    });
  }

  updateStats() {
    this.statNodesCount.innerText = this.engine.nodes.length;
    this.statEdgesCount.innerText = this.engine.edges.length;
  }
}
