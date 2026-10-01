import birl
import gleam/list
import gleam/string
import gleeunit
import jwt.{Claims}
import models
import ping

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
