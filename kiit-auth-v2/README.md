# kiit-auth

Google-verified identity and per-roll-number access codes for KIIT users.

Replaces the previous service, which handed every user the same shared secret
(`AUTH_KEY`) and derived their identity from a client-supplied email. Anyone
holding that one key could claim any roll number. Here the email is proved by a
Google ID token and the identity is bound server-side, so a code resolves to
exactly one person.

Written in **Civet** (CoffeeScript-style syntax compiling to TypeScript), runs
on **Bun**, deployed to **Vercel**, backed by **Turso/libSQL**.

## How the pieces fit

```
kiit-auth  ── verifies Google ID token, issues an access code bound to a roll number
    │
    ├── auth_identities.code_hash  →  roll_number      (the contract)
    │
backend (Gleam)  ── resolves a code to a roll number, issues its own JWT + session
```

The backend reads exactly two columns, `code_hash` and `roll_number`. It never
needs to call this service at runtime, so **kiit-auth being down does not stop
anyone logging in** — only issuing and rotating new codes.

Codes are long-lived rather than single-use, because the Android app
re-authenticates on every launch after its JWT expires; a burned code would send
users back to Google every 24 hours. The security win here is the binding, not
short-lived credentials.

## API

| Method | Path                 | Auth          | Purpose                                   |
| ------ | -------------------- | ------------- | ----------------------------------------- |
| `GET`  | `/`                  | none          | Login page                                |
| `GET`  | `/healthz`           | none          | `200` ok, `503` when the database is down |
| `POST` | `/auth/google`       | Google token  | Sign in; issue a code on first login      |
| `GET`  | `/api/me`            | `x-api-key`   | Who this code belongs to                  |
| `POST` | `/api/code/rotate`   | `x-api-key`   | Replace a lost code                       |

```sh
curl -X POST http://localhost:3000/auth/google \
  -H 'Content-Type: application/json' \
  -d '{"credential":"<google-id-token>"}'
```

A code is returned **only** on first issue or explicit rotation — only its
SHA-256 digest is stored, so it cannot be shown again.

## Configuration

Copy `.env.example` to `.env`. Nothing is read at import time; a deployment
missing its secrets answers `503` with a readable message instead of crashing,
which is what keeps preview deployments alive.

| Variable              | Required | Notes                                                    |
| --------------------- | -------- | -------------------------------------------------------- |
| `DATABASE_URL`        | yes      | Turso URL. `libsql://host` or `libsql:host`               |
| `DATABASE_TOKEN`      | yes      | Turso auth token                                          |
| `GOOGLE_CLIENT_ID`    | yes      | Must list the deployment origin in the Google console     |
| `ALLOWED_DOMAIN`      | no       | Default `kiit.ac.in`. Needs ≥3 labels — see `config.civet` |
| `ACCESS_CODE_BYTES`   | no       | Default 24 (16–64)                                        |
| `TRUST_PROXY`         | no       | **Set to 1 on Vercel** — see below                       |
| `NODE_ENV`            | no       |                                                           |

### Why `TRUST_PROXY=1` matters

Rate limiting keys on the client address. On Vercel the platform terminates TLS
and forwards, so `x-forwarded-for` is the only place that address appears.

- Left at `0` — every caller lands in one bucket, so the limit throttles everyone
  together. A shared bucket is a denial of service on your own login page.
- Set too high — a client can spoof `x-forwarded-for` and pick its own bucket,
  which defeats the limit entirely.

Set it to the real hop count.

## Deployment notes

**Rate limits live in the database, not in memory.** Serverless instances are
recycled constantly, so a `Map` of counters resets and the limit is never
actually enforced. Counters go in Turso via a single
`INSERT ... ON CONFLICT ... RETURNING`, so the read and the increment are atomic
despite there being no writable CTEs or multi-statement transactions over this
transport.

