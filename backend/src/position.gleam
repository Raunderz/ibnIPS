// position.gleam
// POST /api/position — locate the caller from a live Wi-Fi scan.
//
// The server holds the tagged side of the comparison: for every room, what each
// nearby network usually looks like from inside it. The client only sends what
// it sees right now.
//
// A room's memory of a network is a mean and a spread (see stats.gleam), not a
// single reading. That matters because the signal in one room is not a fixed
// number — it moves as you walk to the other side of it. Comparing a live
// reading against a spread says "is this reading plausible for that room",
// which is a different and better question than "does it match exactly".

import db_query
import gleam/dict.{type Dict}
import gleam/dynamic/decode
import gleam/float
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import models.{
  type Fingerprint, type Node, type PositionRequest, ErrorResponse, Node,
  PositionResult, decode_position_request, encode_error, encode_position_result,
}
import sqlight
import stats
import wisp

/// Largest number of Wi-Fi readings accepted in one request, matching the cap
/// on `POST /api/ping`. A scan of a busy building sees well under 50.
pub const max_fingerprints: Int = 200

/// Confidence tiers, highest first. A match below `min_confidence` is reported
/// as "Uncertain" and the client is expected to treat it as no answer.
pub const high_confidence: Int = 75

pub const medium_confidence: Int = 50

pub const min_confidence: Int = 30

/// How many spreads away from a room's average a reading may sit before it
/// counts as evidence the caller is not in that room.
///
/// Two spreads is a loose fit: the signal moves a bit on every visit, and we
/// are looking for the room, not for the exact spot in it.
pub const spread_multiplier: Float = 2.0

/// Largest gap a reading may have from a room's average and still count as
/// agreeing, in dBm.
///
/// A cap is needed because the spread is unbounded. Walk a room while the signal
/// swings — you pace around with the phone in your pocket, or an AP gets moved
/// — and the spread grows without limit. Left uncapped, `2 x spread` eventually
/// exceeds any plausible reading, and the room agrees with everything: it starts
/// matching scans taken in other rooms. Capping the gap keeps a room
/// discriminating however noisy its history.
///
/// 15 dBm is roughly how far a signal moves between opposite corners of a normal
/// room, so this leaves genuine movement forgiven while still rejecting a
/// reading from somewhere else.
pub const max_allowed_db: Float = 15.0

/// The smallest spread any room is credited with, in dBm.
///
/// A room visited once has a spread of exactly zero, because one reading says
/// nothing about how much the signal moves. Without a floor, every later
/// reading would look like a surprise and such a room could never be matched.
pub const min_spread_db: Float = 8.0

/// How many readings a room needs before it is credited with full confidence,
/// and the step below that. See `confidence_limit`.
pub const well_mapped_readings: Int = 10

pub const barely_mapped_readings: Int = 3

/// Networks not heard in a room for this long are ignored when matching.
///
/// Access points get decommissioned and moved. A network that has not been
/// heard in a room in six months says more about when it was tagged than about
/// where the caller is now.
pub const max_network_age_days: Int = 180

/// What one room remembers about one network: a typical reading, how much it
/// usually varies, and how many readings that is based on.
pub type Reading {
  Reading(bssid: String, rssi_mean: Float, spread: Float, n: Int)
}

/// A room together with everything it remembers about nearby networks.
pub type TaggedNode {
  TaggedNode(node: Node, readings: List(Reading))
}

/// How well one room matches the caller's scan.
pub type Match {
  Match(
    tagged: TaggedNode,
    // ranking score. More agreeing networks wins; a network whose reading is
    // wildly outside what the room usually sees loses two points.
    points: Int,
    // 0 when every reading sits exactly on the room's average, 1 when every
    // reading sits at the edge of what the room normally produces. Can exceed
    // 1 when readings are well outside it.
    strain: Float,
    // how many networks the room and the caller both see
    agree: Int,
    // 0–100
    confidence: Int,
    // how many readings that answer is based on
    samples: Int,
  )
}

