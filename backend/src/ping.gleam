// ping.gleam
// POST /api/ping — tag a room with Wi-Fi fingerprints and edge data.

import birl
import db
import db_query
import gleam/dict.{type Dict}
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{None, Some}
import gleam/result
import gleam/string
import models.{
  type Fingerprint, type PingRequest, ErrorResponse, Fingerprint, PingRequest,
  encode_error,
}
import sqlight
import stats
import wisp

/// Largest number of Wi-Fi readings accepted in one request. A typical scan
/// sees well under 50; this stops a single request inserting unbounded rows.
pub const max_fingerprints: Int = 200

/// Longest accepted room name.
const max_name_length: Int = 100

/// Largest accepted step count between two rooms.
const max_steps: Int = 1000

/// Weakest signal strength accepted, in dBm.
///
/// Real Wi-Fi readings land roughly in -100..-30 dBm. The bound is deliberately
/// loose, but it must exist: without it a single reading of `999999` folds into
/// a room's running mean and no real reading can ever match that room again.
/// There is no way to remove one reading once it is in.
pub const min_rssi: Int = -120

/// Strongest signal strength accepted, in dBm. Wi-Fi is always negative, so
/// anything at or above zero is a client bug rather than a measurement.
pub const max_rssi: Int = 0

/// Lowest accepted floor number. Below-ground floors are negative.
pub const min_floor: Int = -10

/// Highest accepted floor number. No building on earth has 100 floors.
pub const max_floor: Int = 100

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
/// One check per field, applied in order, so a request with two problems is
/// reported for the first one only. The order is the order of the fields in
/// the request body.
///
/// First room (`previous_node_id == ""`): `steps` must be `-1` and
/// `direction` must be `""`.
///
/// Linked room (non-empty `previous_node_id`): `steps` must be `> 0` and
/// `direction` one of `N, NE, E, SE, SW, W, NW`.
///
/// The name, floor, step count, signal strengths and number of fingerprints are
/// all bounded so a single request cannot write unbounded or unmatchable data.
pub fn validate_ping(ping: PingRequest) -> Result(Nil, String) {
  use Nil <- result.try(validate_name(ping.name))
  use Nil <- result.try(validate_floor(ping.floor))
  use Nil <- result.try(validate_fingerprints(ping.fingerprints))
  use Nil <- result.try(validate_steps(ping.previous_node_id, ping.steps))
  validate_direction(ping.previous_node_id, ping.direction)
}

/// The room name must contain at least one letter or digit, and not be
/// over-long.
///
/// The character requirement is what stops a blank name from becoming a room
/// called `""` with the id `_f1` — and stops any other punctuation-only name
/// from colliding with it, since ids are derived from names.
fn validate_name(name: String) -> Result(Nil, String) {
  case string.length(name) > max_name_length {
    True ->
      Error(
        "Room name is too long (max "
        <> int.to_string(max_name_length)
        <> " characters)",
      )
    False ->
      case has_letter_or_digit(name) {
        False -> Error("Room name must contain at least one letter or digit")
        True -> Ok(Nil)
      }
  }
}

fn has_letter_or_digit(name: String) -> Bool {
  list.any(name |> string.to_graphemes, is_letter_or_digit)
}

/// The floor must be a plausible building floor number.
fn validate_floor(floor: Int) -> Result(Nil, String) {
  case floor < min_floor || floor > max_floor {
    True ->
      Error(
        "Floor must be between "
        <> int.to_string(min_floor)
        <> " and "
        <> int.to_string(max_floor),
      )
    False -> Ok(Nil)
  }
}

/// The scan must be within the size limit and every reading must be a plausible
/// signal strength.
///
/// The rssi bound is the important one. Readings are folded into a running mean
/// and cannot be removed afterwards, so an out-of-range value is permanent: it
/// would drag the mean far enough that no real reading could ever match that
/// room again.
fn validate_fingerprints(
  fingerprints: List(Fingerprint),
) -> Result(Nil, String) {
  use Nil <- result.try(validate_fingerprint_count(fingerprints))
  list.try_each(fingerprints, fn(fingerprint) {
    validate_rssi(fingerprint.rssi)
  })
}

fn validate_fingerprint_count(
  fingerprints: List(Fingerprint),
) -> Result(Nil, String) {
  case list.length(fingerprints) > max_fingerprints {
    True ->
      Error(
        "Too many fingerprints in one request (max "
        <> int.to_string(max_fingerprints)
        <> ")",
      )
    False -> Ok(Nil)
  }
}

fn validate_rssi(rssi: Int) -> Result(Nil, String) {
  case rssi < min_rssi || rssi > max_rssi {
    True ->
      Error(
        "Signal strength must be between "
        <> int.to_string(min_rssi)
        <> " and "
        <> int.to_string(max_rssi)
        <> " dBm",
      )
    False -> Ok(Nil)
  }
}

