// auth.gleam
// Dead-simple auth: check email ends with @iitb.ac.in, generate a random token.
// Tokens are stored in Erlang process dictionary (in-memory, per-VM).

import gleam/http/request
import gleam/json
import gleam/string
import models.{type AuthRequest, AuthResponse, ErrorResponse}
import wisp

@external(erlang, "app_auth_ffi", "init_table")
pub fn init_table() -> Nil

@external(erlang, "app_auth_ffi", "put_token")
fn put_token(token: String, email: String) -> Nil

@external(erlang, "app_auth_ffi", "get_token")
fn get_token(token: String) -> Result(String, Nil)

/// Check if email ends with @iitb.ac.in (case-insensitive).
fn is_valid_email(email: String) -> Bool {
  string.ends_with(string.lowercase(email), "@iitb.ac.in")
}

/// Generate a random 32-character token.
fn generate_token() -> String {
  wisp.random_string(32)
}

/// Parse JSON body into AuthRequest.
fn parse_auth_body(body: String) -> Result(AuthRequest, Nil) {
  case json.parse(body, using: models.decode_auth_request()) {
    Ok(req) -> Ok(req)
    Error(_) -> Error(Nil)
  }
}

/// POST /api/auth
/// Request: {"email": "user@iitb.ac.in"}
/// Response: {"token": "random_string"} or 403
pub fn handle_auth(request: wisp.Request) -> wisp.Response {
  use body <- wisp.require_string_body(request)

  case parse_auth_body(body) {
    Error(_) -> {
      let error_json =
        models.encode_error(ErrorResponse(
          "invalid_json",
          "Could not parse request body",
        ))
      wisp.bad_request("Could not parse request body")
      |> wisp.string_body(json.to_string(error_json))
    }
    Ok(auth_req) -> {
      case is_valid_email(auth_req.email) {
        False -> {
          let error_json =
            models.encode_error(ErrorResponse(
              "unauthorized",
              "Email must end with @iitb.ac.in",
            ))
          wisp.response(403)
          |> wisp.string_body(json.to_string(error_json))
        }
        True -> {
          let token = generate_token()
          // Store token -> email mapping in process dictionary.
          // This survives as long as the BEAM VM is running.
          put_token(token, auth_req.email)

          let resp_json = models.encode_auth_response(AuthResponse(token))
          wisp.ok()
          |> wisp.string_body(json.to_string(resp_json))
        }
      }
    }
  }
}

/// Validate Authorization: Bearer <token> header.
/// Returns Ok(email) if valid, Error(Nil) if not.
pub fn validate_token(request: wisp.Request) -> Result(String, Nil) {
  case request.get_header(request, "authorization") {
    Error(Nil) -> Error(Nil)
    Ok(header) -> {
      case string.split(header, " ") {
        ["Bearer", token] -> get_token(token)
        _ -> Error(Nil)
      }
    }
  }
}

/// Middleware: require valid auth token for a handler.
/// Usage: require_auth(request, fn(email) { handle_ping(request, conn, email) })
pub fn require_auth(
  request: wisp.Request,
  handler: fn(String) -> wisp.Response,
) -> wisp.Response {
  case validate_token(request) {
    Error(Nil) -> {
      let error_json =
        models.encode_error(ErrorResponse(
          "unauthorized",
          "Invalid or missing token",
        ))
      wisp.response(401)
      |> wisp.string_body(json.to_string(error_json))
    }
    Ok(email) -> handler(email)
  }
}
