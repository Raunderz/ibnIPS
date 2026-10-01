# Changelog

All notable changes to ibnIPS will be documented in this file.

## [Unreleased]

### Added
- `POST /api/position` — server-side Wi-Fi fingerprint localisation, so a room tagged once locates from every device
- React Native (Expo) frontend with real-time indoor positioning
- Kotlin (Jetpack Compose) Android app
- Lightweight Java Android app (no external dependencies)
- Gleam backend with SQLite storage
- Browser-based map editor (Vite + sql.js)
- Wi-Fi fingerprint-based room tagging
- JWT authentication (@kiit.ac.in emails)
- Floor detection and floor plan display
- Mock mode for offline testing
- CI: Gemini AI code review on PRs

### Changed
- Wi-Fi readings are stored as running per-(room, network) statistics (`room_aps` table) instead of one row per reading, so repeat tagging accumulates accuracy in constant space rather than growing the table
- Positioning scores a live reading against each room's signal *spread*, not a single reading — a room can now be matched from a different part of itself
- Confidence is capped by how many visits back a room, so a thinly-mapped room cannot outrank a well-mapped one
- Networks not heard in a room for 180 days are ignored when matching
- Node ids normalise every non-alphanumeric character, so `"Lab-201"` and `"Lab 201"` resolve to the same room

### Fixed
- Failed SQLite writes were reported as success — constraint violations (duplicate node id, unique email) returned `200` and silently discarded the write
- Tagging a room under a name that normalised to an existing room's id wrote its fingerprints onto that other room instead of being rejected
- `POST /api/auth` accepted an empty roll number, creating a user with an empty id
- Out-of-range signal strengths were folded into a room's running mean. Because a reading cannot be removed once recorded, one bogus value made a room permanently unmatchable; `rssi` is now bounded to -120..0 dBm
- Blank, whitespace-only and punctuation-only room names were accepted, producing a room named `""` with id `_f1` that any other punctuation-only name collides with
- Absurd floor numbers were accepted, creating rooms on floors like `-99999`
- Ping validation was one nested `case` per field; it is now one named function per field, applied in order
- `POST /api/auth` requires a shared `AUTH_KEY` sent as `access_key`; the app has a key field and remembers it
- A scan listing the same network repeatedly counted as several visits, so one request could push a never-visited room past the confidence cap that limits how much a single reading can be trusted. Each scan now counts once per network.
- The gap between a reading and a room's average had no ceiling, so a room whose signal swung widely grew to agree with any reading at all and began matching scans taken elsewhere. The gap is now capped at 15 dBm.
- CI: Gleam test and format checks

## Security Notes

Partly addressed:

- `POST /api/auth` now requires a shared `AUTH_KEY`, compared in constant time.
  This closes the open endpoint, but it is a shared secret rather than per-user
  credentials — anyone holding the key can still log in as any `@kiit.ac.in`
  address. Fine for a closed mapping team; not sufficient if untrusted users are
  ever let in, which would need real per-user authentication.
- Rate limiting keys on `x-forwarded-for`, which a client can set freely, so the
  quota is still bypassable by rotating the header.
- `GET /api/nodes` and `GET /api/map` remain unauthenticated and expose the full
  building layout and every observed access point.
