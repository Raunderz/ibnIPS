// app_auth.gleam
// Authentication handlers and middleware.
//
// Flow:
//   POST /api/auth -> resolve access code -> upsert user -> create session
//                   -> sign JWT -> return token
//
//   Protected routes -> validate Bearer header -> verify JWT -> check session
//                     is still backed by a live code -> extract roll_no
//
// An access code is issued by the auth service (kiit-auth-v2) after it verifies
// a Google identity, and is redeemed here against the `auth_identities` table
// that service owns. Both live in the same database, so there is no call out to
// it and no way for it being down to stop anyone logging in.
//
// Nothing about the user comes from the request. The old model took an email
// and a shared secret and trusted both, so anyone holding the secret could log
// in as any address on the domain; now the roll number is whatever the code is
// already bound to.

import access_code
import birl
import db
import db_query
import gleam/dynamic/decode
import gleam/http/request
import gleam/json
import gleam/string
import jwt.{Claims}
import models.{type AuthRequest, ErrorResponse}
import sqlight
import wisp

// --- Code Handling ---

/// Trim a submitted code, or reject it if nothing is left.
///
/// The length ceiling is not about the digest — it bounds what gets hashed, so
/// a caller cannot make the server spend time on an arbitrarily long string.
/// It is deliberately far above any real code, which is `kiit_` plus 32
/// characters of base64url.
const max_code_length: Int = 512

/// Trim a submitted code, or reject it if nothing is left.
///
/// Public so the hygiene rules can be tested without a request; it is not part
/// of the service's surface.
pub fn normalise_code(submitted: String) -> Result(String, String) {
  let trimmed = string.trim(submitted)
  case trimmed {
    "" -> Error("Missing access code")
    _ ->
      case string.length(trimmed) > max_code_length {
        True -> Error("Access code is not a valid code")
        False -> Ok(trimmed)
      }
  }
}

// --- Token Generation ---

/// Generate a cryptographically random session ID (64-char alphanumeric).
/// The ID is stored in the `sessions` table and inside the JWT's `sid` claim.
fn generate_session_id() -> String {
  wisp.random_string(64)
}

/// How long a token stays valid, in seconds. 30 days.
///
/// Fixed from the moment the code is redeemed, not extended on use. A sliding
/// window would mean a stolen code never expires for as long as whoever took it
/// keeps using it.
///
/// This is a backstop, not the control. A session stops working the moment its
/// code is rotated, its identity is revoked, or the user logs out — all three
/// are checked per request in `validate_session` — so a long lifetime costs a
/// stolen token a month of exposure in the case where none of those happen.
const session_length_seconds: Int = 2_592_000

/// Create a new JWT for a user.
/// - sub: roll number
/// - sid: session_id (stored in DB)
/// - iat: now
/// - exp: now + session_length_seconds
fn create_jwt(user_id: String, session_id: String, secret: String) -> String {
  let now = birl.to_unix(birl.now())

  let claims =
    Claims(
      sub: user_id,
      sid: session_id,
      iat: now,
      exp: now + session_length_seconds,
    )

  jwt.sign(claims, secret)
}

// --- Database Operations ---

/// Upsert user: insert if new, update last_login if existing.
/// Uses INSERT ... ON CONFLICT for atomic upsert.
fn upsert_user(
  conn: db.Connection,
  user_id: String,
  email: String,
) -> Result(Nil, String) {
  let sql =
    "
    INSERT INTO users (user_id, email, last_login)
    VALUES (?, ?, unixepoch())
    ON CONFLICT(user_id) DO UPDATE SET last_login = unixepoch()
    "
  db_query.exec_with_args(sql, on: conn, with: [
    sqlight.text(user_id),
    sqlight.text(email),
  ])
}

/// Create a new session row, pinned to the code it was redeemed against.
fn insert_session(
  conn: db.Connection,
  session_id: String,
  user_id: String,
  code_hash: String,
  expires_at: Int,
) -> Result(Nil, String) {
  let sql =
    "INSERT INTO sessions (session_id, user_id, code_hash, expires_at)
     VALUES (?, ?, ?, ?)"
  db_query.exec_with_args(sql, on: conn, with: [
    sqlight.text(session_id),
    sqlight.text(user_id),
    sqlight.text(code_hash),
    sqlight.int(expires_at),
  ])
}