/// Handle POST /api/position.
///
/// Auth is enforced upstream in `backend.route` via `app_auth.require_auth`.
///
/// Returns `200` with the best matching room and a confidence score, `404` if
/// no tagged room shares a single network with the caller's scan, or an error
/// response (400/500) on a malformed request or a database failure.
pub fn handle(
  request: wisp.Request,
  conn: sqlight.Connection,
) -> wisp.Response {
  use body <- wisp.require_string_body(request)

  case decode_body(body) {
    Error(_) -> error(400, "invalid_json", "Could not parse position request")
    Ok(position_request) ->
      case validate(position_request) {
        Error(msg) -> error(400, "validation_failed", msg)
        Ok(_) -> respond(conn, position_request.fingerprints)
      }
  }
}

/// Score every tagged room against `scans` and answer with the best one.
fn respond(
  conn: sqlight.Connection,
  scans: List(Fingerprint),
) -> wisp.Response {
  case load_tagged_nodes(conn) {
    Error(msg) -> error(500, "database_error", msg)
    Ok([]) ->
      error(
        404,
        "no_match",
        "No rooms have been tagged with Wi-Fi fingerprints yet. Tag a room "
          <> "with POST /api/ping first.",
      )
    Ok(tagged_nodes) ->
      case best_match(tagged_nodes, scans) {
        None ->
          error(
            404,
            "no_match",
            "None of the tagged rooms share a Wi-Fi network with this scan. "
              <> "Re-tag the room you are in.",
          )
        Some(found) -> {
          let response =
            PositionResult(
              node: found.tagged.node,
              confidence: found.confidence,
              confidence_level: confidence_level(found.confidence),
              samples: found.samples,
            )
          wisp.ok()
          |> wisp.json_body(json.to_string(encode_position_result(response)))
        }
      }
  }
}

// --- Matching ---

/// The best-scoring room, or `None` when no room shares a network with the scan.
///
/// Ties keep the earlier room, so the same scan always resolves to the same
/// answer rather than flickering between equally good rooms.
pub fn best_match(
  tagged_nodes: List(TaggedNode),
  scans: List(Fingerprint),
) -> Option(Match) {
  list.fold(tagged_nodes, None, fn(best: Option(Match), tagged) {
    case score_node(tagged, scans) {
      None -> best
      Some(candidate) ->
        case best {
          None -> Some(candidate)
          Some(current) ->
            case is_better(candidate, current) {
              True -> Some(candidate)
              False -> best
            }
        }
    }
  })
}

/// Whether `candidate` should win over `current`.
///
/// Three rules in order: more agreeing networks wins, then the tidier match,
/// then the better-mapped room. The last rule matters because a room seen once
/// and a room seen a hundred times can produce identical readings — without it
/// the thinly-mapped room wins ties by luck of ordering.
fn is_better(candidate: Match, current: Match) -> Bool {
  case candidate.points != current.points {
    True -> candidate.points > current.points
    False ->
      case candidate.strain != current.strain {
        True -> candidate.strain <. current.strain
        False -> candidate.samples > current.samples
      }
  }
}

/// Score one room against the current scan, or `None` if they share no network.
pub fn score_node(
  tagged: TaggedNode,
  scans: List(Fingerprint),
) -> Option(Match) {
  case agreed_readings(tagged.readings, scans) {
    [] -> None
    agreed -> {
      let agree = list.length(agreed)
      let diff_sum = sum_over(agreed, fn(row) { row.diff })
      let allowed_sum = sum_over(agreed, fn(row) { row.allowed })
      // `allowed` is never below `min_spread_db`, so this cannot divide by zero.
      let strain = diff_sum /. allowed_sum
      let surprises = list.count(agreed, fn(row) { row.diff >. row.allowed })
      let samples = lowest_samples(agreed)

      Some(Match(
        tagged: tagged,
        points: agree - 2 * surprises,
        strain: strain,
        agree: agree,
        confidence: confidence_pct(agree, strain, samples),
        samples: samples,
      ))
    }
  }
}