**Nothing connects at import time.** A cold start that blocks on the network
eats the function timeout and returns hard errors while the instance warms.
Migrations run on first database use, behind a module-level promise, so a warm
instance pays once.

**Graceful shutdown is intentionally absent.** Serverless instances do not get a
useful `SIGTERM`; the previous service's shutdown handler would have been dead
code.

## Development

```sh
bun install
cp .env.example .env      # fill in real values
bun run dev               # Bun runs the .civet sources directly
bun run check             # compile + typecheck + test
```

`bun run check` runs three things, all of which must pass:

1. `scripts/check.sh` — compiles Civet to TypeScript into `build/`, after
   lint-style guards for the Civet constructs documented below
2. `civet --typecheck` — typechecks the Civet sources
3. `bun test build/test/` — 59 tests

Tests are compiled to `build/test/` because `bun test` only collects
`.js`/`.ts` files. Source and test output sit at the same depth, so a test's
`../src/x.civet` import resolves unchanged.

## Civet 0.11.16 — constructs that bite

Civet is pre-1.0, so these were learned by hitting them. Versions are pinned
exactly in `package.json`; `scripts/check.sh` guards the ones that fail silently.

**Guarded automatically:**

| Rule | Why |
| ---- | --- |
| `const X := v` is invalid | `const` already declares; use `const X = v` or a bare `X := v` |
| no `{` after a function signature | Civet closes bodies by dedent; the `{` never closes |
| no `{` in return-type position | Parsed as a block; use a named type alias |
| infix `isnt` | **Compiles to a call** — `a isnt b` becomes `a(isnt(b))`. Parses, typechecks, then throws at runtime. Use `!=`. `is` is fine |
| no `=> {` in test callbacks | A body line starting with `identifier(` is parsed as an object property, so `expect(...).toBe(...)` silently becomes `toBe: expect(...)` |

That last one and `isnt` are the dangerous pair: both produce output that looks
plausible and *still runs*. `isnt` throws only on the affected line; the test
mangling returns an object instead of asserting. Neither is caught by typecheck
or by the tests themselves.

**Style used throughout as a result:** indentation bodies instead of `=> {`,
explicit `return undefined` where a callback's value is consumed, named types
instead of inline object types, and `let` with `=` rather than `:=`.

## Layout

| File               | Role                                                      |
| ------------------ | --------------------------------------------------------- |
| `src/config.civet` | Environment validation, pure and synchronous                |
| `src/result.civet` | Two-case return type                                        |
| `src/crypto.civet` | Code generation, SHA-256 hashing                           |
| `src/domain.civet` | Email → roll number, the `@`-anchored domain check          |
| `src/db.civet`     | Turso over HTTPS, hand-rolled — zero dependencies          |
| `src/schema.civet` | Idempotent migrations                                       |
| `src/ratelimit.civet` | Database-backed limiter                                  |
| `src/google.civet` | ID token verification                                       |
| `src/service.civet`| Identity and code lifecycle                                 |
| `src/app.civet`    | Routes, security headers, rate limits                      |
| `api/index.ts`     | Vercel entry (plain TypeScript, Node-style handler)         |

## Notes for whoever works on this next

**Table names are namespaced `auth_`.** This service and the Gleam backend share
one Turso database, and `CREATE TABLE IF NOT EXISTS` guards a table's
*existence* but never its *shape*. Both services creating a table called `users`
means whichever boots first wins, and the other starts cleanly against the wrong
columns, failing only later at query time. Distinct names make that impossible.

**`src/db.civet` avoids inline casts and chained `map`/`forEach`.** That is
stylistic, but the reason is that this file is the fallback if Civet moves
underneath us — readable emitted TypeScript is the escape hatch. The compiled
output in `build/` is that fallback.

**The backend's `sessions` table has `FOREIGN KEY(user_id) REFERENCES
users(user_id)`.** If identity moves fully to this service, that clause needs
dropping or keeping an empty `users` table, or the backend's schema will not
match reality.