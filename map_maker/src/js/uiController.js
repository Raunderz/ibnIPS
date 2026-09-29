import { autoLayout } from './layout.js';
import { makeBackendId, COMPASS } from './geometry.js';

export class UiController {
  constructor(canvasEngine, dbLoader, exporter) {
    this.engine = canvasEngine;
    this.dbLoader = dbLoader;
    this.exporter = exporter;
    this.apiUrl = 'http://localhost:8080/api/map';
    this.dirty = false;

    this.initElements();
    this.bindEvents();
    this.refreshNodeIdGenerator();
    this.updateStatus();
  }

  initElements() {
    // Navbar buttons
    this.btnLoadDb = document.getElementById('btn-load-db');
    this.dbFileInput = document.getElementById('db-file-input');
    this.btnFetchApi = document.getElementById('btn-fetch-api');
    this.btnImportJson = document.getElementById('btn-import-json');
    this.jsonFileInput = document.getElementById('json-file-input');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnSaveProject = document.getElementById('btn-save-project');
    this.btnOpenProject = document.getElementById('btn-open-project');
    this.projectFileInput = document.getElementById('project-file-input');
    this.bgImageInput = document.getElementById('bg-image-input');

    // Toolbar
    this.toolSelect = document.getElementById('tool-select');
    this.toolEdge = document.getElementById('tool-edge');
    this.toolAddNode = document.getElementById('tool-add-node');
    this.toolDelete = document.getElementById('tool-delete');
    this.toolSnap = document.getElementById('tool-snap');
    this.toolFit = document.getElementById('tool-fit');

    // Node properties
    this.nodePropsForm = document.getElementById('node-props-form');
    this.inputNodeId = document.getElementById('prop-node-id');
    this.inputNodeName = document.getElementById('prop-node-name');
    this.selectNodeFloor = document.getElementById('prop-node-floor');
    this.selectNodeType = document.getElementById('prop-node-type');
    this.inputNodeX = document.getElementById('prop-node-x');
    this.inputNodeY = document.getElementById('prop-node-y');

    // Edge properties
    this.edgePropsForm = document.getElementById('edge-props-form');
    this.inputEdgeId = document.getElementById('prop-edge-id');
    this.inputEdgeSteps = document.getElementById('prop-edge-steps');
    this.selectEdgeDirection = document.getElementById('prop-edge-direction');
    this.btnEdgeAuto = document.getElementById('btn-edge-auto');
    this.btnDeleteEdge = document.getElementById('btn-delete-edge');

    // Source & project (sidebar)
    this.apiUrlInput = document.getElementById('api-url-input');
    this.btnFetchApi2 = document.getElementById('btn-fetch-api-2');
    this.btnSaveProject2 = document.getElementById('btn-save-project-2');
    this.btnOpenProject2 = document.getElementById('btn-open-project-2');

    // Empty state
    this.emptyState = document.getElementById('empty-state');
    this.emptyLoadDb = document.getElementById('empty-load-db');
    this.emptyFetchApi = document.getElementById('empty-fetch-api');
    this.emptyApiUrl = document.getElementById('empty-api-url');

    // Status
    this.statusFloor = document.getElementById('status-floor');
    this.statusZoom = document.getElementById('status-zoom');
    this.statusSaved = document.getElementById('status-saved');

    // Misc
    this.floorTabsContainer = document.getElementById('floor-tabs');
    this.statNodesCount = document.getElementById('stat-nodes-count');
    this.statEdgesCount = document.getElementById('stat-edges-count');
  }

