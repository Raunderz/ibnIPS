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
| `JWT_SECRET` | Yes (prod) | Secret for signing JWT tokens. Falls back to a hardcoded dev value if unset. |
| `PORT` | No | Server port (default: `3000`) |
| `MAP_JSON_URL` | Yes (prod) | Remote URL for map.json used by `GET /api/map`. Read from OS env or a `.env` file. Set this in Render (or locally via `.env`). `map.json` is **not** committed. If unset, falls back to local `./map.json`. |

## API

See [`schema.md`](schema.md) for full API documentation.
