# ibnIPS Backend API Schema

Base URL: `http://localhost:3000`

Indoor Positioning System backend. All endpoints are under `/api`. Responses are
always `application/json`. Auth uses a bearer token in the `Authorization` header.

---

## Table of Contents

- [Auth](#auth)
- [Logout](#logout)
- [Ping (tag a room)](#ping)
- [Position (locate the caller)](#position)
- [Get Nodes](#get-nodes)
- [Get Map](#get-map)
- [Shared Types](#shared-types)
- [Validation Rules](#validation-rules)
- [Error Format](#error-format)

---

## Auth

### `POST /api/auth`

Exchange the shared access key and an email address for an auth token. The
email **must** end with `@kiit.ac.in`.

**Request body**

```json
{
  "email": "user@kiit.ac.in",
  "access_key": "<the AUTH_KEY value>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | yes | Must end with `@kiit.ac.in`; the roll number becomes `user_id` |
| `access_key` | string | yes | The shared secret from `AUTH_KEY` |

> **The access key is the entire authentication story here.** This endpoint
> issues a token to whoever supplies the key, and anyone who has it can log in
> as any `@kiit.ac.in` address — there is no per-user password or email
> verification. That is fine for a single shared campus deployment where the key
> is only known to the mapping team, and is *not* fine if this grows into a
> system with untrusted users, which would need real per-user credentials.

The key is compared in constant time, so it cannot be discovered one character
at a time by timing rejections.

> **A wrong key gives the same answer whatever email was sent with it**, so the
> endpoint does not confirm which addresses are real.

**200 OK**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": "23b1234"
}
```

> Tokens are **HS256 JWTs** signed with the `JWT_SECRET` env var. They embed a
> server-side session id (`sid`) checked against the `sessions` table on every
> request, and expire 24 hours after issuance. Request a new one if yours has
> expired.

**Errors**

| Status | Body |
|--------|------|
| `401` | `{"error":"unauthorized","details":"Invalid or missing access key"}` |
| `403` | `{"error":"unauthorized","details":"Email must end with @kiit.ac.in"}` |
| `400` | `{"error":"invalid_email","details":"Invalid email format: must be roll_no@kiit.ac.in"}` |
| `400` | `{"error":"invalid_json","details":"Could not parse request body"}` |

> A missing `access_key` field is an `invalid_json` error, not a key error.

---

## Logout

### `POST /api/auth/logout` (auth required)

Revokes the caller's session. The token itself stays cryptographically valid
until `exp`, but every protected route re-checks the `sid` claim against the
`sessions` table, so a revoked token stops working immediately.

**Headers**: `Authorization: Bearer <token>`

**200 OK**

```json
{ "status": "logged_out" }
```

**Errors**

| Status | Body |
|--------|------|
| `401` | `{"error":"unauthorized","details":"Invalid or missing token"}` or `"Session expired or not found"` |
| `429` | `{"error":"rate_limited",...}` |
| `500` | `{"error":"database_error","details":"<msg>"}` |

> Expired sessions are purged from the `sessions` table on each successful
> login, so the table does not grow without bound.

---

## Ping

### `POST /api/ping` (auth required)

Creates a node (room) and its Wi-Fi fingerprints, and optionally links it to a
previous node via an edge. Sends the token as `Authorization: Bearer <token>`.

**Request body**

```json
{
  "name": "Lab 201",
  "floor": 2,
  "previous_node_id": "",
  "steps": -1,
  "direction": "",
  "fingerprints": [
    { "bssid": "aa:bb:cc:dd:ee:ff", "ssid": "IITB-WiFi", "rssi": -65 }
  ]
}
```

**Field reference**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Human-readable room name, e.g. `"Lab 201"`. Must contain at least one letter or digit |
| `floor` | int | yes | Building floor number, `-10` to `100` |
| `previous_node_id` | string | yes | Node id of the previous room in the walk. `""` = first room |
| `steps` | int | yes | Steps from previous room. `-1` = first room (null) |
| `direction` | string | yes | One of `N, NE, E, SE, S, SW, W, NW`. `""` = first room |
| `fingerprints` | array | yes | Wi-Fi scan readings (may be empty `[]`) |

**200 OK** (returns the node id, which is created or reused on dedupe)

```json
{
  "status": "created",
  "node_id": "lab_201_f2"
}
```

> **Dedupe:** rooms are identified by `node_id`, derived from the name and
> floor, so tagging `"Lab 201"` again reuses the existing row rather than
> creating a second one. If `previous_node_id` links to an edge pair that
> already exists, the edge insert is silently ignored.

> **Repeat tagging accumulates, it does not duplicate.** Each scan folds into
> the room's running mean and spread for every network it sees. Tagging the same
> room a hundred times still occupies one row per distinct network, and the
> accumulated spread is what lets a reading that is 10 dBm off the mean still
> count as a match. This is the mechanism to rely on for improving accuracy:
> walk a room more, and its entry gets sharper rather than bigger.

**Node id format:** lowercased name, every character that is not `a-z` or `0-9`
replaced with `_`, then `_f<floor>`
(e.g. `"Lab 201"` + floor `2` → `lab_201_f2`).

> `"Lab 201"`, `"Lab-201"` and `"LAB/201"` all produce `lab_201_f2` and therefore
> all resolve to the same room. That is deliberate — the id is derived from the
> name, so one room must map to one row regardless of how it was spelled. Two
> genuinely different rooms must therefore have names that differ by more than
> punctuation, or they will merge.

**Errors**

| Status | Body |
|--------|------|
| `401` | `{"error":"unauthorized","details":"Invalid or missing token"}` |
| `400` | `{"error":"invalid_json","details":"Could not parse ping request"}` |
| `400` | `{"error":"validation_failed","details":"<msg>"}` (see [validation rules](#validation-rules)) |
| `400` | `{"error":"unknown_previous_node","details":"No room with node_id ..."}` |
| `413` | Request body larger than 64 KiB (empty body) |
| `429` | `{"error":"rate_limited","details":"Too many requests. Try again later."}` |
| `500` | `{"error":"database_error","details":"<msg>"}` |

> **Atomicity:** the node, its fingerprints and its edge are written in one
> transaction on a connection dedicated to the request. A failure — including a
> rejected `previous_node_id` — rolls the whole thing back, so a `400` never
> leaves a half-written room behind.

---

## Position

### `POST /api/position` (auth required)

Locates the caller from a live Wi-Fi scan. Every room tagged via
`POST /api/ping` is scored against the scan and the best one is returned, so a
room tagged once is usable from every device — no per-device fingerprint
storage needed.

**Request body** — the caller's current scan and nothing else:

```json
{
  "fingerprints": [
    { "bssid": "aa:bb:cc:dd:ee:ff", "ssid": "IITB-WiFi", "rssi": -65 }
  ]
}
```

**200 OK**

```json
{
  "x": -400,
  "y": -60,
  "floor": 2,
  "node_id": "lab_201_f2",
  "name": "Lab 201",
  "confidence": 88,
  "confidence_level": "High"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `x`, `y` | int | The matched room's map coordinates |
| `floor` | int | The matched room's floor |
| `node_id` | string | The matched room |
| `name` | string | The matched room's name |
| `confidence` | int | 0–100 — how much the match is worth |
| `confidence_level` | string | `High` / `Medium` / `Low` / `Uncertain` |
| `samples` | int | How many times the matched room has been walked — the fewest visit count among the networks that agreed |

> **`x`/`y` come from the `nodes` table, which is `0,0` until a room is placed
> on the map.** Real coordinates live in `map.json` (served by
> [`GET /api/map`](#get-map)). A client that already has the map should look
> the room up by `node_id` and use *its* coordinates — that is what `lite_app`
> does. `0,0` is a legal coordinate, so treat a `0,0` pair as "unplaced", not
> as a position at the origin.

**Confidence**

Each room remembers every network as a **mean signal and a spread**, not a
single reading — the signal in one room moves as you walk to the other side of
it. A live reading is compared against that spread: is it plausible for this
room, rather than does it match exactly.

**Ranking** first, by points:

- `+1` for every network the room and the caller both see (more agreeing
  networks wins — one BSSID is visible from several rooms at once)
- `−2` for every network whose reading sits further from the room's mean than
  the allowed gap below

The allowed gap is `2 × spread`, with two bounds applied:

| Bound | Value | Why |
|-------|-------|-----|
| Floor | 8 dBm | A room seen once has a spread of exactly zero. Without a floor it would reject every later reading. |
| Ceiling | 15 dBm | Without a ceiling, a room whose signal swung wildly would agree with any reading at all — walk a room while pacing around with the phone in your pocket and its spread grows until it matches scans from other rooms. |

15 dBm is roughly how far a signal moves between opposite corners of a normal
room, so genuine movement stays forgiven while a reading from somewhere else is
rejected.

Ties break on lower total strain, then on `samples`. That last tiebreak matters:
a room seen once and a room seen a hundred times can produce identical readings,
and without it the thinly-mapped room wins by luck of ordering.

**Confidence** then, on a 0–100 scale:

| Shared networks | Base | Penalty per unit of strain | Floor |
|-----------------|------|---------------------------|-------|
| ≥ 3 | 95 | 30 | 20 |
| 2 | 85 | 35 | 15 |
| 1 | 60 | 40 | 10 |

Strain is how much of each reading's allowed spread was used: 0 when every
reading lands on the room's mean, 1 when every reading lands at the edge of
what the room normally produces.

Finally the score is capped by how much has actually been recorded:

| `samples` | Max confidence |
|-----------|----------------|
| < 3 | 60 |
| 3–9 | 85 |
| ≥ 10 | 100 |

> **This is what makes repeated tagging pay off.** A room seen once cannot say
> how much its signal usually moves, so it is capped at 60% however well its one
> reading happens to match. Ten visits lift the cap to 100%. The cap is the
> reason a thinly-mapped room cannot outrank a well-mapped one.

`confidence_level` labels the result: `High` ≥ 75, `Medium` ≥ 50, `Low` ≥ 30,
otherwise `Uncertain`.

> **The server does not hide a weak match.** A room that barely beats the
> others is still returned, with a low confidence, rather than turned into a
> `404`. It is the caller's job to decide what is good enough — `lite_app`
> treats anything below 30% as no answer and falls back to its local match.

> **Networks go stale.** A network not heard in a room for **180 days** is
> ignored when matching, so APs that have been decommissioned or moved stop
> counting against a room that no longer looks like its old self.

**Errors**

| Status | Body |
|--------|------|
| `401` | `{"error":"unauthorized","details":"Invalid or missing token"}` |
| `400` | `{"error":"invalid_json","details":"Could not parse position request"}` |
| `400` | `{"error":"validation_failed","details":"No Wi-Fi readings in the request"}` (empty `fingerprints`) |
| `400` | `{"error":"validation_failed","details":"Too many fingerprints in one request (max 200)"}` |
| `404` | `{"error":"no_match","details":"..."}` — no tagged room shares a single BSSID with the scan, or nothing has been tagged yet |
| `413` | Request body larger than 64 KiB (empty body) |
| `429` | `{"error":"rate_limited","details":"Too many requests. Try again later."}` |
| `500` | `{"error":"database_error","details":"<msg>"}` |

An empty `fingerprints` list is a `400` rather than a `404`: an empty scan
carries no evidence, which is a different problem from scanning a room the
server has never seen.

---

## Get Nodes

### `GET /api/nodes` (no auth)

List all nodes. Useful for a selector / dropdown.

**200 OK** — array of nodes:

```json
[
  { "node_id": "lab_201_f2", "name": "Lab 201", "floor": 2, "x": 0, "y": 0 }
]
```

**Errors**

| Status | Body |
|--------|------|
| `500` | `{"error":"database_error","details":"<msg>"}` |

---

## Get Map

### `GET /api/map` (no auth)

Full graph (nodes + edges) for rendering the map on the frontend.

**200 OK**

```json
{
  "nodes": [
    { "node_id": "lab_201_f2", "name": "Lab 201", "floor": 2, "x": 0, "y": 0 }
  ],
  "edges": [
    { "from_node": "lab_201_f2", "to_node": "lab_202_f2", "steps": 15, "direction": "N" }
  ]
}
```

**Errors**

| Status | Body |
|--------|------|
| `500` | `{"error":"database_error","details":"<msg>"}` |

---

## Shared Types

### Node

```json
{
  "node_id": "string",
  "name": "string",
  "floor": "int",
  "x": "int (0 until set)",
  "y": "int (0 until set)"
}
```

`x`/`y` are map coordinates. Currently always `0` (not yet wired up on the
backend), so the frontend must assign positions itself.

### Edge

```json
{
  "from_node": "string (node_id)",
  "to_node": "string (node_id)",
  "steps": "int",
  "direction": "string (N, NE, E, SE, S, SW, W, NW)"
}
```

### Fingerprint

A reading in a request body — what the client saw, at that moment:

```json
{
  "bssid": "string (MAC)",
  "ssid": "string",
  "rssi": "int (dBm)"
}
```

### Stored RoomAP

What the server keeps per (room, network) pair in `room_aps`. Not part of any
request or response — listed here because it is the state accuracy accumulates
into:

```json
{
  "node_id": "string (node_id)",
  "bssid": "string (MAC, lower-cased)",
  "rssi_mean": "float (average signal in dBm)",
  "rssi_m2": "float (sum of squared differences from that average)",
  "n": "int (how many readings)",
  "first_seen": "int (unix epoch seconds)",
  "last_seen": "int (unix epoch seconds)"
}
```

`rssi_m2` is kept alongside `n` rather than storing every reading, which is
what lets a room accumulate unlimited visits in constant space. The spread used
for matching is `sqrt(rssi_m2 / n)`.

---

## Validation Rules

Rules for `steps` and `direction` depend on whether the node is the first room:

**First room** (`previous_node_id == ""`):
- `steps` **must** be `-1`
- `direction` **must** be `""`

**Non-first room** (non-empty `previous_node_id`):
- `steps` **must** be `> 0`
- `direction` **must** be one of `N, NE, E, SE, S, SW, W, NW`

| Scenario | `previous_node_id` | `steps` | `direction` | Result |
|----------|--------------------|---------|-------------|--------|
| First room | `""` | `-1` | `""` | ok |
| First room | `""` | `5` | `""` | `400` |
| Linked | `"lab_201_f2"` | `15` | `"N"` | ok |
| Linked | `"lab_201_f2"` | `-1` | `""` | `400` |
| Linked | `"lab_201_f2"` | `10` | `"UP"` | `400` |
| Linked | `"lab_201_f2"` | `0` | `"N"` | `400` |
| Linked | `"lab_201_f2"` | `100000` | `"N"` | `400` |

**Size and range limits** (all `400 validation_failed`):

| Field | Limit | Why |
|-------|-------|-----|
| `name` | 1–100 characters, at least one letter or digit | A blank or punctuation-only name yields the id `_f1`, and every other punctuation-only name collides with it |
| `floor` | `-10` to `100` | Below-ground floors are negative; no building has 100 floors |
| `steps` | 1–1000 for a linked room | |
| `fingerprints` | 200 readings per request | |
| `fingerprints[].rssi` | `-120` to `0` dBm | See below |
| request body | 64 KiB (`413` rather than `400`) | |

> **`rssi` is bounded because readings cannot be undone.** Each reading folds
> into a room's running mean, and there is no way to remove one afterwards. A
> single reading of `999999` drags the mean to ~500000, after which no real
> reading can ever match that room again — it would take ~100,000 further walks
> to recover. Rejecting out-of-range values at the door is the only fix;
> real Wi-Fi readings sit roughly in `-100..-30` dBm.

Checks run in request-body order, so a request with several problems is
reported for the first one only.

> **One scan counts as one visit.** If a request lists the same network more
> than once — in any mix of upper and lower case, since BSSIDs are compared
> case-insensitively — only the strongest reading is kept. The visit count is
> what caps a room's confidence, so counting duplicates would let a single
> request mark a never-visited room as fully mapped.

---

## Error Format

All errors share the same shape:

```json
{
  "error": "machine_readable_code",
  "details": "human_readable_message"
}
```

| Code | Meaning |
|------|---------|
| `invalid_json` | Body was not valid JSON / missing required fields |
| `invalid_email` | Email did not match the `roll_no@kiit.ac.in` format |
| `unauthorized` | Invalid/missing access key, bad email domain, or invalid/missing bearer token |
| `validation_failed` | A field violated the [validation rules](#validation-rules) |
| `unknown_previous_node` | `previous_node_id` does not name an existing room |
| `no_match` | No tagged room shares a Wi-Fi network with the scan (`404`) |
| `rate_limited` | Over the per-client request quota (60 per 60s) |
| `database_error` | SQL/DB failure |

## Rate Limiting

Every `/api/*` route is limited to **60 requests per 60-second window**, keyed on
the left-most `x-forwarded-for` entry. Over the quota returns `429`. `GET /` is
exempt so uptime monitors are not throttled.

`x-forwarded-for` is set by Render and Cloudflare in front of the service. It is
client-controlled if the server is reached directly, so it identifies a bucket
to charge requests against — not an identity, and not a security boundary.

---

## Frontend Notes

- **Auth flow:** call `POST /api/auth` once with an `@kiit.ac.in` email and the
  `AUTH_KEY` value, store the token, and send it on every `POST /api/ping` as
  `Authorization: Bearer <token>`. Treat the key like a password: keep it out of
  source control and out of shared screenshots.
- **Building the map:** fetch `GET /api/map`; render `nodes` (with x/y positions
  you assign) and draw `edges` between `from_node` → `to_node`.
- **Room tagging walk:** the app walks room-by-room; each room sends
  `previous_node_id` = the previous room's returned `node_id` (or `""` for the
  first), `steps` = count, `direction` = compass heading.
- **Locating:** send the live scan to `POST /api/position` and use the returned
  `node_id` to place the user — look the room up in the map already fetched from
  `GET /api/map` for its real coordinates rather than trusting the server's
  `x`/`y`. Check `confidence` before believing the answer, and fall back to your
  own matching (or say "uncertain") below your threshold.