/// Look up a session and report its user, but only while the code behind it
/// still redeems to a live identity.
///
/// This one statement is what makes a long-lived token safe. It has to hold for
/// every route, so all four ways a session can end are folded into it:
///
///   - `expires_at > unixepoch()` — the 30-day backstop
///   - the row still being present — logout deleted it
///   - `s.code_hash = a.code_hash` — rotation replaced the digest
///   - `a.revoked_at IS NULL` — the identity was revoked outright
///
/// Joining on the digest rather than the roll number is deliberate: `code_hash`
/// is UNIQUE and therefore indexed, whereas a roll number comparison would also
/// have to agree on letter case across two services that derive it differently.
fn validate_session(
  conn: db.Connection,
  session_id: String,
) -> Result(String, String) {
  let sql =
    "SELECT s.user_id
     FROM sessions s
     JOIN auth_identities a ON a.code_hash = s.code_hash
     WHERE s.session_id = ?
       AND s.expires_at > unixepoch()
       AND a.revoked_at IS NULL
     LIMIT 1"
  let decoder = {
    use user_id <- decode.field("user_id", decode.string)
    decode.success(user_id)
  }
  case
    db_query.query_as_maps(
      sql,
      on: conn,
      with: [sqlight.text(session_id)],
      expecting: decoder,
    )
  {
    Ok([user_id]) -> Ok(user_id)
    Ok([]) -> Error("Session expired or not found")
    Ok(_) -> Error("Multiple sessions with same ID (should never happen)")
    Error(msg) -> Error(msg)
  }
}

/// Delete a session row, revoking the token that carries it.
fn delete_session(
  conn: db.Connection,
  session_id: String,
) -> Result(Nil, String) {
  db_query.exec_with_args(
    "DELETE FROM sessions WHERE session_id = ?",
    on: conn,
    with: [sqlight.text(session_id)],
  )
}

/// Remove sessions that have already expired.
///
/// Called after each successful login. Expired rows cannot be used to
/// authenticate anything — `validate_session` rejects them — but without this
/// the table grows without bound. Errors are ignored: housekeeping must never
/// fail a login.
fn purge_expired_sessions(conn: db.Connection) -> Nil {
  let _ =
    db_query.exec_with_args(
      "DELETE FROM sessions WHERE expires_at <= unixepoch()",
      on: conn,
      with: [],
    )
  Nil
}

// --- Request Parsing ---

/// Parse JSON body into AuthRequest.
fn parse_auth_body(body: String) -> Result(AuthRequest, Nil) {
  case json.parse(body, using: models.decode_auth_request()) {
    Ok(req) -> Ok(req)
    Error(_) -> Error(Nil)
  }
}

// --- Public Handler: POST /api/auth ---

/// POST /api/auth
/// Request: {"code": "kiit_..."}
/// Response: {"token": "<jwt>", "user_id": "23b1234"}
///
/// Steps:
/// 1. Parse JSON body
/// 2. Hash the code and look up the identity it is bound to
/// 3. Upsert user in DB
/// 4. Create session, pinned to that code's digest
/// 5. Sign JWT
/// 6. Return token + user_id
pub fn handle_auth(
  request: wisp.Request,
  conn: db.Connection,
  jwt_secret: String,
) -> wisp.Response {
  use body <- wisp.require_string_body(request)

  case parse_auth_body(body) {
    Error(_) -> error(400, "invalid_json", "Could not parse request body")
    Ok(auth_req) -> redeem_code(auth_req, conn, jwt_secret)
  }
}

/// Turn a submitted code into the identity it redeems to.
///
/// An unknown code and a revoked one are the same answer on purpose. The
/// difference between "that code does not exist" and "that code was withdrawn"
/// is not something a caller who is not signed in is entitled to.
fn redeem_code(
  auth_req: AuthRequest,
  conn: db.Connection,
  jwt_secret: String,
) -> wisp.Response {
  case normalise_code(auth_req.code) {
    Error(msg) -> error(401, "unauthorized", msg)
    Ok(raw) ->
      case access_code.find_owner(conn, access_code.hash_code(raw)) {
        Error(_) -> error(401, "unauthorized", "Invalid or expired access code")
        Ok(owner) ->
          create_session(
            conn,
            jwt_secret,
            owner.roll_number,
            owner.email,
            owner.code_hash,
          )
      }
  }
}

/// Record the user and their new session, then sign and return a token.
fn create_session(
  conn: db.Connection,
  jwt_secret: String,
  user_id: String,
  email: String,
  code_hash: String,
) -> wisp.Response {
  case upsert_user(conn, user_id, email) {
    Error(msg) -> error(500, "database_error", msg)
    Ok(Nil) -> {
      let session_id = generate_session_id()
      let expires = birl.to_unix(birl.now()) + session_length_seconds

      case insert_session(conn, session_id, user_id, code_hash, expires) {
        Error(msg) -> error(500, "database_error", msg)
        Ok(Nil) -> {
          // Housekeeping: drop sessions that have expired.
          purge_expired_sessions(conn)

          let token = create_jwt(user_id, session_id, jwt_secret)
          let resp_json =
            json.object([
              #("token", json.string(token)),
              #("user_id", json.string(user_id)),
            ])

          wisp.ok()
          |> wisp.json_body(json.to_string(resp_json))
        }
      }
    }
  }
}

