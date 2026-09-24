# ibnIPS

**I Better Navigate** — Indoor Positioning System.

Indoor positioning for campus buildings using ambient Wi-Fi. No GPS, no beacons, no extra hardware.

**Canonical stack: `lite_app` (Android) + `backend` (Gleam).** Other frontends and tools in this repo are secondary/experimental.

## What It Does

- Scans nearby Wi-Fi networks and matches fingerprints against tagged rooms
- Shows your position on a floor plan (custom Canvas renderer)
- Tags rooms to improve accuracy over time
- Works with local fingerprint matching when the backend position endpoint is unavailable

## Repo Layout

| Path | Role | Status |
|------|------|--------|
| `lite_app/` | Pure-Java Android app (~400KB APK, no external deps) | **Primary frontend** |
| `backend/` | Gleam/wisp API on Erlang/BEAM + SQLite | **Primary backend** |
| `map_maker/` | Browser map editor (Vite + vanilla JS) → exports `map.json` | Tooling |
| `app/` | React Native (Expo) frontend | Secondary / experimental |
| `kt_app/` | Kotlin + Jetpack Compose frontend | Secondary / experimental |

## Architecture

```
lite_app (Android, pure Java)
  ↓ HTTP JSON (Bearer JWT)
backend (Gleam / wisp / mist on BEAM)
  ├─→ SQLite (icps.db)  — users, sessions, nodes, edges, fingerprints
  └─→ map.json          — local file, or remote URL via MAP_JSON_URL

map_maker (browser)  —→  exports map.json  —→  backend / Docker image
```

`GET /api/map` does **not** query SQLite. It serves `map.json` directly: local file by default, or a remote URL if `MAP_JSON_URL` is set.

## Backend

Gleam service (`backend/`). Runs on wisp + mist, binds `0.0.0.0`, port `3000` (or `$PORT`). Creates and migrates `icps.db` on first run.

### Run

```bash
cd backend
gleam run          # serve on :3000
gleam test
gleam format
```

### Docker

```bash
cd backend
docker build -t ibnips-backend .
docker run -p 3000:3000 -e JWT_SECRET=... ibnips-backend
```

The image copies `map.json` in at build time. Override at runtime with `MAP_JSON_URL` if needed.

### Environment Variables

Read from OS env first, then a `.env` file in the working directory (supports `#` comments and quoted values).

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes (prod) | HS256 signing secret. Falls back to a hardcoded dev value if unset. |
| `PORT` | No | Listen port (default `3000`) |
| `MAP_JSON_URL` | No | Remote URL for `GET /api/map`. If unset, reads local `map.json`. |

Example `.env`:

```env
JWT_SECRET=change_me_in_production
MAP_JSON_URL=https://example.com/maps/map.json
```

### API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | Health check |
| `POST` | `/api/auth` | No | Issue JWT (`@kiit.ac.in` email; roll number becomes `user_id`) |
| `POST` | `/api/ping` | Yes | Tag a room with Wi-Fi fingerprints |
| `GET` | `/api/nodes` | No | List all nodes |
| `GET` | `/api/map` | No | Full graph from `map.json` / `MAP_JSON_URL` |
| `GET` | `/api/db/download` | No | **Dev-only:** download `icps.db` — disable in production |

Full API docs: [`backend/schema.md`](backend/schema.md). Backend details: [`backend/README.md`](backend/README.md).

### Auth Model

- `POST /api/auth` requires an `@kiit.ac.in` email; extracts roll number (e.g. `23b1234`) as `user_id`.
- Issues an **HS256 JWT** (`sub`, `sid`, `iat`, `exp` +24h) signed with `JWT_SECRET`.
- **Server-side sessions:** `sid` is checked against the `sessions` table on every protected request. Expired/missing session → 401 even if the JWT is still valid.

### Database (SQLite)