/// One network both the room and the caller can see, with how far off the live
/// reading is and how far off it would have to be to count as a surprise.
type Agreed {
  Agreed(diff: Float, allowed: Float, samples: Int)
}

/// Compare the caller's readings against the room's, for networks both can see.
///
/// A network the room has never heard of, or one the caller cannot see, is
/// not evidence either way and is skipped.
fn agreed_readings(
  room: List(Reading),
  scans: List(Fingerprint),
) -> List(Agreed) {
  list.flat_map(scans, fn(scan) {
    let bssid = string.lowercase(scan.bssid)
    case
      list.find(room, fn(reading) { string.lowercase(reading.bssid) == bssid })
    {
      Ok(reading) -> {
        let diff =
          float.absolute_value(int.to_float(scan.rssi) -. reading.rssi_mean)
        let allowed = allowed_gap(reading.spread)
        [Agreed(diff: diff, allowed: allowed, samples: reading.n)]
      }
      Error(_) -> []
    }
  })
}

/// How far a reading may sit from the room's average and still count as
/// agreeing, in dBm.
///
/// Three bounds, narrowest last: at least `min_spread_db`, at most
/// `max_allowed_db`, and in between, two spreads. The floor stops a room seen
/// once from rejecting every later reading. The ceiling stops a noisy room from
/// agreeing with everything.
pub fn allowed_gap(spread: Float) -> Float {
  let two_spreads = float.max(spread *. spread_multiplier, min_spread_db)
  float.min(two_spreads, max_allowed_db)
}

fn sum_over(rows: List(Agreed), each: fn(Agreed) -> Float) -> Float {
  list.fold(rows, 0.0, fn(total, row) { total +. each(row) })
}

/// The fewest readings behind any of the agreeing networks — which is how many
/// times the room has been walked.
///
/// Deliberately not the total. A room with ten networks visited once has ten
/// readings behind it but only one visit, and that should not look as
/// well-mapped as a room visited ten times.
fn lowest_samples(agreed: List(Agreed)) -> Int {
  case agreed {
    [] -> 0
    [first, ..rest] ->
      list.fold(rest, first.samples, fn(lowest, row) {
        case row.samples < lowest {
          True -> row.samples
          False -> lowest
        }
      })
  }
}

/// Score 0–100 from how many networks agreed, how far off their readings were,
/// and how much has actually been recorded for the room.
///
/// More agreeing networks is the stronger signal — one network is visible from
/// several rooms at once, three agreeing is close to conclusive. How far off
/// the readings are then pulls the score down, and `confidence_limit` stops a
/// thinly-mapped room from claiming full confidence off one lucky sample.
pub fn confidence_pct(agree: Int, strain: Float, samples: Int) -> Int {
  let base = case agree {
    3 -> 95.0
    2 -> 85.0
    _ -> 60.0
  }
  let penalty = case agree {
    3 -> 30.0
    2 -> 35.0
    _ -> 40.0
  }
  let lowest = case agree {
    3 -> 20.0
    2 -> 15.0
    _ -> 10.0
  }
  let raw = float.max(lowest, base -. strain *. penalty)
  float.round(raw) |> clamp(0, confidence_limit(samples))
}

/// The highest confidence a room may be given, based on how much has been
/// recorded for it.
///
/// A room seen once or twice has one or two readings per network, so it cannot
/// say how much its signal usually moves. Letting it report full confidence on
/// a lucky exact reading would make thinly-visited rooms beat well-mapped ones,
/// which is backwards.
pub fn confidence_limit(samples: Int) -> Int {
  case samples {
    n if n < barely_mapped_readings -> 60
    n if n < well_mapped_readings -> 85
    _ -> 100
  }
}

/// The label matching a confidence score.
pub fn confidence_level(confidence: Int) -> String {
  case confidence {
    c if c >= high_confidence -> "High"
    c if c >= medium_confidence -> "Medium"
    c if c >= min_confidence -> "Low"
    _ -> "Uncertain"
  }
}

