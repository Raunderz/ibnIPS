// ping.gleam
// POST /api/ping — tag a room with Wi-Fi fingerprints and edge data.

import app_auth
import db_query
import gleam/dynamic/decode
import gleam/int
import gleam/io
import gleam/json
import gleam/list
import gleam/string
import models.{
  type Fingerprint, type PingRequest, ErrorResponse, Fingerprint, PingRequest,
  encode_error,
}
import sqlight
import wisp

pub fn handle(
  request: wisp.Request,
  conn: sqlight.Connection,
) -> wisp.Response {
  app_auth.require_auth(request, fn(_email) {
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
            let error_json =
              encode_error(ErrorResponse("validation_failed", msg))
            wisp.bad_request("validation_failed")
            |> wisp.string_body(json.to_string(error_json))
          }
          Ok(_) -> {
            case process_ping(conn, ping) {
              Error(msg) -> {
                let error_json =
                  encode_error(ErrorResponse("database_error", msg))
                wisp.response(500)
                |> wisp.string_body(json.to_string(error_json))
              }
              Ok(node_id) -> {
                let resp_json =
                  json.object([
                    #("status", json.string("created")),
                    #("node_id", json.string(node_id)),
                  ])
                wisp.ok()
                |> wisp.string_body(json.to_string(resp_json))
              }
            }
          }
        }
      }
    }
  })
}

fn parse_ping_body(body: String) -> Result(PingRequest, Nil) {
  case json.parse(body, using: ping_request_decoder()) {
    Ok(req) -> Ok(req)
    Error(_) -> Error(Nil)
  }
}

fn validate_ping(ping: PingRequest) -> Result(Nil, String) {
  let valid_directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

  case ping.previous_node_id {
    "" -> {
      case ping.steps == -1 && ping.direction == "" {
        True -> Ok(Nil)
        False -> Error("First room must have null steps and direction")
      }
    }
    _ -> {
      case ping.steps > 0 {
        True -> {
          case list.contains(valid_directions, ping.direction) {
            False ->
              Error("Direction must be one of: N, NE, E, SE, S, SW, W, NW")
            True -> Ok(Nil)
          }
        }
        False -> Error("Steps must be positive for non-first room")
      }
    }
  }
}

fn process_ping(
  conn: sqlight.Connection,
  ping: PingRequest,
) -> Result(String, String) {
  case find_node_by_name(conn, ping.name, ping.floor) {
    Ok(existing_id) -> {
      case insert_fingerprints(conn, existing_id, ping.fingerprints) {
        Error(msg) -> Error(msg)
        Ok(Nil) -> link_or_return(conn, existing_id, ping)
      }
    }
    Error(_) -> {
      let node_id = generate_node_id(ping.name, ping.floor)
      case insert_node(conn, node_id, ping.name, ping.floor) {
        Error(msg) -> Error(msg)
        Ok(Nil) -> {
          case insert_fingerprints(conn, node_id, ping.fingerprints) {
            Error(msg) -> Error(msg)
            Ok(Nil) -> link_or_return(conn, node_id, ping)
          }
        }
      }
    }
  }
}

fn link_or_return(
  conn: sqlight.Connection,
  node_id: String,
  ping: PingRequest,
) -> Result(String, String) {
  case ping.previous_node_id {
    "" -> Ok(node_id)
    _ -> {
      case insert_edge(conn, ping.previous_node_id, node_id, ping.steps, ping.direction) {
        Ok(Nil) -> Ok(node_id)
        Error(msg) -> Error(msg)
      }
    }
  }
}

fn generate_node_id(name: String, floor: Int) -> String {
  let sanitized =
    name
    |> string.lowercase
    |> string.replace(" ", "_")
    |> string.replace("-", "_")
  sanitized <> "_f" <> int.to_string(floor)
}

// --- JSON Decoders ---

fn fingerprint_decoder() -> decode.Decoder(Fingerprint) {
  use bssid <- decode.field("bssid", decode.string)
  use ssid <- decode.field("ssid", decode.string)
  use rssi <- decode.field("rssi", decode.int)
  decode.success(Fingerprint(bssid, ssid, rssi))
}

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
  decode.success(PingRequest(name, floor, previous_node_id, steps, direction, fingerprints))
}

// --- Database Operations ---

fn find_node_by_name(
  conn: sqlight.Connection,
  name: String,
  floor: Int,
) -> Result(String, String) {
  let sql = "SELECT node_id FROM nodes WHERE name = ? AND floor = ?"
  case db_query.query_as_maps(sql, on: conn, with: [sqlight.text(name), sqlight.int(floor)], expecting: decode.string) {
    Ok([node_id]) -> Ok(node_id)
    Ok([]) -> Error("not found")
    Ok(_) -> Error("multiple matches")
    Error(msg) -> {
      let _ = io.println("find_node_by_name error: " <> msg)
      Error(msg)
    }
  }
}

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

fn insert_fingerprints(
  conn: sqlight.Connection,
  node_id: String,
  fingerprints: List(Fingerprint),
) -> Result(Nil, String) {
  list.try_each(fingerprints, fn(fp) {
    db_query.exec_with_args(
      "INSERT INTO fingerprints (bssid, node_id, ssid, rssi) VALUES (?, ?, ?, ?)",
      on: conn,
      with: [sqlight.text(fp.bssid), sqlight.text(node_id), sqlight.text(fp.ssid), sqlight.int(fp.rssi)],
    )
  })
}

// ponytail: any exec error on edge insert = assume duplicate, return Ok.
// Edge UNIQUE constraint is the only expected error here.
fn insert_edge(
  conn: sqlight.Connection,
  from_node: String,
  to_node: String,
  steps: Int,
  direction: String,
) -> Result(Nil, String) {
  case db_query.exec_with_args(
    "INSERT INTO edges (from_node, to_node, steps, direction) VALUES (?, ?, ?, ?)",
    on: conn,
    with: [sqlight.text(from_node), sqlight.text(to_node), sqlight.int(steps), sqlight.text(direction)],
  ) {
    Ok(Nil) -> Ok(Nil)
    Error(msg) ->
      case string.contains(msg, "UNIQUE") {
        True -> Ok(Nil)
        False -> Error(msg)
      }
  }
}
