# Map Maker — Complete Guide & Build Plan

**Project:** `map_maker/` — a browser tool to arrange building nodes by mouse into a
navigation mesh, then export the finished map as JSON.

**Input:** `icps.db` (SQLite) from `backend/`. **Output:** `map.json` matching the
backend `/api/map` contract so the mobile apps (`lite_app` / `kt_app`) and the
backend can consume it directly.

---

## 1. Goal

A single-page tool where you:

1. Load the backend database (`icps.db`) — drag & drop or via the running backend API.
2. See every node as a draggable dot on an infinite canvas, grouped by floor.
3. Connect nodes with edges by clicking them (the mesh).
4. Drag nodes into real-world layout positions (walls, corridors, rooms).
5. Export the final arrangement as `map.json` that exactly matches the backend format.

No server needed — everything runs in the browser. SQLite is read in-browser via
`sql.js` (WebAssembly).

---

## 2. Data Model (from `backend/icps.db`)

The real schema (confirmed in `backend/schema.md` and `backend/src/db.gleam`):

```sql
CREATE TABLE nodes (
  node_id TEXT PRIMARY KEY,      -- e.g. "lab_201_f2"
  name    TEXT NOT NULL,         -- e.g. "Lab 201"
  floor   INTEGER NOT NULL,      -- building floor number
  x       INTEGER DEFAULT 0,     -- map coordinate (0 until set!)
  y       INTEGER DEFAULT 0
);

CREATE TABLE edges (
  edge_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  from_node TEXT NOT NULL,       -- node_id
  to_node   TEXT NOT NULL,       -- node_id
  steps     INTEGER NOT NULL,    -- walk steps between nodes
  direction TEXT NOT NULL DEFAULT ''  -- N, NE, E, SE, S, SW, W, NW
);

CREATE TABLE fingerprints (...); -- Wi-Fi data, NOT used by the map
```

**Important fact:** every node currently has `x = 0, y = 0` (the backend has not
assigned positions). The Map Maker is what assigns real coordinates — that is its
whole purpose. So on import, the app must **auto-layout** nodes so they are usable
immediately, then let the user drag them into place.

---

## 3. Export Contract (must match backend exactly)

The backend `/api/map` returns, and mobile apps expect, this shape. Our exporter
emits exactly this:

```json
{
  "nodes": [
    { "node_id": "lab_201_f2", "name": "Lab 201", "floor": 2, "x": 512, "y": 380 }
  ],
  "edges": [
    { "from_node": "lab_201_f2", "to_node": "lab_202_f2", "steps": 15, "direction": "N" }
  ]
}
```

Rules:
- `node_id` **must** be the original DB id (or new id for newly added nodes).
- `floor` is an int. `x`/`y` are ints (rounded).
- Edge `direction` must be one of `N, NE, E, SE, S, SW, W, NW` (or `""`).
- Edge `steps` is an int.

To make `steps`/`direction` meaningful, the app **auto-computes** them from geometry
when an edge is drawn or a node is moved (see §6).

### Optional extended save
The **project save** (see §7) may store extra editor-only fields (`type`, `created_at`,
`bg_image`). These are stripped before export so the exported file stays backend-pure.

---

## 4. Current Code Status (what already exists)

The folder was scaffolded and partially built. This is verified working code today:

| File | Status | Notes |
|------|--------|-------|
| `guide.md` | rewrite (this) | — |
| `index.html` | done | Navbar, canvas, tools bar, sidebar, floor tabs, hidden file inputs |
| `package.json` / `bun.lock` | done | Vite + `sql.js`; scripts: `dev`, `build`, `preview` |
| `vite.config.js` | done | Port 3000, sql.js excluded from optimize |
| `src/css/main.css` | done | Dark glassmorphism theme |
| `src/js/dbLoader.js` | done | sql.js init (CDN wasm), parses `nodes`/`edges` tables flexibly, `fetchFromApi()` for `GET /api/map` |
| `src/js/canvasEngine.js` | done | Canvas render, node drag, pan (mid/alt-drag), wheel zoom, grid snap, edge rubberband, floor filtering, bg image overlay |
| `src/js/exporter.js` | partial | Downloads JSON **but format does NOT match backend** — needs fixing (§5) |
| `src/js/uiController.js` | partial | Toolbar, node property form, floor tabs, delete, stats wired; **import-JSON path and edge stats incomplete** |
| `src/js/app.js` | partial | Boots with **hard-coded sample nodes** instead of loading the DB |

**What's missing / wrong:**
1. Exporter adds `building`, `version`, `created_at`, `type` — extra fields the
   backend doesn't produce. Must be removed to match §3.
2. No auto-layout on import (nodes land at x=0,y=0, all stacked).
3. `app.js` starts from fake sample data instead of prompting to load the DB.
4. No way to **save/restore** work-in-progress other than the DB-format export.
5. New nodes get id `node_xxxx` (random) instead of backend-style ids.
6. Edge `steps`/`direction` are hard-coded defaults, not computed from geometry.

---

## 5. Build Plan (what I will do, in order)

### Phase A — Fix the export contract
- Rewrite `exporter.js` to emit exactly the §3 shape:
  - `nodes`: `node_id, name, floor, x, y` (ints).
  - `edges`: `from_node, to_node, steps, direction`.
  - No extra keys. Pretty-printed JSON, filename `map.json`.
- Add a **pre-export validation report** (see §8) that surfaces problems before download.

