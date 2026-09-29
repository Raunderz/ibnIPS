import initSqlJs from 'sql.js';
import sqlWasmBase64 from './sqlWasmB64.js';
import { inferType } from './geometry.js';

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export class DbLoader {
  constructor() {
    this.SQL = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    try {
      this.SQL = await initSqlJs({
        wasmBinary: base64ToBytes(sqlWasmBase64)
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
            type: obj.type || inferType(obj.name || `Node ${idx + 1}`),
            raw: obj
          };
        });
      }
    } else if (tableNames.includes('fingerprints')) {
      // If table is fingerprints (Wi-Fi / BLE scan records with locations).
      // Extract one node per distinct location column, supporting both the
      // current schema (node_id) and a legacy (location_id, floor_id) one.
      const colsRes = db.exec("PRAGMA table_info(fingerprints);");
      const fpCols = colsRes.length > 0 ? colsRes[0].values.map(r => r[1]) : [];
      const nodeCol = fpCols.includes('node_id') ? 'node_id'
        : fpCols.includes('location_id') ? 'location_id' : null;
      if (nodeCol) {
        const floorCol = fpCols.includes('floor_id') ? 'floor_id' : null;
        const sql = floorCol
          ? `SELECT DISTINCT ${nodeCol}, ${floorCol} FROM fingerprints;`
          : `SELECT DISTINCT ${nodeCol} FROM fingerprints;`;
        const res = db.exec(sql);
        if (res.length > 0) {
          const cols = res[0].columns;
          nodes = res[0].values.map((row, idx) => {
            const obj = {};
            cols.forEach((col, cIdx) => { obj[col] = row[cIdx]; });
            const locId = String(obj[nodeCol]);
            const floorMatch = locId.match(/_f(\d+)$/i);
            const floor = floorCol
              ? parseInt(obj[floorCol], 10)
              : (floorMatch ? parseInt(floorMatch[1], 10) : 1);
            return {
              id: locId,
              name: `Location ${locId}`,
              floor: isNaN(floor) ? 1 : floor,
              x: 150 + (idx % 5) * 140,
              y: 150 + Math.floor(idx / 5) * 140,
              type: 'location'
            };
          });
        }
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
