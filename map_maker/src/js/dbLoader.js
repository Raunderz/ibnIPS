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

    // Wi-Fi readings live in `room_aps` — one row per (room, network), holding
    // the average signal for that network in that room.
    //
    // Older databases also have a `fingerprints` table with one row per raw
    // reading. Nothing writes to it any more, so it only ever holds what was
    // recorded before the switch. Prefer `room_aps` when both are present.
    const readingsTable = tableNames.includes('room_aps')
      ? 'room_aps'
      : (tableNames.includes('fingerprints') ? 'fingerprints' : null);

    let nodes = [];
    let edges = [];
    let fingerprints = {};

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
    } else if (readingsTable) {
      // No `nodes` table, but there are readings. Build one room per distinct
      // node id, placed on a grid so they can be dragged into shape.
      // Supports the current schema and a legacy (location_id, floor_id) one.
      const colsRes = db.exec(`PRAGMA table_info(${readingsTable});`);
      const fpCols = colsRes.length > 0 ? colsRes[0].values.map(r => r[1]) : [];
      const nodeCol = fpCols.includes('node_id') ? 'node_id'
        : fpCols.includes('location_id') ? 'location_id' : null;
      if (nodeCol) {
        const floorCol = fpCols.includes('floor_id') ? 'floor_id' : null;
        const sql = floorCol
          ? `SELECT DISTINCT ${nodeCol}, ${floorCol} FROM ${readingsTable};`
          : `SELECT DISTINCT ${nodeCol} FROM ${readingsTable};`;
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

    // Wi-Fi readings, shaped the way map.json expects:
    //   { node_id: [{ bssid, ssid, rssi }, ...] }
    if (readingsTable) {
      fingerprints = this.readFingerprints(db, readingsTable);
      const roomCount = Object.keys(fingerprints).length;
      const readingCount = Object.values(fingerprints)
        .reduce((total, list) => total + list.length, 0);
      console.log(
        `Loaded ${readingCount} Wi-Fi readings across ${roomCount} rooms from ${readingsTable}`
      );
      if (readingCount === 0) {
        console.warn(
          `The ${readingsTable} table is empty — no rooms have been tagged yet.`
        );
      }
    } else {
      console.warn(
        'No room_aps or fingerprints table found — this database has no Wi-Fi readings.'
      );
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
    return { nodes, edges, fingerprints };
  }

  /**
   * Read Wi-Fi readings into { node_id: [{ bssid, ssid, rssi }] }.
   *
   * Handles both table shapes:
   *   room_aps    — one row per (room, network), signal in `rssi_mean`
   *   fingerprints — one row per raw reading, signal in `rssi`
   *
   * `ssid` is not stored in either table any more (matching keys on BSSID), so
   * it comes back as an empty string, which is what the app expects.
   *
   * @param {object} db            an open sql.js Database
   * @param {string} readingsTable 'room_aps' or 'fingerprints'
   */
  readFingerprints(db, readingsTable) {
    const result = {};

    const res = readingsTable === 'room_aps'
      ? db.exec(`
          SELECT node_id, bssid, ROUND(rssi_mean) AS rssi
          FROM room_aps
          ORDER BY node_id, bssid;
        `)
      : db.exec(`
          SELECT node_id, bssid, rssi
          FROM fingerprints
          ORDER BY node_id;
        `);

    if (res.length === 0) return result;

    const cols = res[0].columns;
    const nodeIdx = cols.indexOf('node_id');
    const bssidIdx = cols.indexOf('bssid');
    const rssiIdx = cols.indexOf('rssi');
    if (nodeIdx < 0 || bssidIdx < 0 || rssiIdx < 0) {
      console.warn(`Unexpected columns in ${readingsTable}:`, cols);
      return result;
    }

    for (const row of res[0].values) {
      const nodeId = String(row[nodeIdx]);
      if (!result[nodeId]) result[nodeId] = [];
      result[nodeId].push({
        bssid: row[bssidIdx],
        ssid: '',
        rssi: Math.round(row[rssiIdx])
      });
    }

    return result;
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
      edges: data.edges || [],
      fingerprints: data.fingerprints || {}
    };
  }
}