### Phase B — Auto-layout on import
- When nodes come in with all-zero (or duplicate) coordinates, spread them out:
  - Simple smart scatter: arrange by floor, then ring/grid layout per floor so
    nothing overlaps, starting near the canvas center at (0,0).
- Mark any node whose position was *auto-assigned* so the user knows it isn't real yet
  (subtle dashed outline until dragged once).

### Phase C — Correct boot flow in `app.js`
- Remove fake sample data. On startup show a friendly empty state: "Load DB file or
  fetch from backend."
- Wire an **API fetch** button: `GET http://localhost:8080/api/map` (auth not required),
  with the URL configurable, so you don't need to upload the file each time.
- Always auto-layout after any load.

### Phase D — Real editing conveniences
- **Edge auto-steps & auto-direction:** when an edge is created *or* a node is moved,
  recompute:
  - `steps` = round(euclidean distance between nodes ÷ step-scale), `steps >= 1`.
  - `direction` = compass from `from_node → to_node` (atan2 → N/NE/E/SE/S/SW/W/NW).
  - Edge label shows `steps` live.
- **New node ids** follow backend style: slug of name + floor, e.g. `north_exit_f1`,
  with collision suffix (`_2`) if taken.
- **Edge inspector:** click an edge to edit its `steps`/`direction` manually in the
  sidebar (overrides auto).
- **Keyboard shortcuts:** `V` select, `E` edge, `N` add node, `Del` delete,
  `+`/`-` zoom, `0` fit-view.
- **Fit view button**: center + zoom-to-bounds the active floor.

### Phase E — Project save / restore
- **Save project** (`File` → `Save Project`): download a `.mapproj` JSON that includes
  nodes, edges, per-floor bg images (data URLs) and editor state. This is the
  *work-in-progress* file.
- **Open project** re-imports `.mapproj`.
- Keeps DB-format `.json` (map.json) export separate and always backend-pure.

### Phase F — Polish & verify
- Status bar: node/edge counts, current floor, zoom %, unsaved-change dot.
- Cursor feedback (grab/grabbing, crosshair in add-node mode, pointer over nodes).
- Verify against `backend/icps.db` (§9).

---

## 6. Interaction Spec (mouse-driven mesh editing)

| Action | Result |
|--------|--------|
| Drag node (Select tool) | Moves node, snaps to grid if enabled, live-updates edge labels |
| Click node then click another (Edge tool) | Creates an edge between them, auto `steps`/`direction` |
| Click empty canvas (Add-Node tool) | Creates a node at cursor on the active floor |
| Wheel | Zoom to cursor |
| Drag empty canvas (middle or Alt+left) | Pan |
| Click node (Select tool) | Selects; sidebar shows/edits its props |
| Delete (tool or `Del`) | Removes selected node + its connected edges |
| Floor tab | Isolates that floor's nodes; edges across floors still render |

Nodes are rendered as colored dots:
- **corridor / room / stair / entrance** color-coded (map from DB `name` heuristics
  for now, editable in sidebar).
- Selected = ring + glow. Hover = lighter fill. Auto-placed = dashed ring.

---

## 7. File Layout (final)

```
map_maker/
├── guide.md               # this spec
├── index.html             # UI scaffold (exists)
├── package.json           # vite + sql.js (exists)
├── vite.config.js         # (exists)
├── src/
│   ├── css/main.css       # theme (exists)
│   └── js/
│       ├── app.js         # boot, empty state, API fetch, shortcuts
│       ├── dbLoader.js    # sql.js + API ingestion (exists, minor fixes)
│       ├── layout.js      # NEW: auto-layout engine (per-floor scatter)
│       ├── canvasEngine.js# canvas/drag/pan/zoom (exists, +fit-view, dashed auto-flag)
│       ├── geometry.js    # NEW: compass direction + steps calc
│       ├── uiController.js# toolbar/sidebar/floors (exists, +edge inspector)
│       └── exporter.js    # backend-pure map.json + validation + .mapproj
```

No new dependencies. Stays vanilla JS + Canvas + `sql.js`.

---

## 8. Export Validation (before download)

`exporter.js` will run these checks and warn (with a confirm dialog) on:
- Node with `x`/`y` still `(0,0)` or never dragged (auto-layout position).
- Edges referencing a node id that doesn't exist.
- Node ids that aren't unique.
- Direction not in the compass set.
- `steps <= 0`.
- Floors with 0 nodes.

Warnings don't block export — user chooses to fix or export anyway.

---

## 9. Verification

1. `cd map_maker && bun install && bun run dev` (or `npm`).
2. Load `backend/icps.db` → all nodes appear spread out on their floors.
3. Drag nodes to arrange; draw edges; move nodes and confirm edge labels update.
4. Export → `map.json` parses and has ONLY the §3 keys.
5. Round-trip: `GET /api/map` output should load through Import JSON and look identical.
6. Import `map.json` back in → layout restored exactly.

---

## 10. Decisions & Trade-offs

- **Client-side sql.js** chosen so the tool works with zero server setup; the API
  fetch is a convenience fallback, not a dependency.
- **x/y in DB are the source of truth once set** — Map Maker is the tool that sets
  them; nothing else needs to change in the backend.
- **Auto-layout is non-destructive** — it only runs when positions are all-zero, and
  any real (dragged) position always wins.
- **fingerprints table is ignored** — it's for positioning, not map topology.
