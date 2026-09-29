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
import db_query
import gleam/dynamic/decode
import gleam/http/request
import gleam/json
import gleam/string
import jwt.{Claims}
import models.{type AuthRequest, ErrorResponse}
import sqlight
import wisp

// --- Domain Validation ---

/// Check if the email ends with `@kiit.ac.in` (case-insensitive).
fn is_valid_email(email: String) -> Bool {
  string.ends_with(string.lowercase(email), "@kiit.ac.in")
}

/// Extract the roll number from an email.
///
/// `"23b1234@kiit.ac.in"` -> `Ok("23b1234")`
fn extract_roll_number(email: String) -> Result(String, String) {
  case string.split(email, "@") {
    [roll_no, "kiit.ac.in"] -> Ok(roll_no)
    _ -> Error("Invalid email format: must be roll_no@kiit.ac.in")
  }
}

// --- Token Generation ---

/// Generate a cryptographically random session ID (64-char alphanumeric).
/// The ID is stored in the `sessions` table and inside the JWT's `sid` claim.
fn generate_session_id() -> String {
  wisp.random_string(64)
}

/// Create a new JWT for a user.
/// - sub: roll number
/// - sid: session_id (stored in DB)
/// - iat: now
/// - exp: now + 24 hours (86,400 seconds)
fn create_jwt(user_id: String, session_id: String, secret: String) -> String {
  let now = birl.to_unix(birl.now())
  let expires = now + 86_400
  // 24 hours in seconds

  let claims = Claims(sub: user_id, sid: session_id, iat: now, exp: expires)

  jwt.sign(claims, secret)
}

// --- Database Operations ---

/// Upsert user: insert if new, update last_login if existing.
/// Uses INSERT ... ON CONFLICT for atomic upsert.
fn upsert_user(
  conn: sqlight.Connection,
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
  conn: sqlight.Connection,
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
  conn: sqlight.Connection,
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
/// Request: {"email": "23b1234@kiit.ac.in"}
/// Response: {"token": "<jwt>", "user_id": "23b1234"}
///
/// Steps:
/// 1. Parse JSON body
/// 2. Validate email domain
/// 3. Extract roll number
/// 4. Upsert user in DB
/// 5. Generate session
/// 6. Sign JWT
/// 7. Return token + user_id
pub fn handle_auth(
  request: wisp.Request,
  conn: sqlight.Connection,
  jwt_secret: String,
) -> wisp.Response {
  use body <- wisp.require_string_body(request)

  case parse_auth_body(body) {
    Error(_) -> {
      let error_json =
        models.encode_error(ErrorResponse(
          "invalid_json",
          "Could not parse request body",
        ))
      wisp.bad_request("invalid_json")
      |> wisp.string_body(json.to_string(error_json))
    }
    Ok(auth_req) -> {
      case is_valid_email(auth_req.email) {
        False -> {
          let error_json =
            models.encode_error(ErrorResponse(
              "unauthorized",
              "Email must end with @kiit.ac.in",
            ))
          wisp.response(403)
          |> wisp.string_body(json.to_string(error_json))
        }
        True -> {
          case extract_roll_number(auth_req.email) {
            Error(msg) -> {
              let error_json =
                models.encode_error(ErrorResponse("invalid_email", msg))
              wisp.bad_request("invalid_email")
              |> wisp.string_body(json.to_string(error_json))
            }
            Ok(user_id) -> {
              // Upsert user (track that they logged in).
              case upsert_user(conn, user_id, auth_req.email) {
                Error(msg) -> {
                  let error_json =
                    models.encode_error(ErrorResponse("database_error", msg))
                  wisp.response(500)
                  |> wisp.string_body(json.to_string(error_json))
                }
                Ok(Nil) -> {
                  // Create session.
                  let session_id = generate_session_id()
                  let now = birl.to_unix(birl.now())
                  let expires = now + 86_400

                  case insert_session(conn, session_id, user_id, expires) {
                    Error(msg) -> {
                      let error_json =
                        models.encode_error(ErrorResponse("database_error", msg))
                      wisp.response(500)
                      |> wisp.string_body(json.to_string(error_json))
                    }
                    Ok(Nil) -> {
                      // Sign JWT and return.
                      let token = create_jwt(user_id, session_id, jwt_secret)

                      let resp_json =
                        json.object([
                          #("token", json.string(token)),
                          #("user_id", json.string(user_id)),
                        ])

                      wisp.ok()
                      |> wisp.string_body(json.to_string(resp_json))
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

// --- Middleware: Validate Bearer Token ---

/// Extract and verify JWT from Authorization header.
/// Returns Ok(user_id) if valid, Error(response) if not.
///
/// This is used by require_auth below.
fn validate_token(
  req: wisp.Request,
  conn: sqlight.Connection,
  jwt_secret: String,
) -> Result(String, wisp.Response) {
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
                Ok(user_id) -> Ok(user_id)
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
  conn: sqlight.Connection,
  jwt_secret: String,
  handler: fn(String) -> wisp.Response,
) -> wisp.Response {
  case validate_token(request, conn, jwt_secret) {
    Error(response) -> response
    Ok(user_id) -> handler(user_id)
  }
}
