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
pub type AuthRequest {
  AuthRequest(email: String)
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
  decode.success(AuthRequest(email))
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
