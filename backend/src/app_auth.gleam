// app_auth.gleam
// Authentication handlers and middleware.
//
// Flow:
//   POST /api/auth -> validate domain -> extract roll_no -> upsert user
//                   -> create session -> sign JWT -> return token
//
//   Protected routes -> validate Bearer header -> verify JWT -> check session
//                     -> extract roll_no -> call handler

import birl
import db
import db_query
import env
import gleam/bit_array
import gleam/crypto
import gleam/dynamic/decode
import gleam/http/request
import gleam/json
import gleam/string
import jwt.{Claims}
import models.{type AuthRequest, ErrorResponse}
import sqlight
import wisp

// --- Access Key Validation ---

/// Whether the supplied key matches the one from `AUTH_KEY`.
///
/// Compared in constant time so that a caller cannot discover the key one
/// character at a time by timing how long the rejection takes.
///
/// `expected` is `Error` when `AUTH_KEY` is unset. That rejects every login
/// rather than accepting every login: a server with no key configured must not
/// hand out tokens to whoever asks.
pub fn is_valid_access_key(
  supplied: String,
  expected: Result(String, String),
) -> Bool {
  case expected {
    Error(_) -> False
    Ok(expected_key) ->
      crypto.secure_compare(
        bit_array.from_string(supplied),
        bit_array.from_string(expected_key),
      )
  }
}

/// Check the email is `something@kiit.ac.in`.
///
/// Case-insensitive, and the domain check and the split are done on the same
/// lower-cased value — otherwise `23B1234@KIIT.AC.IN` passes the domain check
/// and then fails the split.
fn is_valid_email(email: String) -> Bool {
  string.ends_with(string.lowercase(email), "@kiit.ac.in")
}

/// Extract the roll number from an email.
///
/// `"23b1234@kiit.ac.in"` -> `Ok("23b1234")`
///
/// Rejects an empty roll number, which would otherwise become a user whose id
/// is the empty string.
fn extract_roll_number(email: String) -> Result(String, String) {
  case string.split(email, "@") {
    [roll_no, "kiit.ac.in"] ->
      case roll_no == "" {
        True -> Error("Invalid email format: must be roll_no@kiit.ac.in")
        False -> Ok(roll_no)
      }
    _ -> Error("Invalid email format: must be roll_no@kiit.ac.in")
  }
}

// --- Token Generation ---

/// Generate a cryptographically random session ID (64-char alphanumeric).
/// The ID is stored in the `sessions` table and inside the JWT's `sid` claim.
fn generate_session_id() -> String {
  wisp.random_string(64)
}

/// How long a token stays valid, in seconds. 24 hours.
const session_length_seconds: Int = 86_400

/// Create a new JWT for a user.
/// - sub: roll number
/// - sid: session_id (stored in DB)
/// - iat: now
/// - exp: now + 24 hours
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

/// Create a new session row.
fn insert_session(
  conn: db.Connection,
  session_id: String,
  user_id: String,
  expires_at: Int,
) -> Result(Nil, String) {
  let sql =
    "INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)"
  db_query.exec_with_args(sql, on: conn, with: [
    sqlight.text(session_id),
    sqlight.text(user_id),
    sqlight.int(expires_at),
  ])
}

/// Look up session by ID and check it's not expired.
/// Returns user_id if valid session.
fn validate_session(
  conn: db.Connection,
  session_id: String,
) -> Result(String, String) {
  let sql =
    "SELECT user_id FROM sessions WHERE session_id = ? AND expires_at > unixepoch()"
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
/// Request: {"email": "23b1234@kiit.ac.in", "access_key": "..."}
/// Response: {"token": "<jwt>", "user_id": "23b1234"}
///
/// Steps:
/// 1. Parse JSON body
/// 2. Check the access key against `AUTH_KEY`
/// 3. Validate email domain
/// 4. Extract roll number
/// 5. Upsert user in DB
/// 6. Generate session
/// 7. Sign JWT
/// 8. Return token + user_id
pub fn handle_auth(
  request: wisp.Request,
  conn: db.Connection,
  jwt_secret: String,
) -> wisp.Response {
  use body <- wisp.require_string_body(request)

  case parse_auth_body(body) {
    Error(_) -> error(400, "invalid_json", "Could not parse request body")
    Ok(auth_req) -> check_access_key(auth_req, conn, jwt_secret)
  }
}

/// Reject the request unless it carries the shared access key.
///
/// The key is checked before the email, so a wrong key gives the same answer
/// whatever email was sent with it. Otherwise the response would confirm which
/// addresses are real.
fn check_access_key(
  auth_req: AuthRequest,
  conn: db.Connection,
  jwt_secret: String,
) -> wisp.Response {
  case is_valid_access_key(auth_req.access_key, env.auth_key()) {
    False -> error(401, "unauthorized", "Invalid or missing access key")
    True -> check_email(auth_req, conn, jwt_secret)
  }
}

/// Check the email is an institutional one and turn it into a user id.
fn check_email(
  auth_req: AuthRequest,
  conn: db.Connection,
  jwt_secret: String,
) -> wisp.Response {
  case is_valid_email(auth_req.email) {
    False -> error(403, "unauthorized", "Email must end with @kiit.ac.in")
    True ->
      case extract_roll_number(string.lowercase(auth_req.email)) {
        Error(msg) -> error(400, "invalid_email", msg)
        Ok(user_id) -> create_session(conn, jwt_secret, user_id, auth_req)
      }
  }
}

/// Record the user and their new session, then sign and return a token.
fn create_session(
  conn: db.Connection,
  jwt_secret: String,
  user_id: String,
  auth_req: AuthRequest,
) -> wisp.Response {
  case upsert_user(conn, user_id, auth_req.email) {
    Error(msg) -> error(500, "database_error", msg)
    Ok(Nil) -> {
      let session_id = generate_session_id()
      let expires = birl.to_unix(birl.now()) + session_length_seconds

      case insert_session(conn, session_id, user_id, expires) {
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