  bindEvents() {
    this.engine.makeNodeId = (name, floor) => makeBackendId(name, floor, this.engine.nodes.map(n => n.id));

    // Database File Upload
    this.btnLoadDb.addEventListener('click', () => this.dbFileInput.click());
    this.emptyLoadDb.addEventListener('click', () => this.dbFileInput.click());
    this.dbFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const buffer = await file.arrayBuffer();
        const data = await this.dbLoader.loadDatabaseBuffer(buffer);
        this.applyData(data.nodes, data.edges);
      } catch (err) {
        alert('Failed to parse database file: ' + err.message);
      }
    });

    // Backend API Fetch
    const doFetch = async () => {
      try {
        const data = await this.dbLoader.fetchFromApi(this.apiUrl);
        this.applyData(data.nodes, data.edges);
      } catch (err) {
        alert('Failed to fetch from API: ' + err.message);
      }
    };
    this.btnFetchApi.addEventListener('click', doFetch);
    this.btnFetchApi2.addEventListener('click', () => {
      this.apiUrl = this.apiUrlInput.value.trim() || this.apiUrl;
      doFetch();
    });
    this.emptyFetchApi.addEventListener('click', () => {
      this.apiUrl = this.emptyApiUrl.value.trim() || this.apiUrl;
      this.apiUrlInput.value = this.apiUrl;
      doFetch();
    });

    // JSON Import (map.json or .mapproj)
    this.btnImportJson.addEventListener('click', () => this.jsonFileInput.click());
    this.jsonFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        this.applyJson(await file.text());
      } catch (err) {
        alert('Failed to import JSON: ' + err.message);
      }
    });

    // Export
    this.btnExportJson.addEventListener('click', () => {
      this.exporter.exportJson(this.engine.nodes, this.engine.edges);
    });

    // Project save / open
    this.btnSaveProject.addEventListener('click', () => this.saveProject());
    this.btnSaveProject2.addEventListener('click', () => this.saveProject());
    this.btnOpenProject.addEventListener('click', () => this.projectFileInput.click());
    this.btnOpenProject2.addEventListener('click', () => this.projectFileInput.click());
    this.projectFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        this.applyJson(await file.text());
      } catch (err) {
        alert('Failed to open project: ' + err.message);
      }
    });

    // Toolbar mode switching
    this.toolSelect.addEventListener('click', () => this.setActiveTool('select', this.toolSelect));
    this.toolEdge.addEventListener('click', () => this.setActiveTool('edge', this.toolEdge));
    this.toolAddNode.addEventListener('click', () => this.setActiveTool('add_node', this.toolAddNode));

    this.toolSnap.addEventListener('click', () => {
      this.engine.gridSnap = !this.engine.gridSnap;
      this.toolSnap.classList.toggle('active', this.engine.gridSnap);
    });

    this.toolFit.addEventListener('click', () => this.engine.fitView());

    this.toolDelete.addEventListener('click', () => this.deleteSelection());

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
      const node = this.findSelectedNode();
      if (node) {
        node.name = e.target.value;
        this.markDirty();
        this.engine.render();
      }
    });

    this.selectNodeFloor.addEventListener('change', (e) => {
      const node = this.findSelectedNode();
      if (node) {
        node.floor = parseInt(e.target.value, 10);
        this.markDirty();
        this.engine.render();
        this.renderFloorTabs();
      }
    });

    this.selectNodeType.addEventListener('change', (e) => {
      const node = this.findSelectedNode();
      if (node) {
        node.type = e.target.value;
        this.markDirty();
        this.engine.render();
      }
    });

    // Edge property form edits
    this.inputEdgeSteps.addEventListener('change', (e) => {
      const edge = this.findSelectedEdge();
      if (edge) {
        edge.manual = true;
        edge.steps = Math.max(1, parseInt(e.target.value, 10) || 1);
        this.markDirty();
        this.engine.render();
      }
    });

    this.selectEdgeDirection.addEventListener('change', (e) => {
      const edge = this.findSelectedEdge();
      if (edge) {
        edge.manual = true;
        edge.direction = e.target.value;
        this.markDirty();
        this.engine.render();
      }
    });

    this.btnEdgeAuto.addEventListener('click', () => {
      const edge = this.findSelectedEdge();
      if (edge) {
        edge.manual = false;
        this.engine.updateEdgeGeometry(edge);
        this.fillEdgePanel(edge);
        this.markDirty();
        this.engine.render();
      }
    });

    this.btnDeleteEdge.addEventListener('click', () => this.deleteSelection());

    // Canvas callbacks
    this.engine.onSelectionChange = (node) => {
      this.updateSelectionPanel(node);
    };
    this.engine.onEdgeSelectionChange = (edge) => {
      this.fillEdgePanel(edge);
    };
    this.engine.onNodePositionChange = (node) => {
      if (node && node.id === this.engine.selectedNodeId) {
        this.inputNodeX.value = Math.round(node.x);
        this.inputNodeY.value = Math.round(node.y);
      }
      this.markDirty();
      this.updateStats();
    };
    this.engine.onNodeAdded = () => this.markDirty();
    this.engine.onViewChange = () => this.updateStatus();

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const k = e.key.toLowerCase();
      if (k === 'v') this.setActiveTool('select', this.toolSelect);
      else if (k === 'e') this.setActiveTool('edge', this.toolEdge);
      else if (k === 'n') this.setActiveTool('add_node', this.toolAddNode);
      else if (k === 's') {
        e.preventDefault();
        this.toolSnap.click();
      } else if (k === '0') this.engine.fitView();
      else if (k === '+' || k === '=') this.engine.zoomBy(1.2);
      else if (k === '-') this.engine.zoomBy(1 / 1.2);
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.deleteSelection();
      } else if ((e.ctrlKey || e.metaKey) && k === 's') {
        e.preventDefault();
        this.saveProject();
      }
    });
  }

  findSelectedNode() {
    return this.engine.nodes.find(n => n.id === this.engine.selectedNodeId) || null;
  }

  findSelectedEdge() {
    return this.engine.findEdgeByKey(this.engine.selectedEdgeKey) || null;
  }

  deleteSelection() {
    const node = this.findSelectedNode();
    if (node) {
      if (window.confirm(`Delete node "${node.name}" and its edges?`)) {
        this.engine.deleteSelectedNode();
        this.updateStats();
        this.renderFloorTabs();
        this.markDirty();
      }
      return;
    }
    if (this.findSelectedEdge()) {
      this.engine.deleteSelectedEdge();
      this.updateStats();
      this.markDirty();
      return;
    }
    this.setActiveTool('select', this.toolSelect);
  }

  saveProject() {
    this.exporter.saveProject(this.engine.nodes, this.engine.edges);
    this.setSaved();
  }

  applyJson(text) {
    const data = JSON.parse(text);
    this.applyData(data.nodes || [], data.edges || []);
  }

  applyData(nodes, edges) {
    autoLayout(nodes);
    this.engine.setNodesAndEdges(nodes, edges);
    this.renderFloorTabs();
    this.updateStats();
    this.engine.fitView();
    this.showEmptyState(false);
    this.setSaved();
    this.updateStatus();
  }

  showEmptyState(visible) {
    this.emptyState.style.display = visible ? 'flex' : 'none';
  }

  setActiveTool(mode, activeBtn) {
    [this.toolSelect, this.toolEdge, this.toolAddNode].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
    this.engine.setMode(mode);
  }

  updateSelectionPanel(node) {
    const floors = Array.from(new Set(this.engine.nodes.map(n => n.floor || 1))).sort((a, b) => a - b);
    this.selectNodeFloor.innerHTML = floors
      .map(f => `<option value="${f}">Floor ${f}</option>`)
      .join('');

    if (!node) {
      this.nodePropsForm.style.opacity = '0.4';
      this.nodePropsForm.style.pointerEvents = 'none';
      this.inputNodeId.value = '';
      this.inputNodeName.value = '';
      this.inputNodeX.value = '';
      this.inputNodeY.value = '';
      return;
    }

    this.nodePropsForm.style.opacity = '1.0';
    this.nodePropsForm.style.pointerEvents = 'all';
    this.inputNodeId.value = node.id;
    this.inputNodeName.value = node.name || '';
    this.selectNodeFloor.value = String(node.floor || 1);
    this.selectNodeType.value = node.type || 'corridor';
    this.inputNodeX.value = Math.round(node.x);
    this.inputNodeY.value = Math.round(node.y);
  }

  fillEdgePanel(edge) {
    if (!edge) {
      this.edgePropsForm.style.display = 'none';
      return;
    }
    this.edgePropsForm.style.display = 'block';
    this.inputEdgeId.value = `${edge.from} → ${edge.to}`;
    this.inputEdgeSteps.value = edge.steps;
    this.selectEdgeDirection.value = COMPASS.includes(edge.direction) ? edge.direction : 'N';
  }

  renderFloorTabs() {
    const floors = Array.from(new Set(this.engine.nodes.map(n => n.floor || 1))).sort((a, b) => a - b);
    if (floors.length === 0) floors.push(1);

    this.floorTabsContainer.innerHTML = '';
    floors.forEach(f => {
      const tab = document.createElement('div');
      tab.className = `floor-tab ${f === this.engine.activeFloor ? 'active' : ''}`;
      tab.innerText = `Floor ${f}`;
      tab.addEventListener('click', () => {
        this.engine.setFloor(f);
        this.updateSelectionPanel(null);
        this.fillEdgePanel(null);
        this.renderFloorTabs();
        this.updateStatus();
      });
      this.floorTabsContainer.appendChild(tab);
    });

    if (!floors.includes(this.engine.activeFloor)) {
      this.engine.setFloor(floors[0]);
    }
  }

  updateStats() {
    this.statNodesCount.innerText = this.engine.nodes.length;
    this.statEdgesCount.innerText = this.engine.edges.length;
    this.refreshNodeIdGenerator();
  }

  refreshNodeIdGenerator() {
    this.engine.makeNodeId = (name, floor) => makeBackendId(name, floor, this.engine.nodes.map(n => n.id));
  }

  markDirty() {
    if (!this.dirty) {
      this.dirty = true;
      this.statusSaved.innerText = 'Unsaved';
    }
  }

  setSaved() {
    this.dirty = false;
    this.statusSaved.innerText = 'Saved';
  }

  updateStatus() {
    this.statusFloor.innerText = `Floor ${this.engine.activeFloor}`;
    this.statusZoom.innerText = `${Math.round(this.engine.scale * 100)}%`;
  }
}
