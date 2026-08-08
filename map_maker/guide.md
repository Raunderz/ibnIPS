# Map Maker Application Guide & Architectural Specification

## 1. Overview & Objectives
The **Map Maker** application is a visual interactive tool designed to construct indoor floor maps, node meshes, and navigation graphs from backend database records (`icps.db`). 

It provides an intuitive visual canvas where nodes extracted from the backend database can be arranged using mouse drag-and-drop, connected with path edges, organized by floor levels, and exported into the standard JSON map format used by the navigation engine and mobile apps (`lite_app` / `kt_app`).

---

## 2. System Architecture

```
                       +-----------------------------+
                       |  Backend Database (icps.db) |
                       +--------------+--------------+
                                      |
                           (Upload / Local Load)
                                      v
         +---------------------------------------------------------+
         |               Map Maker Web Application                 |
         |                                                         |
         |  +---------------------+       +---------------------+  |
         |  |   SQLite DB Parser  | ----> | Node & Edge Manager |  |
         |  |   (sql.js / WASM)   |       |    (State Store)    |  |
         |  +---------------------+       +----------+----------+  |
         |                                           |             |
         |  +----------------------------------------v----------+  |
         |  |             Interactive 2D Mesh Canvas            |  |
         |  |     - Drag-and-drop node movement                 |  |
         |  |     - Edge creation & distance calculations       |  |
         |  |     - Floor level filtering & background maps     |  |
         |  |     - Grid snap, pan, zoom & alignment guidelines |  |
         |  +----------------------------------------+----------+  |
         |                                           |             |
         |  +----------------------------------------v----------+  |
         |  |                 JSON Exporter                      |  |
         |  |           (Outputs final map schema)               |  |
         |  +---------------------------------------------------+  |
         +---------------------------------------------------------+
                                      |
                               (Save / Download)
                                      v
                       +-----------------------------+
                       |     final_map.json Output   |
                       +-----------------------------+
```

---

## 3. Key Capabilities & Features

### A. Database Import & Data Parsing
- **Direct SQLite (.db) Loading**: Client-side SQLite engine (`sql.js` WebAssembly) allows users to select or drag & drop their `icps.db` file directly into the browser.
- **Backend API Integration**: Fallback option to fetch live nodes from running Gleam HTTP backend API endpoints (`/api/map` or `/api/nodes`).
- **Automatic Schema Mapping**: Extracts node records (ID, name, floor, initial X/Y coordinates, BLE/Wi-Fi fingerprints) into interactive node entities.

### B. Interactive 2D Mesh Canvas
- **Mouse Drag-and-Drop**: Smooth, 60fps canvas node placement.
- **Edge Creation & Mesh Wiring**: Click-to-connect nodes to define navigation corridors and topological edges.
- **Pan & Zoom Controls**: Infinite canvas viewport with smooth mouse wheel zooming and click-and-drag panning.
- **Grid Snap & Alignment Helpers**: Toggleable grid snapping, axis locking, and snap-to-neighbor lines for precise geometric layout creation.
- **Multi-Floor Support**: Floor selector tabs to isolate or overlay nodes per floor.
- **Floor Plan Image Overlay**: Ability to upload a floorplan image (PNG/JPG/SVG) behind the node mesh to align nodes accurately with physical building layouts.

### C. Inspection & Editing Side Panel
- **Node Properties Editor**: Edit node labels, floor numbers, room types (corridor, room, stair, elevator).
- **Edge Properties Editor**: Set directionality, step counts, obstacle flags, or accessibility attributes.
- **Bulk Action Toolbar**: Select multiple nodes to align horizontally/vertically or auto-space.

### D. Export & State Persistence
- **JSON Map Export**: One-click export producing standard map JSON compatible with the Android application.
- **Project Save/Load**: Save in-progress layout work to local storage or re-import exported JSON files for incremental updates.

---

## 4. Technical Stack
- **Framework & Runtime**: Vite + HTML5 Canvas / Modern ES6 Javascript + Vanilla CSS Design System.
- **Styling**: Premium Dark-Mode UI, CSS Glassmorphism, smooth micro-interactions, custom fonts (Inter/Outfit).
- **Database Engine**: `sql.js` (WebAssembly SQLite reader in browser) + Web Fetch API.
- **Export Format**: Standard JSON Schema matching `MapResponse.java` (`nodes` array & `edges` array).

---

## 5. JSON Output Schema Specification

```json
{
  "building": "Main Campus",
  "version": "1.0",
  "floors": [1, 2],
  "nodes": [
    {
      "node_id": "node_001",
      "name": "Entrance Hall",
      "floor": 1,
      "x": 150,
      "y": 300,
      "type": "corridor"
    },
    {
      "node_id": "node_002",
      "name": "Lab 101",
      "floor": 1,
      "x": 420,
      "y": 300,
      "type": "room"
    }
  ],
  "edges": [
    {
      "from_node": "node_001",
      "to_node": "node_002",
      "steps": 12,
      "direction": "E",
      "bidirectional": true
    }
  ]
}
```

---

## 6. Project Directory Layout (`map_maker/`)

```
map_maker/
├── guide.md               # Complete Guide & Specification Document (this file)
├── index.html             # Main Application HTML Entry Point
├── package.json           # Project Metadata & Scripts
├── vite.config.js         # Vite Configuration
├── src/
│   ├── css/
│   │   ├── main.css       # Core Design Tokens, Modern Glassmorphism Theme
│   │   └── canvas.css     # Canvas & Overlay Styling
│   ├── js/
│   │   ├── app.js         # Application Controller & Lifecycle
│   │   ├── dbLoader.js    # SQLite (.db) & API Data Ingestion Module
│   │   ├── canvasEngine.js# Canvas Renderer, Node Drag-and-Drop, Pan/Zoom
│   │   ├── meshBuilder.js # Edge Creation & Topology Manager
│   │   ├── uiController.js# Sidebar, Floor Selector, Modal Controllers
│   │   └── exporter.js    # JSON Export & Validation Module
│   └── assets/            # Icons and Default Sample Assets
```

---

## 7. Implementation Plan Phases
1. **Phase 1**: Setup project directory `map_maker`, initialize package configuration, and write `guide.md`.
2. **Phase 2**: Implement SQLite `.db` ingestion and UI file loader component (`dbLoader.js`).
3. **Phase 3**: Build high-performance HTML5 Canvas mesh editor (`canvasEngine.js`, node drag-and-drop, line edges, grid snapping, pan/zoom).
4. **Phase 4**: Develop Sidebar UI controllers for node property editing, floor filtering, floorplan image overlays, and edge editing (`uiController.js`).
5. **Phase 5**: Implement JSON exporter, load/save capabilities, and verify accuracy against sample `icps.db`.

---

## 8. Verification & Review
Upon completion, the application will be validated by:
- Importing `icps.db` from backend.
- Dragging nodes into a cohesive floor mesh layout on the canvas.
- Linking nodes with edges.
- Exporting `map.json` and verifying that nodes & edges accurately match the runtime map parser format.
