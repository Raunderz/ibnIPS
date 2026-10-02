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
| `AUTH_KEY` | **Always** (in practice) | Shared access key clients must send to `POST /api/auth`, min 16 chars. Generate with `openssl rand -hex 16`. The server still boots without it, but **every login is refused** — the endpoint issues a token to whoever asks, so this is the only thing stopping anyone from claiming another user's account. Clients read it from the key field in the app. |
| `PORT` | No | Server port (default: `3000`) |
| `DB_PATH` | Yes (prod) | SQLite file path (default: `icps.db`). **Set `/tmp/icps.db` on Render** — the working directory is read-only, so the default cannot be created. Data is lost on redeploy either way. |
| `MAP_JSON_URL` | Yes (prod) | Remote URL for map.json used by `GET /api/map`. Read from OS env or a `.env` file. Set this in Render. `map.json` is **not** committed. If unset, falls back to local `./map.json`. |
| `DATABASE_URL` | No | Turso database URL, e.g. `libsql://host`. **When set to a real value it takes precedence over `DB_PATH`** and the server uses Turso instead of a local file. |
| `DATABASE_TOKEN` | No | Turso auth token. Read together with `DATABASE_URL`; both are needed for Turso to be used. |

### Which database am I writing to?

The server names the database it opened on the first line of its startup output:

```
Database: local SQLite file at icps.db
Database: Turso at libsql://your-db.turso.io
```

If you asked for a local file and it says Turso, `DATABASE_URL`/`DATABASE_TOKEN` are set somewhere — the OS environment or a `.env` file in the working directory, which is read automatically. The server also prints a `WARNING: DB_PATH is set but ignored` line in that case.

This matters because a populated `.env` means **every local `gleam run` writes to that remote database**, including test data. Keep production credentials in Render's dashboard and leave those two keys out of your local `.env`.

## API

See [`schema.md`](schema.md) for full API documentation.
