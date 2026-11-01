=== OUTLINE ONLY — ibnIPS (i blame network Internal Positioning System) ===

1. TITLE (≤15 words)
i blame network Indoor Positioning System — Wi-Fi Fingerprint Room Matching

2. ABSTRACT (~200 words)
ibnIPS is an indoor positioning system for campus buildings using ambient Wi-Fi signals. No GPS, beacons, or extra hardware. Rooms are fingerprinted by mean signal + spread per BSSID; a live scan is matched against stored distributions. Confidence is reported (0–100, capped by visit count: <3→60, 3–9→85, ≥10→100). Backend: Gleam/BEAM + SQLite (or Turso). Frontends: Android (lite_app, pure Java, ~44KB APK), React Native (app/), browser map editor (map_maker/). Auth via kiit-auth-v2 access codes (JWT, HS256). Key features: progressive accuracy with coverage, graceful offline fallback to local matcher, bounded DB growth (per-room/network, not per-visit), rate limiting (60/min), stale-network expiry (180 days). Limitations: sparse coverage, signal bleed, unweighted networks, room name dedup by punctuation normalization.

3. INTRODUCTION — Objectives & Contributions (1.5 pages outline)
- Problem: GPS fails indoors; beacon/infra-based systems are expensive.
- Objective: room-level indoor location using existing Wi-Fi APs only.
- Contributions:
  • Fingerprint matching with statistical spread (mean + variance), not fixed values.
  • Progressive accuracy: repeated tagging sharpens model (constant space per room/network).
  • Shared model: one walk benefits all devices; no per-user history.
  • Confidence scoring with tiered caps based on visit count (prevents thin maps outranking thick ones).
  • Graceful degradation: offline local matcher; weak answers shown as weak.
  • Bounded growth: DB rows ∝ distinct rooms × networks, not visits.
  • Privacy-first: position derived on-device from ambient signals; no tracking required.

4. TECHNIQUES / TECHNOLOGIES — Workflow & Diagrams (1.5 pages outline)
Stack:
- Backend: Gleam (functional, Erlang/BEAM VM) → SQLite / Turso (libsql). JWT auth (HS256, 30-day exp, sid session check).
- Frontend: lite_app (Java Android, framework-only, HttpURLConnection, org.json, Canvas MapView, no AndroidX); app/ (React Native, Expo, TypeScript); frontend/ (Vite, web); map_maker/ (browser, sql.js WASM, canvas mesh editor, Vite).
- Auth service: kiit-auth-v2 (issues access codes, owns auth_identities table).
- Data: map.json (nodes + edges with x/y, floor, steps, direction); SQLite (nodes, edges, fingerprints, room_aps with mean/m2/n/first/last, feedback).
Workflow diagram outline:
[Phone scans Wi-Fi] → [POST /api/auth (code→token)] → [POST /api/ping (tag room: name, floor, fingerprints, previous_node, steps, dir)] → [DB writes node + fingerprints (mean/spread updated) + edge] → [POST /api/position (live scan)] → [Score each room vs spread; points = agree - 2×surprise; tie-break on strain, samples] → [Return node_id, x/y, floor, confidence, confidence_level, samples] → [App renders dot on map.json coordinates; falls back locally if confidence <30].
Matching formula outline: allowed_gap = min(15, max(8, 2×spread)). Points = +1 agree, -2 surprise (reading beyond gap). Confidence = base(≥3 nets:95, 2:85, 1:60) - 30/35/40×strain; capped by visit tier.

5. DESIGN & SRS — Screenshots & Features (1.5 pages outline)
Screens / features (described since no rendered screenshots provided):
- Lite app: FrameLayout (MapView canvas full-screen) + bottom overlay (Scan / Ping / Fetch Map / Locate Me buttons; status label; room EditText; floor Spinner). Canvas: black edges (1px), blue node circles (r=8), red user dot (r=5), compass rose, grid background on load, animated user dot (ValueAnimator pulse halo), button press scale (ViewPropertyAnimator), status fade. Permissions: ACCESS_FINE_LOCATION, CHANGE_WIFI_STATE, INTERNET, ACCESS_NETWORK_STATE (runtime request API 26+). Size target <700KB (actual ~44KB).
- Map Maker: navbar (Load DB, Fetch API, Import JSON, Save Project, Export Map JSON); infinite canvas; draggable nodes; edge rubberband; floor tabs; grid snap; sidebar inspector (node properties, floor, x/y); export must match backend contract exactly (node_id, name, floor, x, y; edge: from_node, to_node, steps, direction — no extra fields).
- Backend schema (from schema.md): auth (POST /api/auth: code→token, user_id), logout, ping, position, nodes (GET, no auth), map (GET, no auth), feedback (POST no auth, optional Bearer for user_id attribution).
- Key SRS features: fingerprint validation (rssi -120..0, max 200 readings, same BSSID deduped case-insensitively, strongest kept); ping validation (name 1-100 chars with letter/digit, floor -10..100, steps 1-1000 for linked / -1 for first, direction N/NE/E/SE/S/W/NW or empty); position returns confidence + level; stale network filter 180 days; rate limit 60/min per x-forwarded-for.

