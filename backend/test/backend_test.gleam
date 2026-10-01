import app_auth
import birl
import gleam/float
import gleam/list
import gleam/option.{None, Some}
import gleam/string
import gleeunit
import jwt.{Claims}
import models
import ping
import position
import stats

pub fn main() -> Nil {
  gleeunit.main()
}

const test_secret = "test_secret_that_is_long_enough_for_hs256"

// --- jwt ---

pub fn jwt_round_trip_test() {
  let claims =
    Claims(
      sub: "23b1234",
      sid: "sid-abc",
      iat: 1_700_000_000,
      exp: 2_000_000_000,
    )

  let token = jwt.sign(claims, test_secret)

  assert jwt.verify(token, test_secret) == Ok(claims)
}

pub fn jwt_rejects_wrong_secret_test() {
  let claims =
    Claims(
      sub: "23b1234",
      sid: "sid-abc",
      iat: 1_700_000_000,
      exp: 2_000_000_000,
    )
  let token = jwt.sign(claims, test_secret)
  let other_secret = "a_completely_different_secret_value_here"

  assert jwt.verify(token, other_secret) == Error(jwt.InvalidSignature)
}

pub fn jwt_rejects_tampered_signature_test() {
  let claims =
    Claims(
      sub: "23b1234",
      sid: "sid-abc",
      iat: 1_700_000_000,
      exp: 2_000_000_000,
    )
  let assert [header, payload, _signature] =
    string.split(jwt.sign(claims, test_secret), ".")

  // Reuse the payload but swap in a signature minted over a different payload.
  let other =
    Claims(
      sub: "attacker",
      sid: "sid-evil",
      iat: 1_700_000_000,
      exp: 2_000_000_000,
    )
  let assert [_h, _p, other_signature] =
    string.split(jwt.sign(other, test_secret), ".")

  let forged = header <> "." <> payload <> "." <> other_signature

  assert jwt.verify(forged, test_secret) == Error(jwt.InvalidSignature)
}

pub fn jwt_rejects_expired_token_test() {
  let now = birl.to_unix(birl.now())
  let claims =
    Claims(sub: "23b1234", sid: "sid-abc", iat: now - 100, exp: now - 1)

  assert jwt.verify(jwt.sign(claims, test_secret), test_secret)
    == Error(jwt.TokenExpired)
}

pub fn jwt_rejects_malformed_token_test() {
  assert jwt.verify("not-a-jwt", test_secret) == Error(jwt.InvalidFormat)
  assert jwt.verify("only.two", test_secret) == Error(jwt.InvalidFormat)
  assert jwt.verify("a.b.c.d", test_secret) == Error(jwt.InvalidFormat)
}

// --- ping validation ---

/// `count` placeholder readings. Validation looks at the list length, not the
/// contents, so the values do not need to vary.
fn readings(count: Int) -> List(models.Fingerprint) {
  list.repeat(models.Fingerprint("aa:bb:cc:dd:ee:ff", "campus", -65), count)
}

pub fn ping_accepts_first_room_test() {
  let ping = models.PingRequest("Lab 201", 2, "", -1, "", readings(3))

  assert ping.validate_ping(ping) == Ok(Nil)
}

pub fn ping_rejects_first_room_with_steps_test() {
  let ping = models.PingRequest("Lab 201", 2, "", 4, "N", [])

  assert ping.validate_ping(ping)
    == Error("First room must have null steps and direction")
}

pub fn ping_accepts_linked_room_test() {
  let ping =
    models.PingRequest("Lab 202", 2, "lab_201_f2", 5, "NE", readings(1))

  assert ping.validate_ping(ping) == Ok(Nil)
}

pub fn ping_rejects_bad_direction_test() {
  let ping = models.PingRequest("Lab 202", 2, "lab_201_f2", 5, "UP", [])

  assert ping.validate_ping(ping)
    == Error("Direction must be one of: N, NE, E, SE, S, SW, W, NW")
}