fn clamp(value: Int, low: Int, high: Int) -> Int {
  case value {
    v if v < low -> low
    v if v > high -> high
    v -> v
  }
}

// --- Request handling ---

fn decode_body(body: String) -> Result(PositionRequest, json.DecodeError) {
  json.parse(body, using: decode_position_request())
}

/// Check the scan is shaped well enough to compare against stored fingerprints.
///
/// An empty scan carries no evidence, so it is rejected rather than reported
/// as a miss — the two mean different things to the caller.
pub fn validate(request: PositionRequest) -> Result(Nil, String) {
  case request.fingerprints == [] {
    True -> Error("No Wi-Fi readings in the request")
    False ->
      case list.length(request.fingerprints) > max_fingerprints {
        True ->
          Error(
            "Too many fingerprints in one request (max "
            <> int.to_string(max_fingerprints)
            <> ")",
          )
        False -> Ok(Nil)
      }
  }
}

fn error(status: Int, code: String, details: String) -> wisp.Response {
  wisp.response(status)
  |> wisp.json_body(json.to_string(encode_error(ErrorResponse(code, details))))
}

// --- Database ---

/// Every room that has tagged networks, with each network's mean and spread.
fn load_tagged_nodes(
  conn: sqlight.Connection,
) -> Result(List(TaggedNode), String) {
  let sql =
    "SELECT n.node_id, n.name, n.floor, n.x, n.y,
            a.bssid, a.rssi_mean, a.rssi_m2, a.n
     FROM nodes n
     JOIN room_aps a ON a.node_id = n.node_id
     WHERE a.last_seen >= unixepoch() - ?
     ORDER BY n.node_id"

  let cutoff = max_network_age_days * 24 * 60 * 60

  use rows <- result.try(db_query.query_as_maps(
    sql,
    on: conn,
    with: [sqlight.int(cutoff)],
    expecting: row_decoder(),
  ))
  Ok(group_by_node(rows))
}

/// One node row plus one of its networks.
type Row {
  Row(node: Node, bssid: String, rssi_mean: Float, rssi_m2: Float, n: Int)
}

fn row_decoder() -> decode.Decoder(Row) {
  use node_id <- decode.field("node_id", decode.string)
  use name <- decode.field("name", decode.string)
  use floor <- decode.field("floor", decode.int)
  use x <- decode.field("x", decode.int)
  use y <- decode.field("y", decode.int)
  use bssid <- decode.field("bssid", decode.string)
  use rssi_mean <- decode.field("rssi_mean", decode.float)
  use rssi_m2 <- decode.field("rssi_m2", decode.float)
  use n <- decode.field("n", decode.int)
  decode.success(Row(
    Node(node_id, name, floor, x, y),
    bssid,
    rssi_mean,
    rssi_m2,
    n,
  ))
}

/// Collapse the flat row list into one `TaggedNode` per room.
///
/// The query returns one row per (room, network), so a room's details repeat
/// across its rows and have to be folded back down to a single node.
fn group_by_node(rows: List(Row)) -> List(TaggedNode) {
  let grouped: Dict(String, List(Row)) =
    list.fold(rows, dict.new(), fn(rows, row) {
      dict.upsert(rows, row.node.node_id, fn(existing) {
        case existing {
          Some(rows) -> [row, ..rows]
          None -> [row]
        }
      })
    })

  grouped
  |> dict.to_list
  |> list.map(fn(entry) { build_tagged_node(entry) })
}

fn build_tagged_node(entry: #(String, List(Row))) -> TaggedNode {
  let #(_node_id, rows) = entry
  let readings =
    list.map(rows, fn(row) {
      Reading(
        bssid: string.lowercase(row.bssid),
        rssi_mean: row.rssi_mean,
        spread: stats.spread(stats.Summary(row.n, row.rssi_mean, row.rssi_m2)),
        n: row.n,
      )
    })
  let node = list.fold(rows, Node("", "", 0, 0, 0), fn(_acc, row) { row.node })
  TaggedNode(node: node, readings: readings)
}
