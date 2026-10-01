# ibnIPS Backend

Gleam backend for the ibnIPS indoor positioning system. Runs on Erlang/BEAM with SQLite.

## Requirements

- [Gleam](https://gleam.run/) v1.0+
- Erlang/OTP 26+

## Setup

```sh
gleam run          # Run the server
gleam test         # Run tests
gleam format       # Format code
```

The server starts on port 3000 (or `$PORT`). It creates `icps.db` automatically on first run.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Always** | Secret for signing JWT tokens, min 32 chars. The server refuses to start if unset, too short, or set to a placeholder — there is no hardcoded fallback, because a secret in this repository would let anyone forge valid tokens. Generate one with `openssl rand -hex 32`. |
| `PORT` | No | Server port (default: `3000`) |
| `DB_PATH` | Yes (prod) | SQLite file path (default: `icps.db`). **Set `/tmp/icps.db` on Render** — the working directory is read-only, so the default cannot be created. Data is lost on redeploy either way. |
| `MAP_JSON_URL` | Yes (prod) | Remote URL for map.json used by `GET /api/map`. Read from OS env or a `.env` file. Set this in Render (or locally via `.env`). `map.json` is **not** committed. If unset, falls back to local `./map.json`. |

## API

See [`schema.md`](schema.md) for full API documentation.
