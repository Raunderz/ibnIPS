# ibnIPS Web

Mobile-first React frontend for the ibnIPS indoor positioning system.

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

## Backend contract

The API client uses the endpoints implemented in `backend/src/backend.gleam`:

- `GET /` for health
- `POST /api/auth` for a 24-hour bearer token
- `GET /api/nodes` for the SQLite node list
- `GET /api/map` for the map graph served from `MAP_JSON_URL`
- `POST /api/ping` for authenticated room tagging

The backend does not send CORS headers or handle preflight requests. A
production browser deployment must set `VITE_API_BASE_URL` to a same-origin
reverse proxy path. Directly calling `https://ibnips.onrender.com` from a
browser will allow the simple health request but block authenticated POSTs.
