// ping.gleam
// POST /api/ping — tag a room with Wi-Fi fingerprints and edge data.

import db
import db_query
import gleam/dynamic/decode
import gleam/int
import gleam/io
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import models.{
  type Fingerprint, type PingRequest, ErrorResponse, Fingerprint, PingRequest,
  encode_error,
}
import sqlight
import wisp

/// Largest number of Wi-Fi readings accepted in one request. A typical scan
/// sees well under 50; this stops a single request inserting unbounded rows.
pub const max_fingerprints: Int = 200

/// Longest accepted room name.
const max_name_length: Int = 100

/// Largest accepted step count between two rooms.
const max_steps: Int = 1000

/// Why a ping could not be processed.
type PingError {
  /// `previous_node_id` does not identify a known room.
  UnknownPreviousNode(String)
  /// Anything else from the database.
  Database(String)
}

/// Handle a ping request: create or reuse the tagged room, store its Wi-Fi
/// fingerprints, and link it to the previous room via an edge.
///
/// Auth is enforced upstream in `backend.handle_request` via
/// `app_auth.require_auth`.
///
/// Writes run in a transaction on a connection dedicated to this request, so a
/// failure part-way through cannot leave a node without its fingerprints or an
/// edge pointing at a room that was never created.
///
/// Returns `200` with `{"status":"created","node_id":...}` on success, or an
/// error response (400/500) on failure.
pub fn handle(request: wisp.Request) -> wisp.Response {
  use body <- wisp.require_string_body(request)

  case parse_ping_body(body) {
    Error(_) -> {
      let error_json =
        encode_error(ErrorResponse(
          "invalid_json",
          "Could not parse ping request",
        ))
      wisp.bad_request("invalid_json")
      |> wisp.string_body(json.to_string(error_json))
    }
    Ok(ping) -> {
      case validate_ping(ping) {
        Error(msg) -> {
          let error_json = encode_error(ErrorResponse("validation_failed", msg))
          wisp.bad_request("validation_failed")
          |> wisp.string_body(json.to_string(error_json))
        }
        Ok(_) ->
          case db.with_connection(fn(conn) { process_ping(conn, ping) }) {
            Error(_) -> {
              let error_json =
                encode_error(ErrorResponse(
                  "database_error",
                  "Could not open the database",
                ))
              wisp.response(500)
              |> wisp.string_body(json.to_string(error_json))
            }
            Ok(Ok(node_id)) -> {
              let resp_json =
                json.object([
                  #("status", json.string("created")),
                  #("node_id", json.string(node_id)),
                ])
              wisp.ok()
              |> wisp.json_body(json.to_string(resp_json))
            }
            Ok(Error(UnknownPreviousNode(id))) -> {
              let error_json =
                encode_error(ErrorResponse(
                  "unknown_previous_node",
                  "No room with node_id "
                    <> id
                    <> ". Tag that room first, or send an empty "
                    <> "previous_node_id to start a new chain.",
                ))
              wisp.bad_request("unknown_previous_node")
              |> wisp.string_body(json.to_string(error_json))
            }
            Ok(Error(Database(msg))) -> {
              let error_json =
                encode_error(ErrorResponse("database_error", msg))
              wisp.response(500)
              |> wisp.string_body(json.to_string(error_json))
            }
          }
      }
    }
  }
}

/// Validate the shape and size of a ping request.
///
/// First room (`previous_node_id == ""`): `steps` must be `-1` and
/// `direction` must be `""`.
///
/// Linked room (non-empty `previous_node_id`): `steps` must be `> 0` and
/// `direction` one of `N, NE, E, SE, S, SW, W, NW`.
///
/// Also caps the name length, step count and number of fingerprints so a single
/// request cannot write an unbounded number of rows.
pub fn validate_ping(ping: PingRequest) -> Result(Nil, String) {
  let valid_directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

  case string.length(ping.name) > max_name_length {
    True ->
      Error(
        "Room name is too long (max "
        <> int.to_string(max_name_length)
        <> " characters)",
      )
    False ->
      case list.length(ping.fingerprints) > max_fingerprints {
        True ->
          Error(
            "Too many fingerprints in one request (max "
            <> int.to_string(max_fingerprints)
            <> ")",
          )
        False ->
          case ping.previous_node_id {
            "" -> {
              case ping.steps == -1 && ping.direction == "" {
                True -> Ok(Nil)
                False -> Error("First room must have null steps and direction")
              }
            }
            _ -> {
              case ping.steps <= 0 || ping.steps > max_steps {
                True ->
                  Error(
                    "Steps must be between 1 and "
                    <> int.to_string(max_steps)
                    <> " for a linked room",
                  )
                False -> {
                  case list.contains(valid_directions, ping.direction) {
                    False ->
                      Error(
                        "Direction must be one of: N, NE, E, SE, S, SW, W, NW",
                      )
                    True -> Ok(Nil)
                  }
                }
              }
            }
          }
      }
  }
}