/// Steps from the previous room: `-1` for the first room, otherwise a count.
fn validate_steps(previous_node_id: String, steps: Int) -> Result(Nil, String) {
  case previous_node_id {
    "" ->
      case steps == -1 {
        True -> Ok(Nil)
        False -> Error("First room must have null steps and direction")
      }
    _ ->
      case steps <= 0 || steps > max_steps {
        True ->
          Error(
            "Steps must be between 1 and "
            <> int.to_string(max_steps)
            <> " for a linked room",
          )
        False -> Ok(Nil)
      }
  }
}

/// Compass heading from the previous room: empty for the first room, otherwise
/// one of the eight directions.
fn validate_direction(
  previous_node_id: String,
  direction: String,
) -> Result(Nil, String) {
  case previous_node_id {
    "" ->
      case direction == "" {
        True -> Ok(Nil)
        False -> Error("First room must have null steps and direction")
      }
    _ ->
      case
        list.contains(["N", "NE", "E", "SE", "S", "SW", "W", "NW"], direction)
      {
        True -> Ok(Nil)
        False -> Error("Direction must be one of: N, NE, E, SE, S, SW, W, NW")
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
  conn: db.Connection,
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
/// Lookup is by `node_id`, which `generate_node_id` derives from the name and
/// floor. That makes "same room" mean "same spelling" without a second
/// comparison, and means two spellings of one room ("Lab 201", "Lab-201")
/// resolve to the same row instead of colliding on the primary key.
///
/// `BEGIN IMMEDIATE` in `db_query.transaction` already holds the write lock, so
/// the lookup-then-insert here cannot race another request for the same room.
fn resolve_node(
  conn: db.Connection,
  ping: PingRequest,
) -> Result(String, PingError) {
  let node_id = generate_node_id(ping.name, ping.floor)

  case node_exists(conn, node_id) {
    True -> Ok(node_id)
    False ->
      case insert_node(conn, node_id, ping.name, ping.floor) {
        Error(msg) -> Error(Database(msg))
        Ok(Nil) -> Ok(node_id)
      }
  }
}

/// Link `node_id` to the previous node, unless this is the first room.
///
/// Checks that `previous_node_id` names a room that exists, so a client cannot
/// build edges pointing at nodes that were never tagged.
fn link_or_return(
  conn: db.Connection,
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
///
/// Every character that is not a lowercase letter or digit becomes an
/// underscore, so `"Lab 201"`, `"Lab-201"` and `"LAB/201"` all produce the same
/// id. That is deliberate: the id is derived from the name rather than being
/// generated, so tagging the same room twice must land on the same row
/// whatever spelling was used.
pub fn generate_node_id(name: String, floor: Int) -> String {
  name
  |> string.lowercase
  |> string.to_graphemes
  |> list.map(fn(character) {
    case is_letter_or_digit(character) {
      True -> character
      False -> "_"
    }
  })
  |> string.concat
  <> "_f"
  <> int.to_string(floor)
}

fn is_letter_or_digit(character: String) -> Bool {
  string.contains(node_id_characters, character)
}

/// Every character allowed in a node id.
const node_id_characters: String = "abcdefghijklmnopqrstuvwxyz0123456789"

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

/// Insert a new node row.
fn insert_node(
  conn: db.Connection,
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
fn node_exists(conn: db.Connection, node_id: String) -> Bool {
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

/// Fold this scan into what the room already knows about each network.
///
/// Reads the room's existing rows, folds the new readings into their running
/// statistics, and writes the room's rows back. Re-tagging a room therefore
/// updates its numbers instead of growing the table.
///
/// `now` is passed in so this stays a pure function that can be tested.
///
/// Runs inside the caller's transaction, so a failure rolls back the node and
/// edge rows written alongside it.
fn insert_fingerprints(
  conn: db.Connection,
  node_id: String,
  fingerprints: List(Fingerprint),
) -> Result(Nil, String) {
  let now = birl.to_unix(birl.now())
  use existing <- result.try(load_room_aps(conn, node_id))
  list.try_each(
    merge_fingerprints(
      node_id,
      existing,
      one_reading_per_network(fingerprints),
      now,
    ),
    fn(room_ap) { save_room_ap(conn, room_ap) },
  )
}

/// Collapse a scan so each network appears at most once, keeping the strongest
/// reading for it.
///
/// One scan is one visit to a room. Without this, a request listing the same
/// network several times — in any mix of upper and lower case, since BSSIDs are
/// matched case-insensitively — would count as several visits. That matters
/// because the visit count is what caps a room's confidence: without this, a
/// single request could mark a never-visited room as fully mapped.
///
/// A real scan reports each network once, so a duplicate is a client bug rather
/// than genuine signal. The strongest reading is kept because that is the one a
/// single scan would have reported for it.
pub fn one_reading_per_network(
  fingerprints: List(Fingerprint),
) -> List(Fingerprint) {
  list.fold(fingerprints, dict.new(), fn(rows, fingerprint) {
    dict.upsert(rows, string.lowercase(fingerprint.bssid), fn(existing) {
      case existing {
        None -> fingerprint
        Some(previous) -> stronger_reading(previous, fingerprint)
      }
    })
  })
  |> dict.values
  |> list.sort(fn(a, b) { string.compare(a.bssid, b.bssid) })
}

fn stronger_reading(previous: Fingerprint, next: Fingerprint) -> Fingerprint {
  case next.rssi > previous.rssi {
    True -> next
    False -> previous
  }
}

/// What a room has seen of one network, as stored in `room_aps`.
type RoomAp {
  RoomAp(
    node_id: String,
    bssid: String,
    rssi_mean: Float,
    rssi_m2: Float,
    n: Int,
    first_seen: Int,
    last_seen: Int,
  )
}

/// Every network already recorded for this room, keyed by BSSID.
fn load_room_aps(
  conn: db.Connection,
  node_id: String,
) -> Result(Dict(String, RoomAp), String) {
  let sql =
    "SELECT node_id, bssid, rssi_mean, rssi_m2, n, first_seen, last_seen
     FROM room_aps WHERE node_id = ?"
  let decoder = {
    use node_id <- decode.field("node_id", decode.string)
    use bssid <- decode.field("bssid", decode.string)
    use rssi_mean <- decode.field("rssi_mean", decode.float)
    use rssi_m2 <- decode.field("rssi_m2", decode.float)
    use n <- decode.field("n", decode.int)
    use first_seen <- decode.field("first_seen", decode.int)
    use last_seen <- decode.field("last_seen", decode.int)
    decode.success(RoomAp(
      node_id,
      bssid,
      rssi_mean,
      rssi_m2,
      n,
      first_seen,
      last_seen,
    ))
  }
  use rows <- result.try(db_query.query_as_maps(
    sql,
    on: conn,
    with: [sqlight.text(node_id)],
    expecting: decoder,
  ))
  let by_bssid: Dict(String, RoomAp) =
    list.fold(rows, dict.new(), fn(rows, row) {
      dict.insert(rows, row.bssid, row)
    })
  Ok(by_bssid)
}

/// Fold a scan into the room's existing rows and return the rows to save.
///
/// Folds through the room's own rows rather than reading a separate lookup
/// each time, so a network that appears twice in one scan counts both readings.
/// Every network the room knows about is returned — there is only ever one row
/// per distinct network, so rewriting them all is cheap and keeps this simple.
fn merge_fingerprints(
  node_id: String,
  existing: Dict(String, RoomAp),
  fingerprints: List(Fingerprint),
  now: Int,
) -> List(RoomAp) {
  let merged =
    list.fold(fingerprints, existing, fn(rows, fingerprint) {
      let bssid = string.lowercase(fingerprint.bssid)
      let previous = dict.get(rows, bssid)
      let summary =
        stats.add(previous_summary(previous), int.to_float(fingerprint.rssi))

      dict.insert(
        rows,
        bssid,
        RoomAp(
          node_id: node_id,
          bssid: bssid,
          rssi_mean: summary.mean,
          rssi_m2: summary.m2,
          n: summary.n,
          // Keep the original first sighting; only last_seen moves.
          first_seen: previous_first_seen(previous, now),
          last_seen: now,
        ),
      )
    })

  dict.values(merged)
}

/// The running summary of a network the room already knows, or an empty one.
fn previous_summary(previous: Result(RoomAp, Nil)) -> stats.Summary {
  case previous {
    Ok(room_ap) ->
      stats.Summary(n: room_ap.n, mean: room_ap.rssi_mean, m2: room_ap.rssi_m2)
    Error(_) -> stats.empty
  }
}

/// When the room first heard this network, defaulting to now for a new one.
fn previous_first_seen(previous: Result(RoomAp, Nil), now: Int) -> Int {
  case previous {
    Ok(room_ap) -> room_ap.first_seen
    Error(_) -> now
  }
}

/// Write one room's numbers for one network back to the database.
fn save_room_ap(conn: db.Connection, room_ap: RoomAp) -> Result(Nil, String) {
  let sql =
    "INSERT OR REPLACE INTO room_aps
       (node_id, bssid, rssi_mean, rssi_m2, n, first_seen, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?)"
  db_query.exec_with_args(sql, on: conn, with: [
    sqlight.text(room_ap.node_id),
    sqlight.text(room_ap.bssid),
    sqlight.float(room_ap.rssi_mean),
    sqlight.float(room_ap.rssi_m2),
    sqlight.int(room_ap.n),
    sqlight.int(room_ap.first_seen),
    sqlight.int(room_ap.last_seen),
  ])
}

/// Insert an edge between two nodes.
///
/// Re-tagging the same pair of rooms is a normal thing for a client to do, so a
/// duplicate edge is treated as success rather than an error.
fn insert_edge(
  conn: db.Connection,
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
