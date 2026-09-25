# ibnIPS Web

Mobile-first React frontend for ibnIPS indoor campus navigation.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local`. During local development, leave
`VITE_API_BASE_URL` empty so the Vite server proxies the same-origin
`/__ibnips` path to `DEV_PROXY_TARGET`:

```env
VITE_API_BASE_URL=
DEV_PROXY_TARGET=http://localhost:3000
```

Run the development server:

```bash
npm run dev
```

Validate the project:

```bash
npm run lint
npm run build
```

## Screens

| Route | Screen | Notes |
| --- | --- | --- |
| `/` | Home | Search-first entry, current-location status, recent destinations, live campus totals |
| `/login` | Login | Existing `POST /api/auth` flow, 24-hour bearer token, expired/unauthorized notices |
| `/search` | Search | Debounced, case-insensitive partial search over the live location catalog |
| `/search?node=<id>` | Destination preview | Bottom sheet with floor, node id, start navigation, view on map |
| `/map` | Navigation shell | Live map graph with floor switcher, pan, zoom, and destination selection |
| `/navigate?node=<id>` | Navigation shell | Destination-focused map, real connected locations, honest positioning state |
| `/account` | Account | Protected session details and sign out |
| `/sign-in` | Redirect | Redirects to `/login` |
| `*` | Not found | Mobile error screen |

## Data sources

The client only renders data returned by the backend:

- `GET /api/nodes` for the SQLite node list
- `GET /api/map` for nodes, directed edges, and optional Wi-Fi fingerprints
- `POST /api/auth` for the 24-hour bearer token
- `GET /` for the health chip

`getCampusCatalog` merges both node sources by `node_id`, preferring the map
payload, and reports when only one source responded. Nothing is invented: when
both endpoints are empty, the UI shows an explicit empty state.

Search matches room, building, and node names with partial, case-insensitive
input, ranked by exact name, prefix, substring, then node id. Recent
destinations are stored in `localStorage` on the device and only contain nodes
the user actually previewed.

## Deliberate limitations

- The backend exposes no position or localization endpoint, and browsers cannot
  read Wi-Fi BSSIDs, so current location stays unavailable instead of guessed.
- There is no backend pathfinding, so the navigation shell shows the
  destination and its real connected locations without fabricated directions,
  distance, or ETA.
- The backend sends no CORS headers and does not handle preflight requests, so a
  production browser deployment must point `VITE_API_BASE_URL` at a same-origin
  reverse proxy. Calling `https://ibnips.onrender.com` directly from a browser
  allows the simple health request but blocks authenticated POSTs.
