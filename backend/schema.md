# ICPS Backend API Schema

Base URL: `http://localhost:3000`

Indoor Positioning System backend. All endpoints are under `/api`. Responses are
always `application/json`. Auth uses a bearer token in the `Authorization` header.

---

## Table of Contents

- [Auth](#auth)
- [Ping (tag a room)](#ping)
- [Get Nodes](#get-nodes)
- [Get Map](#get-map)
- [Shared Types](#shared-types)
- [Validation Rules](#validation-rules)
- [Error Format](#error-format)

---

## Auth

### `POST /api/auth`

Generate an auth token. The email **must** end with `@iitb.ac.in`.

**Request body**

```json
{
  "email": "user@iitb.ac.in"
}
```

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
| `403` | `{"error":"unauthorized","details":"Email must end with @iitb.ac.in"}` |
| `400` | `{"error":"invalid_email","details":"Invalid email format: must be roll_no@iitb.ac.in"}` |
| `400` | `{"error":"invalid_json","details":"Could not parse request body"}` |

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
| `name` | string | yes | Human-readable room name, e.g. `"Lab 201"` |
| `floor` | int | yes | Building floor number |
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

> **Dedupe:** If a node with the same `name` + `floor` already exists, it is
> reused (no duplicate row). If `previous_node_id` links to an edge pair that
> already exists, the edge insert is silently ignored.

**Node id format:** `lowercased_name_with_underscores_f<floor>`
(e.g. `"Lab 201"` + floor `2` → `lab_201_f2`).

**Errors**

| Status | Body |
|--------|------|
| `401` | `{"error":"unauthorized","details":"Invalid or missing token"}` |
| `400` | `{"error":"invalid_json","details":"Could not parse ping request"}` |
| `400` | `{"error":"validation_failed","details":"<msg>"}` (see [validation rules](#validation-rules)) |
| `500` | `{"error":"database_error","details":"<msg>"}` |

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

```json
{
  "bssid": "string (MAC)",
  "ssid": "string",
  "rssi": "int (dBm)"
}
```

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
| `invalid_email` | Email did not match the `roll_no@iitb.ac.in` format |
| `unauthorized` | Bad email domain, or invalid/missing bearer token |
| `validation_failed` | `steps`/`direction` violated [validation rules](#validation-rules) |
| `database_error` | SQL/DB failure |

---

## Frontend Notes

- **Auth flow:** call `POST /api/auth` once with an `@iitb.ac.in` email, store the
  token, and send it on every `POST /api/ping` as `Authorization: Bearer <token>`.
- **Building the map:** fetch `GET /api/map`; render `nodes` (with x/y positions
  you assign) and draw `edges` between `from_node` → `to_node`.
- **Room tagging walk:** the app walks room-by-room; each room sends
  `previous_node_id` = the previous room's returned `node_id` (or `""` for the
  first), `steps` = count, `direction` = compass heading.