pub fn ping_rejects_non_positive_steps_test() {
  let ping = models.PingRequest("Lab 202", 2, "lab_201_f2", 0, "N", [])

  assert ping.validate_ping(ping)
    == Error("Steps must be between 1 and 1000 for a linked room")
}

pub fn ping_rejects_absurd_step_count_test() {
  let ping = models.PingRequest("Lab 202", 2, "lab_201_f2", 100_000, "N", [])

  assert ping.validate_ping(ping)
    == Error("Steps must be between 1 and 1000 for a linked room")
}

pub fn ping_accepts_maximum_fingerprints_test() {
  let ping =
    models.PingRequest(
      "Lab 201",
      2,
      "",
      -1,
      "",
      readings(ping.max_fingerprints),
    )

  assert ping.validate_ping(ping) == Ok(Nil)
}

pub fn ping_rejects_too_many_fingerprints_test() {
  let ping =
    models.PingRequest(
      "Lab 201",
      2,
      "",
      -1,
      "",
      readings(ping.max_fingerprints + 1),
    )

  assert ping.validate_ping(ping)
    == Error("Too many fingerprints in one request (max 200)")
}

pub fn ping_rejects_overlong_name_test() {
  let ping =
    models.PingRequest(string.repeat("Lab 201 ", 20), 2, "", -1, "", [])

  assert ping.validate_ping(ping)
    == Error("Room name is too long (max 100 characters)")
}

// --- node ids ---

pub fn node_id_normalises_case_and_punctuation_test() {
  assert ping.generate_node_id("Lab 201", 2) == "lab_201_f2"
  assert ping.generate_node_id("LAB 201", 2) == "lab_201_f2"
  assert ping.generate_node_id("Lab-201", 2) == "lab_201_f2"
  assert ping.generate_node_id("Lab/201", 2) == "lab_201_f2"
  assert ping.generate_node_id("3C-157", 1) == "3c_157_f1"
}

pub fn node_id_differs_across_floors_test() {
  assert ping.generate_node_id("Lab 201", 2)
    != ping.generate_node_id("Lab 201", 3)
}

pub fn node_id_replaces_non_ascii_characters_test() {
  // The id is a mechanical transform of the name, not something a user ever
  // reads — the room name is what gets displayed. "é" and the space each
  // become one underscore.
  assert ping.generate_node_id("Café 12", 1) == "caf__12_f1"
}

// --- stats ---

pub fn stats_of_no_readings_test() {
  assert stats.add_all([]).n == 0
  assert stats.spread(stats.empty) == 0.0
}

pub fn stats_averages_readings_test() {
  let summary = stats.add_all([-55.0, -60.0, -70.0])

  assert summary.n == 3
  assert float.round(summary.mean) == -62
}

pub fn stats_spread_of_identical_readings_is_zero_test() {
  let summary = stats.add_all([-55.0, -55.0, -55.0])

  assert stats.spread(summary) == 0.0
}

pub fn stats_spread_grows_as_readings_vary_test() {
  let tight = stats.add_all([-55.0, -56.0, -54.0])
  let loose = stats.add_all([-55.0, -75.0, -35.0])

  assert stats.spread(loose) >. stats.spread(tight)
}

pub fn stats_single_reading_has_no_spread_test() {
  assert stats.spread(stats.add(stats.empty, -55.0)) == 0.0
}

// --- position validation ---

pub fn position_rejects_empty_scan_test() {
  assert position.validate(models.PositionRequest([]))
    == Error("No Wi-Fi readings in the request")
}

pub fn position_accepts_single_reading_test() {
  assert position.validate(models.PositionRequest(readings(1))) == Ok(Nil)
}

pub fn position_rejects_too_many_readings_test() {
  let request = models.PositionRequest(readings(position.max_fingerprints + 1))

  assert position.validate(request)
    == Error("Too many fingerprints in one request (max 200)")
}

// --- position matching ---

