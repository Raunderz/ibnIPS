// models.gleam
// All shared type definitions for the ICPS backend.
// Keeping types in one module makes it easy to see the whole data model
// and avoids circular imports between handler modules.

import gleam/dynamic
import gleam/dynamic/decode

// --- Node: a physical room/location ---
pub type Node {
  Node(
    node_id: String,
    // e.g. "Lab_201" or auto-generated UUID
    name: String,
    // human-readable name
    floor: Int,
    // building floor number
    x: Int,
    // x coordinate on map (0 if not set yet)
    y: Int,
    // y coordinate on map (0 if not set yet)
  )
}

// --- Fingerprint: a single Wi-Fi signal reading ---
pub type Fingerprint {
  Fingerprint(
    bssid: String,
    // Wi-Fi MAC address, e.g. "aa:bb:cc:dd:ee:ff"
    ssid: String,
    // Network name, e.g. "IITB-WiFi"
    rssi: Int,
    // Signal strength in dBm, e.g. -65
  )
}

// --- Edge: a connection between two nodes ---
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

// --- PingRequest: what the app sends when tagging a room ---
pub type PingRequest {
  PingRequest(
    name: String,
    // room name, e.g. "Physics Lab 201"
    floor: Int,
    // which floor
    previous_node_id: String,
    // empty string means "first room in chain"
    steps: Int,
    // steps from previous room (-1 if null)
    direction: String,
    // direction from previous (empty if null)
    fingerprints: List(Fingerprint),
    // Wi-Fi scan results
  )
}

// --- AuthRequest / AuthResponse: login flow ---
pub type AuthRequest {
  AuthRequest(email: String)
}

pub type AuthResponse {
  AuthResponse(token: String)
}

// --- ErrorResponse: standard error JSON shape ---
pub type ErrorResponse {
  ErrorResponse(error: String, details: String)
}

// --- MapData: full graph for frontend ---
pub type MapData {
  MapData(nodes: List(Node), edges: List(Edge))
}

// --- JSON Decoders ---
// These functions tell Gleam how to parse JSON into our types.
// decode.run takes a Dynamic value and tries to match its shape.

pub fn decode_ping_request(
  json: dynamic.Dynamic,
) -> Result(PingRequest, List(decode.DecodeError)) {
  decode.run(json, {
    use name <- decode.field("name", decode.string)
    use floor <- decode.field("floor", decode.int)
    use previous_node_id <- decode.field("previous_node_id", decode.string)
    use steps <- decode.field("steps", decode.int)
    use direction <- decode.field("direction", decode.string)
    use fingerprints <- decode.field(
      "fingerprints",
      decode.list(decode_fingerprint()),
    )
    decode.success(PingRequest(
      name,
      floor,
      previous_node_id,
      steps,
      direction,
      fingerprints,
    ))
  })
}

fn decode_fingerprint() -> decode.Decoder(Fingerprint) {
  {
    use bssid <- decode.field("bssid", decode.string)
    use ssid <- decode.field("ssid", decode.string)
    use rssi <- decode.field("rssi", decode.int)
    decode.success(Fingerprint(bssid, ssid, rssi))
  }
}

pub fn decode_auth_request(
  json: dynamic.Dynamic,
) -> Result(AuthRequest, List(decode.DecodeError)) {
  decode.run(json, {
    use email <- decode.field("email", decode.string)
    decode.success(AuthRequest(email))
  })
}

// --- JSON Encoders ---
// These functions convert our types back into JSON for responses.

import gleam/json

pub fn encode_node(node: Node) -> json.Json {
  json.object([
    #("node_id", json.string(node.node_id)),
    #("name", json.string(node.name)),
    #("floor", json.int(node.floor)),
    #("x", json.int(node.x)),
    #("y", json.int(node.y)),
  ])
}

pub fn encode_edge(edge: Edge) -> json.Json {
  json.object([
    #("from_node", json.string(edge.from_node)),
    #("to_node", json.string(edge.to_node)),
    #("steps", json.int(edge.steps)),
    #("direction", json.string(edge.direction)),
  ])
}

pub fn encode_error(err: ErrorResponse) -> json.Json {
  json.object([
    #("error", json.string(err.error)),
    #("details", json.string(err.details)),
  ])
}

pub fn encode_auth_response(resp: AuthResponse) -> json.Json {
  json.object([
    #("token", json.string(resp.token)),
  ])
}

pub fn encode_map_data(data: MapData) -> json.Json {
  json.object([
    #("nodes", json.array(data.nodes, encode_node)),
    #("edges", json.array(data.edges, encode_edge)),
  ])
}
