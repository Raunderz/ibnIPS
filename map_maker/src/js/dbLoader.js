import initSqlJs from 'sql.js';

export class DbLoader {
  constructor() {
    this.SQL = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    try {
      this.SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
      });
      this.isInitialized = true;
      console.log('SQL.js WASM engine initialized successfully');
    } catch (err) {
      console.warn('Failed to load SQL.js WASM via CDN fallback:', err);
    }
  }

  /**
   * Load SQLite file ArrayBuffer and extract nodes and edges
   * @param {ArrayBuffer} buffer 
   */
  async loadDatabaseBuffer(buffer) {
    await this.init();
    if (!this.SQL) {
      throw new Error('SQLite WASM engine not initialized.');
    }

    const db = new this.SQL.Database(new Uint8Array(buffer));
    
    // Check existing tables in SQLite DB
    const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
    const tableNames = tablesRes.length > 0 ? tablesRes[0].values.map(row => row[0]) : [];
    console.log('Tables found in database:', tableNames);

    let nodes = [];
    let edges = [];

    // Table extraction logic matching backend schema (or flexible fallback)
    if (tableNames.includes('nodes')) {
      const res = db.exec("SELECT * FROM nodes;");
      if (res.length > 0) {
        const cols = res[0].columns;
        nodes = res[0].values.map((row, idx) => {
          const obj = {};
          cols.forEach((col, cIdx) => { obj[col] = row[cIdx]; });

          // Format node object
          return {
            id: obj.node_id || obj.id || `node_${idx + 1}`,
            name: obj.name || obj.node_name || `Node ${idx + 1}`,
            floor: obj.floor !== undefined ? parseInt(obj.floor, 10) : 1,
            x: obj.x !== undefined ? parseFloat(obj.x) : 0,
            y: obj.y !== undefined ? parseFloat(obj.y) : 0,
            type: obj.type || 'corridor',
            raw: obj
          };
        });
      }
    } else if (tableNames.includes('fingerprints')) {
      // If table is fingerprints (like Wi-Fi / BLE scan records with locations)
      const res = db.exec("SELECT DISTINCT location_id, floor_id FROM fingerprints;");
      if (res.length > 0) {
        const cols = res[0].columns;
        nodes = res[0].values.map((row, idx) => ({
          id: `fp_node_${row[0]}`,
          name: `Location ${row[0]}`,
          floor: parseInt(row[1] || 1, 10),
          x: 150 + (idx % 5) * 140,
          y: 150 + Math.floor(idx / 5) * 140,
          type: 'location'
        }));
      }
    }

    if (tableNames.includes('edges')) {
      const res = db.exec("SELECT * FROM edges;");
      if (res.length > 0) {
        const cols = res[0].columns;
        edges = res[0].values.map(row => {
          const obj = {};
          cols.forEach((col, cIdx) => { obj[col] = row[cIdx]; });
          return {
            from: obj.from_node || obj.from || obj.source,
            to: obj.to_node || obj.to || obj.target,
            steps: obj.steps != null ? obj.steps : 1,
            direction: obj.direction != null ? obj.direction : 'N'
          };
        });
      }
    }

    db.close();
    return { nodes, edges };
  }

  /**
   * Fetch nodes live from backend API if running
   * @param {string} apiUrl 
   */
  async fetchFromApi(apiUrl = 'http://localhost:8080/api/map') {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    return {
      nodes: data.nodes || [],
      edges: data.edges || []
    };
  }
}