/// Build the standard error response.
fn error(status: Int, code: String, details: String) -> wisp.Response {
  let error_json = models.encode_error(ErrorResponse(code, details))
  wisp.response(status)
  |> wisp.string_body(json.to_string(error_json))
}

// --- Middleware: Validate Bearer Token ---

/// Extract and verify JWT from Authorization header.
/// Returns `Ok(#(user_id, session_id))` if valid, `Error(response)` if not.
///
/// This is used by require_auth and handle_logout below.
fn validate_token(
  req: wisp.Request,
  conn: db.Connection,
  jwt_secret: String,
) -> Result(#(String, String), wisp.Response) {
  case request.get_header(req, "authorization") {
    Error(Nil) -> {
      let error_json =
        models.encode_error(ErrorResponse(
          "unauthorized",
          "Missing Authorization header",
        ))
      Error(wisp.response(401) |> wisp.string_body(json.to_string(error_json)))
    }
    Ok(header) -> {
      case string.split(header, " ") {
        ["Bearer", token] -> {
          case jwt.verify(token, jwt_secret) {
            Error(jwt_error) -> {
              let msg = case jwt_error {
                jwt.TokenExpired -> "Token expired"
                jwt.InvalidSignature -> "Invalid token signature"
                jwt.InvalidFormat -> "Malformed token"
                _ -> "Invalid token"
              }
              let error_json =
                models.encode_error(ErrorResponse("unauthorized", msg))
              Error(
                wisp.response(401)
                |> wisp.string_body(json.to_string(error_json)),
              )
            }
            Ok(claims) -> {
              // JWT signature and expiry are valid.
              // Now check session still exists in DB (revocation support).
              case validate_session(conn, claims.sid) {
                Error(msg) -> {
                  let error_json =
                    models.encode_error(ErrorResponse("unauthorized", msg))
                  Error(
                    wisp.response(401)
                    |> wisp.string_body(json.to_string(error_json)),
                  )
                }
                Ok(user_id) -> Ok(#(user_id, claims.sid))
              }
            }
          }
        }
        _ -> {
          let error_json =
            models.encode_error(ErrorResponse(
              "unauthorized",
              "Authorization header must be: Bearer <token>",
            ))
          Error(
            wisp.response(401) |> wisp.string_body(json.to_string(error_json)),
          )
        }
      }
    }
  }
}

/// The caller's user id when they sent a usable token, `Error` otherwise.
///
/// Unlike `require_auth` this never rejects a request — it is for endpoints
/// that are public but can attribute a row to a signed-in user when one is
/// available. `POST /api/feedback` uses it: a bad token means the response is
/// recorded anonymously, not refused.
pub fn identify(
  request: wisp.Request,
  conn: db.Connection,
  jwt_secret: String,
) -> Result(String, Nil) {
  case validate_token(request, conn, jwt_secret) {
    Ok(#(user_id, _session_id)) -> Ok(user_id)
    Error(_) -> Error(Nil)
  }
}

/// Middleware: require valid auth token before calling handler.
///
/// Usage in route handlers:
///   app_auth.require_auth(request, conn, jwt_secret, fn(user_id) {
///     // user_id is the roll number (e.g., "23b1234")
///     handle_protected_stuff(request, conn, user_id)
///   })
pub fn require_auth(
  request: wisp.Request,
  conn: db.Connection,
  jwt_secret: String,
  handler: fn(String) -> wisp.Response,
) -> wisp.Response {
  case validate_token(request, conn, jwt_secret) {
    Error(response) -> response
    Ok(#(user_id, _session_id)) -> handler(user_id)
  }
}

/// POST /api/auth/logout
///
/// Deletes the caller's session row. The token itself stays cryptographically
/// valid until it expires, but every protected route re-checks the `sid` claim
/// against the `sessions` table, so a revoked token stops working immediately.
///
/// Returns `{"status":"logged_out"}`.
pub fn handle_logout(
  request: wisp.Request,
  conn: db.Connection,
  jwt_secret: String,
) -> wisp.Response {
  case validate_token(request, conn, jwt_secret) {
    Error(response) -> response
    Ok(#(_user_id, session_id)) ->
      case delete_session(conn, session_id) {
        Error(msg) -> {
          let error_json =
            models.encode_error(ErrorResponse("database_error", msg))
          wisp.response(500)
          |> wisp.json_body(json.to_string(error_json))
        }
        Ok(Nil) -> {
          let resp_json = json.object([#("status", json.string("logged_out"))])
          wisp.ok()
          |> wisp.json_body(json.to_string(resp_json))
        }
      }
  }
}