/// Parse the JSON request body into a `PingRequest`.
fn parse_ping_body(body: String) -> Result(PingRequest, Nil) {
  case json.parse(body, using: ping_request_decoder()) {
    Ok(req) -> Ok(req)
    Error(_) -> Error(Nil)
  }
}

/// Reuse an existing node (same name + floor) or create a new one, then store
/// its fingerprints and link it to the previous node.
///
/// All three writes run in one transaction, so a failure part-way through
/// leaves the room and its edges unchanged rather than half-written.
fn process_ping(
  conn: sqlight.Connection,
  ping: PingRequest,
) -> Result(String, PingError) {
  db_query.transaction(conn, to_ping_error, fn() {
    use node_id <- result.try(resolve_node(conn, ping))
    use Nil <- result.try(
      tag_db_error(insert_fingerprints(conn, node_id, ping.fingerprints)),
    )
    use node_id <- result.try(link_or_return(conn, node_id, ping))
    Ok(node_id)
  })
}

/// Errors raised by the transaction itself rather than by a query in it.
fn to_ping_error(msg: String) -> PingError {
  Database(msg)
}

/// Give a plain query error the error type the transaction carries.
fn tag_db_error(result: Result(a, String)) -> Result(a, PingError) {
  case result {
    Ok(value) -> Ok(value)
    Error(msg) -> Error(Database(msg))
  }
}

/// Return the id of the room named by this ping, creating the row if needed.
///
/// `BEGIN IMMEDIATE` in `db_query.transaction` already holds the write lock, so
/// the lookup-then-insert here cannot race another request for the same room.
fn resolve_node(
  conn: sqlight.Connection,
  ping: PingRequest,
) -> Result(String, PingError) {
  case find_node_by_name(conn, ping.name, ping.floor) {
    Ok(existing_id) -> Ok(existing_id)
    Error(_) -> {
      let node_id = generate_node_id(ping.name, ping.floor)
      case insert_node(conn, node_id, ping.name, ping.floor) {
        Error(msg) -> Error(Database(msg))
        Ok(Nil) -> Ok(node_id)
      }
    }
  }
}

/// Link `node_id` to the previous node, unless this is the first room.
///
/// Checks that `previous_node_id` names a room that exists, so a client cannot
/// build edges pointing at nodes that were never tagged.
fn link_or_return(
  conn: sqlight.Connection,
  node_id: String,
  ping: PingRequest,
) -> Result(String, PingError) {
  case ping.previous_node_id {
    "" -> Ok(node_id)
    _ ->
      case node_exists(conn, ping.previous_node_id) {
        False -> Error(UnknownPreviousNode(ping.previous_node_id))
        True ->
          case
            insert_edge(
              conn,
              ping.previous_node_id,
              node_id,
              ping.steps,
              ping.direction,
            )
          {
            Ok(Nil) -> Ok(node_id)
            Error(msg) -> Error(Database(msg))
          }
      }
  }
}

/// Generate a deterministic node id from the room name and floor.
/// e.g. `"Lab 201"`, floor `2` -> `lab_201_f2`.
fn generate_node_id(name: String, floor: Int) -> String {
  let sanitized =
    name
    |> string.lowercase
    |> string.replace(" ", "_")
    |> string.replace("-", "_")
  sanitized <> "_f" <> int.to_string(floor)
}

// --- JSON Decoders ---