/// A network the room has seen `spread` dBm either side of its mean, from
/// `samples` visits.
fn known(
  bssid: String,
  mean: Float,
  spread: Float,
  samples: Int,
) -> position.Reading {
  position.Reading(bssid, mean, spread, samples)
}

/// A room that remembers each network perfectly, from many visits.
fn mapped_room(
  node_id: String,
  networks: List(#(String, Float)),
) -> position.TaggedNode {
  position.TaggedNode(
    node: models.Node(node_id, node_id, 1, 10, 20),
    readings: list.map(networks, fn(entry) {
      let #(bssid, mean) = entry
      known(bssid, mean, 6.0, 20)
    }),
  )
}

/// A room seen exactly once: one reading per network, no spread.
fn once_seen_room(
  node_id: String,
  networks: List(#(String, Float)),
) -> position.TaggedNode {
  position.TaggedNode(
    node: models.Node(node_id, node_id, 1, 10, 20),
    readings: list.map(networks, fn(entry) {
      let #(bssid, mean) = entry
      known(bssid, mean, 0.0, 1)
    }),
  )
}

fn scans(readings: List(#(String, Int))) -> List(models.Fingerprint) {
  list.map(readings, fn(entry) {
    let #(bssid, rssi) = entry
    models.Fingerprint(bssid, "campus", rssi)
  })
}

/// Three networks, all read at a plausible strength.
fn three_networks() -> List(#(String, Float)) {
  [
    #("aa:bb:cc:dd:ee:01", -55.0),
    #("aa:bb:cc:dd:ee:02", -60.0),
    #("aa:bb:cc:dd:ee:03", -70.0),
  ]
}

pub fn position_returns_no_match_without_shared_network_test() {
  let rooms = [mapped_room("lab_201_f2", three_networks())]
  let scan = scans([#("11:22:33:44:55:66", -55)])

  assert position.best_match(rooms, scan) == None
}

pub fn position_returns_no_match_for_empty_room_set_test() {
  assert position.best_match([], scans([#("aa:bb:cc:dd:ee:01", -55)])) == None
}

pub fn position_matches_a_well_mapped_room_with_high_confidence_test() {
  let rooms = [mapped_room("lab_201_f2", three_networks())]
  let scan =
    scans([
      #("aa:bb:cc:dd:ee:01", -56),
      #("aa:bb:cc:dd:ee:02", -61),
      #("aa:bb:cc:dd:ee:03", -69),
    ])

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.tagged.node.node_id == "lab_201_f2"
  assert found.agree == 3
  assert found.confidence >= 75
  assert found.samples == 20
  assert position.confidence_level(found.confidence) == "High"
}

pub fn position_tolerates_readings_inside_the_rooms_spread_test() {
  // 10 dBm off each mean, inside the 12 dBm the room's own spread allows.
  let rooms = [mapped_room("lab_201_f2", three_networks())]
  let scan =
    scans([
      #("aa:bb:cc:dd:ee:01", -65),
      #("aa:bb:cc:dd:ee:02", -70),
      #("aa:bb:cc:dd:ee:03", -80),
    ])

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.points == 3
  assert found.tagged.node.node_id == "lab_201_f2"
}

pub fn position_counts_a_wildly_off_reading_as_a_surprise_test() {
  // 40 dBm off, far beyond the 12 dBm this room's spread allows.
  let rooms = [mapped_room("lab_201_f2", three_networks())]
  let scan =
    scans([
      #("aa:bb:cc:dd:ee:01", -95),
      #("aa:bb:cc:dd:ee:02", -100),
      #("aa:bb:cc:dd:ee:03", -110),
    ])

  let assert Some(found) = position.best_match(rooms, scan)

  // 3 agreeing networks, all surprising: 3 - 2*3.
  assert found.points == -3
  assert found.confidence < 30
}

pub fn position_prefers_the_room_with_more_shared_networks_test() {
  let rooms = [
    mapped_room("lab_201_f2", [#("aa:bb:cc:dd:ee:01", -55.0)]),
    mapped_room("lab_202_f2", three_networks()),
  ]
  let scan =
    scans([
      #("aa:bb:cc:dd:ee:01", -56),
      #("aa:bb:cc:dd:ee:02", -61),
      #("aa:bb:cc:dd:ee:03", -69),
    ])

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.tagged.node.node_id == "lab_202_f2"
}

pub fn position_lets_a_well_mapped_room_beat_a_once_seen_one_test() {
  // Both rooms see all three networks. The once-seen room's numbers sit
  // exactly on the scan, so without a spread it would look perfect and win on
  // confidence. It should still lose, because it is barely mapped.
  let rooms = [
    once_seen_room("thin_f1", three_networks()),
    mapped_room("thick_f1", three_networks()),
  ]
  let scan =
    scans([
      #("aa:bb:cc:dd:ee:01", -55),
      #("aa:bb:cc:dd:ee:02", -60),
      #("aa:bb:cc:dd:ee:03", -70),
    ])

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.tagged.node.node_id == "thick_f1"
  assert found.confidence > position.confidence_limit(3)
}

pub fn position_caps_confidence_for_a_thinly_mapped_room_test() {
  let rooms = [once_seen_room("thin_f1", three_networks())]
  // An exact repeat of the single visit. Perfect on every count, but there is
  // only one reading behind it.
  let scan =
    scans([
      #("aa:bb:cc:dd:ee:01", -55),
      #("aa:bb:cc:dd:ee:02", -60),
      #("aa:bb:cc:dd:ee:03", -70),
    ])

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.confidence == 60
  assert position.confidence_level(found.confidence) == "Medium"
}

pub fn position_confidence_limit_tiers_test() {
  assert position.confidence_limit(1) == 60
  assert position.confidence_limit(2) == 60
  assert position.confidence_limit(3) == 85
  assert position.confidence_limit(9) == 85
  assert position.confidence_limit(10) == 100
  assert position.confidence_limit(500) == 100
}

pub fn position_never_reports_a_thin_room_as_high_confidence_test() {
  // Even a perfect match on one network, from one visit.
  assert position.confidence_pct(3, 0.0, 1) <= 60
  assert position.confidence_pct(1, 0.0, 1) <= 60
}

pub fn position_reports_a_well_mapped_perfect_match_as_high_test() {
  assert position.confidence_pct(3, 0.0, 100) == 95
  assert position.confidence_pct(2, 0.0, 100) == 85
  assert position.confidence_pct(1, 0.0, 100) == 60
}

pub fn position_reports_more_than_three_agreeing_networks_as_high_test() {
  // The tier is "three or more", not "exactly three". Agreeing on eight
  // networks is the strongest evidence there is, so it has to score as the top
  // tier rather than falling through to the one-network tier.
  assert position.confidence_pct(4, 0.0, 100) == 95
  assert position.confidence_pct(8, 0.0, 100) == 95
  assert position.confidence_pct(12, 0.0, 100) == 95
}

pub fn position_many_agreeing_networks_still_lose_confidence_for_strain_test() {
  // Fixing the tier must not flatten the penalty: badly-off readings still pull
  // the score down, and a thinly-mapped room is still capped.
  assert position.confidence_pct(8, 0.0, 100)
    > position.confidence_pct(8, 1.5, 100)
  assert position.confidence_pct(8, 0.0, 1) <= 60
}

pub fn position_lowers_confidence_as_readings_move_further_off_test() {
  let near = position.confidence_pct(3, 0.3, 100)
  let far = position.confidence_pct(3, 1.5, 100)

  assert near > far
}

pub fn position_confidence_stays_within_tiers_test() {
  assert position.confidence_level(90) == "High"
  assert position.confidence_level(75) == "High"
  assert position.confidence_level(74) == "Medium"
  assert position.confidence_level(50) == "Medium"
  assert position.confidence_level(49) == "Low"
  assert position.confidence_level(30) == "Low"
  assert position.confidence_level(29) == "Uncertain"
}

pub fn position_matches_network_names_case_insensitively_test() {
  let rooms = [
    mapped_room("lab_201_f2", [#("AA:BB:CC:DD:EE:01", -55.0)]),
  ]
  let scan = scans([#("aa:bb:cc:dd:ee:01", -56)])

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.agree == 1
}

// --- one network per scan, on the position side ---
//
// How many networks agree is the strongest signal a match has, so it has to
// count networks the caller can see rather than how many times the caller
// listed one. Otherwise a repeated BSSID outranks a genuine match.

pub fn position_counts_a_repeated_network_once_test() {
  let rooms = [mapped_room("lab_201_f2", three_networks())]
  // The same network written down fifty times is still one network.
  let scan =
    list.repeat(models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -56), 50)

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.agree == 1
  assert found.points == 1
}

pub fn position_does_not_let_a_repeated_network_win_test() {
  // Two rooms both see network 01. The second shares only that one network but
  // lists it fifty times, so without the collapse it scores 50 points against
  // the first room's genuine 3.
  let rooms = [
    mapped_room("one_network_f1", [#("aa:bb:cc:dd:ee:01", -55.0)]),
    mapped_room("three_networks_f1", three_networks()),
  ]
  let scan =
    list.append(
      scans([
        #("aa:bb:cc:dd:ee:01", -56),
        #("aa:bb:cc:dd:ee:02", -61),
        #("aa:bb:cc:dd:ee:03", -69),
      ]),
      list.repeat(models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -56), 50),
    )

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.tagged.node.node_id == "three_networks_f1"
  assert found.agree == 3
}

pub fn position_keeps_the_strongest_of_two_readings_for_one_network_test() {
  let rooms = [mapped_room("lab_201_f2", [#("aa:bb:cc:dd:ee:01", -55.0)])]
  // This room allows 12 dBm either side of its mean. -50 is inside that, -95 is
  // well outside it, so which of the two is kept decides points 1 versus -1.
  let scan = scans([#("aa:bb:cc:dd:ee:01", -95), #("aa:bb:cc:dd:ee:01", -50)])

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.agree == 1
  assert found.points == 1
}

pub fn position_keeps_the_strongest_repeat_in_any_case_test() {
  let rooms = [mapped_room("lab_201_f2", [#("aa:bb:cc:dd:ee:01", -55.0)])]
  let scan = scans([#("aa:bb:cc:dd:ee:01", -95), #("AA:BB:CC:DD:EE:01", -40)])

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.agree == 1
}

// --- ping: name and floor bounds ---
//
// A blank or punctuation-only name produces the id `_f1`, and every other
// punctuation-only name collides with it. An absurd floor produces a permanent
// room nobody can find.

pub fn ping_rejects_blank_room_name_test() {
  let ping = models.PingRequest("", 1, "", -1, "", [])

  assert ping.validate_ping(ping)
    == Error("Room name must contain at least one letter or digit")
}

pub fn ping_rejects_whitespace_room_name_test() {
  let ping = models.PingRequest("   ", 1, "", -1, "", [])

  assert ping.validate_ping(ping)
    == Error("Room name must contain at least one letter or digit")
}

pub fn ping_rejects_punctuation_only_room_name_test() {
  let ping = models.PingRequest("!!! ---", 1, "", -1, "", [])

  assert ping.validate_ping(ping)
    == Error("Room name must contain at least one letter or digit")
}

pub fn ping_accepts_room_name_with_punctuation_and_digits_test() {
  assert ping.validate_ping(models.PingRequest("3C-157", 1, "", -1, "", []))
    == Ok(Nil)
}

pub fn ping_rejects_absurdly_low_floor_test() {
  let ping = models.PingRequest("Basement", -99_999, "", -1, "", [])

  assert ping.validate_ping(ping) == Error("Floor must be between -10 and 100")
}

pub fn ping_rejects_absurdly_high_floor_test() {
  let ping = models.PingRequest("Tower", 100_000, "", -1, "", [])

  assert ping.validate_ping(ping) == Error("Floor must be between -10 and 100")
}

pub fn ping_accepts_basement_floor_test() {
  assert ping.validate_ping(models.PingRequest("B1", -2, "", -1, "", []))
    == Ok(Nil)
}

pub fn ping_accepts_top_of_range_floor_test() {
  assert ping.validate_ping(models.PingRequest("Tower", 100, "", -1, "", []))
    == Ok(Nil)
}

// --- ping: signal strength bounds ---
//
// Readings are folded into a running mean and cannot be removed, so an
// out-of-range value permanently wrecks a room's matchability.

pub fn ping_rejects_absurdly_strong_signal_test() {
  let readings = [models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", 999_999)]
  let ping = models.PingRequest("Lab 201", 2, "", -1, "", readings)

  assert ping.validate_ping(ping)
    == Error("Signal strength must be between -120 and 0 dBm")
}

pub fn ping_rejects_absurdly_weak_signal_test() {
  let readings = [models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -999_999)]
  let ping = models.PingRequest("Lab 201", 2, "", -1, "", readings)

  assert ping.validate_ping(ping)
    == Error("Signal strength must be between -120 and 0 dBm")
}

pub fn ping_rejects_when_only_one_reading_is_out_of_range_test() {
  let readings = [
    models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -65),
    models.Fingerprint("aa:bb:cc:dd:ee:02", "campus", -60),
    models.Fingerprint("aa:bb:cc:dd:ee:03", "campus", 500),
  ]
  let ping = models.PingRequest("Lab 201", 2, "", -1, "", readings)

  assert ping.validate_ping(ping)
    == Error("Signal strength must be between -120 and 0 dBm")
}

pub fn ping_accepts_signal_at_range_bounds_test() {
  let readings = [
    models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", ping.min_rssi),
    models.Fingerprint("aa:bb:cc:dd:ee:02", "campus", ping.max_rssi),
  ]
  let ping = models.PingRequest("Lab 201", 2, "", -1, "", readings)

  assert ping.validate_ping(ping) == Ok(Nil)
}

pub fn ping_accepts_ordinary_readings_test() {
  let readings = [
    models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -96),
    models.Fingerprint("aa:bb:cc:dd:ee:02", "campus", -88),
    models.Fingerprint("aa:bb:cc:dd:ee:03", "campus", -34),
  ]
  let ping = models.PingRequest("Lab 201", 2, "", -1, "", readings)

  assert ping.validate_ping(ping) == Ok(Nil)
}

// --- access key ---
//
// The key is the only thing stopping anyone claiming another user's account,
// since POST /api/auth will otherwise mint a token for any address.

pub fn access_key_accepts_the_configured_key_test() {
  assert app_auth.is_valid_access_key(
    "correct-horse-battery",
    Ok("correct-horse-battery"),
  )
}

pub fn access_key_rejects_a_wrong_key_test() {
  assert !app_auth.is_valid_access_key("wrong", Ok("correct-horse-battery"))
}

pub fn access_key_rejects_an_empty_key_test() {
  assert !app_auth.is_valid_access_key("", Ok("correct-horse-battery"))
}

pub fn access_key_rejects_a_key_that_is_a_prefix_test() {
  assert !app_auth.is_valid_access_key(
    "correct-horse",
    Ok("correct-horse-battery"),
  )
}

pub fn access_key_rejects_everything_when_none_is_configured_test() {
  assert !app_auth.is_valid_access_key("anything", Error("AUTH_KEY is not set"))
}

// --- one visit per scan ---
//
// The visit count caps a room's confidence, so a request that listed the same
// network repeatedly could mark a never-visited room as fully mapped.

pub fn one_reading_per_network_collapses_mixed_case_duplicates_test() {
  let scan = [
    models.Fingerprint("AA:BB:CC:DD:EE:01", "campus", -60),
    models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -70),
    models.Fingerprint("Aa:Bb:Cc:Dd:Ee:01", "campus", -80),
  ]

  // All three are the same network; the strongest reading (-60) is kept.
  assert ping.one_reading_per_network(scan)
    == [models.Fingerprint("AA:BB:CC:DD:EE:01", "campus", -60)]
}

pub fn one_reading_per_network_keeps_distinct_networks_test() {
  let scan = [
    models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -60),
    models.Fingerprint("aa:bb:cc:dd:ee:02", "campus", -70),
  ]

  assert ping.one_reading_per_network(scan) == scan
}

pub fn one_reading_per_network_handles_an_empty_scan_test() {
  assert ping.one_reading_per_network([]) == []
}

pub fn one_reading_per_network_keeps_strongest_reading_test() {
  let scan = [
    models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -80),
    models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -40),
    models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -60),
  ]

  assert ping.one_reading_per_network(scan)
    == [models.Fingerprint("aa:bb:cc:dd:ee:01", "campus", -40)]
}

pub fn one_reading_per_network_does_not_reorder_distinct_networks_test() {
  let scan = [
    models.Fingerprint("ff:ff:ff:ff:ff:ff", "campus", -60),
    models.Fingerprint("00:00:00:00:00:01", "campus", -60),
  ]

  // Sorted by bssid so the saved rows come out in a stable order.
  assert ping.one_reading_per_network(scan)
    == [
      models.Fingerprint("00:00:00:00:00:01", "campus", -60),
      models.Fingerprint("ff:ff:ff:ff:ff:ff", "campus", -60),
    ]
}

// --- spread ceiling ---
//
// Without a ceiling a room whose signal swung wildly would agree with any
// reading and match scans taken elsewhere.

pub fn allowed_gap_uses_two_spreads_when_within_bounds_test() {
  assert position.allowed_gap(5.0) == 10.0
  assert position.allowed_gap(7.0) == 14.0
}

pub fn allowed_gap_floors_at_the_minimum_test() {
  assert position.allowed_gap(0.0) == position.min_spread_db
  assert position.allowed_gap(1.0) == position.min_spread_db
}

pub fn allowed_gap_is_capped_for_a_very_noisy_room_test() {
  assert position.allowed_gap(20.0) == position.max_allowed_db
  assert position.allowed_gap(1000.0) == position.max_allowed_db
}

pub fn noisy_room_penalises_a_reading_from_elsewhere_test() {
  // A room whose signal swung 40 dBm across visits.
  let rooms = [
    position.TaggedNode(models.Node("noisy_f1", "Noisy", 1, 0, 0), [
      position.Reading("aa:bb:cc:dd:ee:01", -60.0, 20.0, 40),
    ]),
  ]
  // A reading 40 dBm off the mean. The room is still considered — it does share
  // the network — but it must be scored as a surprise, not as agreement.
  let scan = scans([#("aa:bb:cc:dd:ee:01", -100)])

  let assert Some(found) = position.best_match(rooms, scan)

  // 1 agreeing network, 1 surprise: 1 - 2 = -1.
  assert found.points == -1
  assert found.confidence == 10
  assert position.confidence_level(found.confidence) == "Uncertain"
}

pub fn noisy_room_still_accepts_a_reading_near_its_mean_test() {
  let rooms = [
    position.TaggedNode(models.Node("noisy_f1", "Noisy", 1, 0, 0), [
      position.Reading("aa:bb:cc:dd:ee:01", -60.0, 20.0, 40),
    ]),
  ]
  let scan = scans([#("aa:bb:cc:dd:ee:01", -68)])

  let assert Some(found) = position.best_match(rooms, scan)

  assert found.points == 1
  assert found.tagged.node.node_id == "noisy_f1"
}