- `nodes` — room graph vertices (`node_id`, `name`, `floor`, `x`, `y`); coordinates assigned via `map_maker`
- `edges` — navigation mesh (`from_node`, `to_node`, `steps`, `direction` N/NE/E/…/NW)
- `fingerprints` — Wi-Fi readings per node (`bssid`, `ssid`, `rssi`, `sample_count`)
- `users`, `sessions` — auth

Node id convention: `lowercased_name_underscores_f<floor>` (e.g. `lab_201_f2`).

## lite_app (Primary Frontend)

Minimal **pure-Java** Android app — framework APIs + `org.json` + `HttpURLConnection` only. No Kotlin, no AndroidX. Targets API 26+ (Android 8.0+). Package `com.example.ibnips`.

### Features

- **SCAN** — Wi-Fi scan (GPS must be ON); results read after a short delay
- **PING** — tag a room: saves fingerprints locally (SharedPreferences), then `POST /api/ping`
- **FETCH MAP** — `GET /api/map`, renders the graph, merges returned fingerprints locally
- **LOCATE ME** — tries backend position matching first; falls back to **local fingerprint matching** with confidence tiers (≥75% high, ≥50% medium, <30% rejected)
- Auto-authenticates on startup with a `@kiit.ac.in` address
- Custom Canvas floor plan with animated pin

### Build

```bash
cd lite_app
./build.sh              # debug APK
./build.sh install      # install + adb reverse tcp:3000 tcp:3000 (local backend)
./build.sh release      # R8/minified
```

Production base URL is hardcoded in `HttpBackendClient.java` (`https://ibnips.onrender.com`). For local dev, use `./build.sh install` so `adb reverse` routes to your machine's `:3000`.

## map_maker (Map Editor)

Browser tool for arranging the building navigation mesh. Loads `icps.db` client-side (sql.js/WASM) or via `GET /api/map`. Exports:

- **`map.json`** — backend-contract graph (`nodes` + `edges` only)
- **`map_project.mapproj`** — richer editor project state

```bash
cd map_maker
bun install && bun run dev     # or npm
bun run build                  # → dist/ (committed)
```

Related: `backend/export_map.sh` merges DB rows into an existing `map.json` while preserving hand-placed x/y.

## Secondary Frontends

- **`app/`** — React Native (Expo, TypeScript, expo-router). Has mock mode and offline caching. Not the primary path.
- **`kt_app/`** — Kotlin + Jetpack Compose (Retrofit, Hilt). Experimental.

Treat `lite_app` + `backend` as source of truth for behavior and API contracts.

## Known Issues

- **Cold start:** Positioning is weak until enough fingerprints are tagged.
- **Signal bleed:** Adjacent-floor APs can cause misfloor detection.
- **Sparse coverage:** Few Wi-Fi networks → poor accuracy.
- **Crowded environments:** Interference reduces reliability.
- **Stale fingerprints:** Readings from decommissioned APs accumulate.
- **`POST /api/position` is not implemented** on the backend; lite_app falls back to local matching.

## Possible Improvements

- Server-side position endpoint (`POST /api/position`) to replace client-side fallback
- Fingerprint aging and automatic cleanup
- Multi-device fingerprint aggregation
- Kalman filtering for smoother tracking
- Coverage heatmaps
- Move `backend/.github/workflows/test.yml` to repo root so CI actually runs (nested `.github` is ignored by GitHub)

## Deployment

- Backend: port `3000` (or `$PORT`), needs `JWT_SECRET` in production; current deploy target `https://ibnips.onrender.com`
- Disable or gate `GET /api/db/download` in production
- Docker image available (`backend/Dockerfile`); no docker-compose in-repo
- lite_app builds to APK for Android distribution

## Team

- Backend: Position algorithms, API, database design
- Frontend: Map UI, Wi-Fi scanning, real-time updates
- Database: Schema, data validation, query optimization
- Testing: End-to-end validation, mock data scenarios