6. IMPLEMENTATION (0.5–1 page outline)
- Backend (Gleam): backend.gleam (routes), ping.gleam (node id normalization, fingerprint folding, DB transaction), position.gleam (best_match scoring, allowed_gap, confidence tiers, stale filter), app_auth.gleam (JWT verify + session join to auth_identities), database.gleam (SQLite/Turso connection), db.gleam (schema, migrations), rate_limit.gleam.
- Lite app (Java Android): build.gradle (minSdk 26, targetSdk 34, R8, no deps); AndroidManifest (permissions); WifiScanResult, MapResponse/Node/Edge, PositionResponse models; WifiScanner (startScan/getLastScanResults); HttpBackendClient (HttpURLConnection + org.json); MapView (Canvas onDraw with fit-to-screen, grid, pulse halo); MainActivity (permission request, button handlers, animate user dot, status updates).
- Map maker: index.html (structure), main.css (dark glassmorphism), dbLoader.js (sql.js WASM), canvasEngine.js (drag, pan, zoom, edge draw), exporter.js (must strip extra fields, emit exact backend JSON), uiController.js, app.js.
- App/React Native: tabs (navigate, account, index, map), hooks (useAuthSession, usePositionEstimate, useLocationCatalog), components (CampusMap, FloorSelector, Badge, Card), services (navigation, authSession), fingerprintMatcher.

7. TESTING (1–2 pages outline)
Methodology:
- Unit tests (Gleam / gleeunit): JWT sign/verify/reject (wrong secret, tampered payload, expired, malformed); ping validation (first room null, linked positive steps, bad direction, overlong name, absurd floor, out-of-range rssi, max fingerprints, punctuation-only name); node id normalization (lowercase, punctuation→_, floor suffix); stats (empty, average, spread=0 for identical, spread grows, single reading spread=0); position validation (empty scan, single reading, too many); best_match logic (no shared network→None, empty room set→None, high confidence well-mapped, tolerates inside spread, wildly off = surprise (-2), prefers more shared nets, well-mapped beats once-seen, thin cap=60, tier limits, never reports thin as high, case-insensitive, one network per scan collapse, keeps strongest of duplicates, noisy room penalizes off readings but accepts near mean); access code hash (matches auth service SHA-256, lowercase 64-char, stable, distinguishes); hygiene (empty/reject blank, trim whitespace, reject oversized); one_reading_per_network (collapse mixed case, keep distinct, empty→empty, keep strongest, stable order).
- Manual checklist (lite_app): permissions granted; Scan shows count; Ping returns node_id; Fetch Map renders nodes/edges; Locate Me updates red dot + status label; APK size <700KB.
- Comparison with existing features:
  • GPS indoor: fails (ibnIPS uses existing Wi-Fi, no satellite line-of-sight).
  • Beacon systems (iBeacon/UWB): require new hardware (ibnIPS requires none).
  • Fixed-value fingerprint DBs: degrade with signal drift (ibnIPS uses mean+spread, adapts with visits).
  • Per-user tracking systems: violate privacy (ibnIPS shared model, no user movement history required).
  • No-confidence black-box matchers: hide uncertainty (ibnIPS reports confidence level + caps low on thin data).

8. CONCLUSION (~200 words)
ibnIPS demonstrates that indoor room-level positioning is achievable with only ambient Wi-Fi and statistical fingerprinting. The system's core insight — storing distributions rather than fixed readings, and capping confidence by actual visit count — makes progressive mapping practical without unbounded data growth. The Gleam/BEAM backend provides a robust, transaction-safe API with strict validation and session-bound JWT auth; the minimal Android client and browser map editor show the contract works end-to-end. Limitations (signal bleed, sparse coverage, unweighted networks, name-based dedup) are acknowledged and bounded, not hidden. Future work: network weighting by room visibility, motion smoothing, coverage heatmaps. The project confirms a privacy-preserving, hardware-free approach to indoor navigation that improves with every walk rather than degrading.

NOTE: ibnIPS = i blame network Internal Positioning System (per user correction).