/// Decoder for a single `Fingerprint` from JSON.
fn fingerprint_decoder() -> decode.Decoder(Fingerprint) {
  use bssid <- decode.field("bssid", decode.string)
  use ssid <- decode.field("ssid", decode.string)
  use rssi <- decode.field("rssi", decode.int)
  decode.success(Fingerprint(bssid, ssid, rssi))
}

/// Decoder for the full `PingRequest` from JSON.
fn ping_request_decoder() -> decode.Decoder(PingRequest) {
  use name <- decode.field("name", decode.string)
  use floor <- decode.field("floor", decode.int)
  use previous_node_id <- decode.field("previous_node_id", decode.string)
  use steps <- decode.field("steps", decode.int)
  use direction <- decode.field("direction", decode.string)
  use fingerprints <- decode.field(
    "fingerprints",
    decode.list(fingerprint_decoder()),
  )
  decode.success(PingRequest(
    name,
    floor,
    previous_node_id,
    steps,
    direction,
    fingerprints,
  ))
}

// --- Database Operations ---

/// Look up the node_id for a given name + floor, if one exists.
fn find_node_by_name(
  conn: sqlight.Connection,
  name: String,
  floor: Int,
) -> Result(String, String) {
  let sql = "SELECT node_id FROM nodes WHERE name = ? AND floor = ?"
  let decoder = {
    use node_id <- decode.field("node_id", decode.string)
    decode.success(node_id)
  }
  case
    db_query.query_as_maps(
      sql,
      on: conn,
      with: [sqlight.text(name), sqlight.int(floor)],
      expecting: decoder,
    )
  {
    Ok([node_id]) -> Ok(node_id)
    Ok([]) -> Error("not found")
    Ok(_) -> Error("multiple matches")
    Error(msg) -> {
      let _ = io.println("find_node_by_name error: " <> msg)
      Error(msg)
    }
  }
}

/// Insert a new node row.
fn insert_node(
  conn: sqlight.Connection,
  node_id: String,
  name: String,
  floor: Int,
) -> Result(Nil, String) {
  db_query.exec_with_args(
    "INSERT INTO nodes (node_id, name, floor) VALUES (?, ?, ?)",
    on: conn,
    with: [sqlight.text(node_id), sqlight.text(name), sqlight.int(floor)],
  )
}

/// Whether a node with this id exists.
fn node_exists(conn: sqlight.Connection, node_id: String) -> Bool {
  let sql = "SELECT node_id FROM nodes WHERE node_id = ?"
  let decoder = {
    use node_id <- decode.field("node_id", decode.string)
    decode.success(node_id)
  }
  case
    db_query.query_as_maps(
      sql,
      on: conn,
      with: [sqlight.text(node_id)],
      expecting: decoder,
    )
  {
    Ok([_]) -> True
    Ok(_) -> False
    Error(_) -> False
  }
}

/// Insert all fingerprints for a node.
///
/// Runs inside the caller's transaction, so a failure rolls back the node and
/// edge rows written alongside it.
fn insert_fingerprints(
  conn: sqlight.Connection,
  node_id: String,
  fingerprints: List(Fingerprint),
) -> Result(Nil, String) {
  list.try_each(fingerprints, fn(fp) {
    db_query.exec_with_args(
      "INSERT INTO fingerprints (bssid, node_id, ssid, rssi) VALUES (?, ?, ?, ?)",
      on: conn,
      with: [
        sqlight.text(fp.bssid),
        sqlight.text(node_id),
        sqlight.text(fp.ssid),
        sqlight.int(fp.rssi),
      ],
    )
  })
}

/// Insert an edge between two nodes.
///
/// Re-tagging the same pair of rooms is a normal thing for a client to do, so a
/// duplicate edge is treated as success rather than an error.
fn insert_edge(
  conn: sqlight.Connection,
  from_node: String,
  to_node: String,
  steps: Int,
  direction: String,
) -> Result(Nil, String) {
  let sql =
    "INSERT OR IGNORE INTO edges (from_node, to_node, steps, direction) VALUES (?, ?, ?, ?)"
  db_query.exec_with_args(sql, on: conn, with: [
    sqlight.text(from_node),
    sqlight.text(to_node),
    sqlight.int(steps),
    sqlight.text(direction),
  ])
}
