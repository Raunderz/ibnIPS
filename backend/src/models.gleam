// models.gleam
// All shared type definitions for the ICPS backend.
// Keeping types in one module makes it easy to see the whole data model
// and avoids circular imports between handler modules.

import gleam/dynamic/decode
import gleam/json

// --- Types ---

/// A physical room/location.
pub type Node {
  Node(
    node_id: String,
    // e.g. "lab_201_f2" (deterministic, from name + floor)
    name: String,
    // human-readable name, e.g. "Lab 201"
    floor: Int,
    // building floor number
    x: Int,
    // x coordinate on map (0 if not set yet)
    y: Int,
    // y coordinate on map (0 if not set yet)
  )
}

/// A single Wi-Fi signal reading.
pub type Fingerprint {
  Fingerprint(
    bssid: String,
    // Wi-Fi MAC address, e.g. "aa:bb:cc:dd:ee:ff"
    ssid: String,
    // network name, e.g. "IITB-WiFi"
    rssi: Int,
    // signal strength in dBm, e.g. -65
  )
}

/// A directed connection between two nodes.
pub type Edge {
  Edge(
    from_node: String,
    // node_id of the starting room
    to_node: String,
    // node_id of the destination room
    steps: Int,
    // number of steps to walk
    direction: String,
    // one of: N, NE, E, SE, S, SW, W, NW
  )
}

/// What the app sends when tagging a room.
pub type PingRequest {
  PingRequest(
    name: String,
    // room name, e.g. "Physics Lab 201"
    floor: Int,
    // which floor
    previous_node_id: String,
    // empty string means "first room in chain"
    steps: Int,
    // steps from previous room (-1 if first room)
    direction: String,
    // direction from previous (empty if first room)
    fingerprints: List(Fingerprint),
    // Wi-Fi scan results
  )
}

/// What the app sends to log in.
///
/// `access_key` is the shared secret from `AUTH_KEY`. It is required, because
/// `POST /api/auth` issues a token to whoever asks: without the key, anyone
/// could claim any account.
pub type AuthRequest {
  AuthRequest(email: String, access_key: String)
}

/// What the app sends to ask where it is: the current Wi-Fi scan and nothing
/// else. The server holds the tagged side of the comparison.
pub type PositionRequest {
  PositionRequest(fingerprints: List(Fingerprint))
}

/// The room the server believes the caller is in, plus how sure it is.
///
/// `confidence` is 0–100 and `confidence_level` is the matching tier
/// ("High" / "Medium" / "Low" / "Uncertain"). The caller decides what counts
/// as good enough — the server reports the best match it found rather than
/// hiding a weak one, so a low-confidence answer is visibly weak.
pub type PositionResult {
  PositionResult(
    node: Node,
    // the matched room, including its map coordinates
    confidence: Int,
    // 0–100
    confidence_level: String,
    // "High" / "Medium" / "Low" / "Uncertain"
    samples: Int,
    // how many tagged readings the answer is based on
  )
}

/// Standard error response shape: `{"error": code, "details": message}`.
pub type ErrorResponse {
  ErrorResponse(error: String, details: String)
}

/// Full graph for the frontend map: all nodes and edges.
pub type MapData {
  MapData(nodes: List(Node), edges: List(Edge))
}

// --- JSON Decoders ---
// These functions tell Gleam how to parse JSON into our types.

/// Decoder for an `AuthRequest` from JSON.
pub fn decode_auth_request() -> decode.Decoder(AuthRequest) {
  use email <- decode.field("email", decode.string)
  use access_key <- decode.field("access_key", decode.string)
  decode.success(AuthRequest(email, access_key))
}

/// Decoder for a single `Fingerprint` from JSON.
///
/// Lives here rather than in the handler so every endpoint that reads Wi-Fi
/// readings decodes them the same way.
pub fn decode_fingerprint() -> decode.Decoder(Fingerprint) {
  use bssid <- decode.field("bssid", decode.string)
  use ssid <- decode.field("ssid", decode.string)
  use rssi <- decode.field("rssi", decode.int)
  decode.success(Fingerprint(bssid, ssid, rssi))
}

/// Decoder for a `PositionRequest` from JSON.
pub fn decode_position_request() -> decode.Decoder(PositionRequest) {
  use fingerprints <- decode.field(
    "fingerprints",
    decode.list(decode_fingerprint()),
  )
  decode.success(PositionRequest(fingerprints))
}

// --- JSON Encoders ---
// These functions convert our types back into JSON for responses.

/// Encode a `Node` as JSON.
pub fn encode_node(node: Node) -> json.Json {
  json.object([
    #("node_id", json.string(node.node_id)),
    #("name", json.string(node.name)),
    #("floor", json.int(node.floor)),
    #("x", json.int(node.x)),
    #("y", json.int(node.y)),
  ])
}

/// Encode an `Edge` as JSON.
pub fn encode_edge(edge: Edge) -> json.Json {
  json.object([
    #("from_node", json.string(edge.from_node)),
    #("to_node", json.string(edge.to_node)),
    #("steps", json.int(edge.steps)),
    #("direction", json.string(edge.direction)),
  ])
}

/// Encode an `ErrorResponse` as JSON.
pub fn encode_error(err: ErrorResponse) -> json.Json {
  json.object([
    #("error", json.string(err.error)),
    #("details", json.string(err.details)),
  ])
}

/// Encode the full graph (`MapData`) as JSON.
pub fn encode_map_data(data: MapData) -> json.Json {
  json.object([
    #("nodes", json.array(data.nodes, encode_node)),
    #("edges", json.array(data.edges, encode_edge)),
  ])
}

/// Encode a `PositionResult` as JSON.
///
/// `x`/`y` are the matched node's map coordinates. They are `0` until a room
/// has been placed on the map, so a client that cannot use coordinates should
/// key off `node_id` and look the node up in the map it already fetched from
/// `GET /api/map`.
///
/// `samples` is how many tagged readings back this answer. A low `samples` next
/// to a high `confidence` means the room matched well but has barely been
/// visited — worth more walks.
pub fn encode_position_result(result: PositionResult) -> json.Json {
  json.object([
    #("x", json.int(result.node.x)),
    #("y", json.int(result.node.y)),
    #("floor", json.int(result.node.floor)),
    #("node_id", json.string(result.node.node_id)),
    #("name", json.string(result.node.name)),
    #("confidence", json.int(result.confidence)),
    #("confidence_level", json.string(result.confidence_level)),
    #("samples", json.int(result.samples)),
  ])
}
