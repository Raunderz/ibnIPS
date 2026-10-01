// env.gleam
// Environment variable helpers.

import gleam/int
import gleam/result
import gleam/string

@external(erlang, "env_ffi", "get_env")
fn get_env(key: String) -> Result(String, Nil)

// --- Turso credentials ---

/// The Turso URL and token, from `DATABASE_URL` and `DATABASE_TOKEN`.
///
/// Both must be present. When they are, the backend talks to Turso instead of
/// opening a local SQLite file — which matters in production, where a local
/// file lives in `/tmp` and is wiped on every redeploy.
///
/// The URL may be given as `libsql://host` or the newer `libsql:host`; both are
/// accepted and normalised when the request is made.
pub fn turso_credentials() -> Result(#(String, String), Nil) {
  use url <- result.try(get_env("DATABASE_URL"))
  use token <- result.try(get_env("DATABASE_TOKEN"))
  case url == "" || token == "" {
    True -> Error(Nil)
    False -> Ok(#(url, token))
  }
}

// --- Access Key ---

/// The shared access key clients must present, from the `AUTH_KEY` env var.
///
/// This is the credential that protects `POST /api/auth`, which is otherwise
/// open: it issues a token to anyone who asks. Without it, anyone could mint a
/// token for any user and then write to the fingerprint database.
///
/// Returns `Error` when unset or too short to be worth having.
///
/// Unlike `jwt_secret` this does not stop the server booting. A missing key
/// means every login is refused, which is loud and safe — refusing to boot
/// would take the deployed service down for anyone who has not set it yet.
pub fn auth_key() -> Result(String, String) {
  let min_length = 16

  case get_env("AUTH_KEY") {
    Ok(key) ->
      case string.length(key) < min_length {
        True ->
          Error(
            "AUTH_KEY must be at least "
            <> int.to_string(min_length)
            <> " characters. Generate one with `openssl rand -hex 16`.",
          )
        False -> Ok(key)
      }
    Error(_) ->
      Error(
        "AUTH_KEY is not set. Every login will be refused until it is, because "
        <> "it is the only thing stopping anyone from claiming another "
        <> "user's account.",
      )
  }
}

/// The port to listen on, from the `PORT` env var, or `default` if unset.
pub fn port(default: Int) -> Int {
  case get_env("PORT") {
    Ok(value) -> result.unwrap(int.parse(value), default)
    Error(_) -> default
  }
}

// --- JWT Secret ---

/// The JWT signing secret, from the `JWT_SECRET` env var (OS env or `.env`).
///
/// Returns `Error` if the variable is unset or unusable. There is no fallback
/// value: signing tokens with a key that is public in this repository would let
/// anyone mint a valid token for any user, so the server must fail to boot
/// instead.
///
/// The secret must be at least 32 characters. Never commit it to git.
pub fn jwt_secret() -> Result(String, String) {
  let min_length = 32

  case get_env("JWT_SECRET") {
    Ok(secret) ->
      case secret {
        "" | "change_me_in_production" ->
          Error(
            "JWT_SECRET is set to a placeholder value. Generate a random secret "
            <> "with `openssl rand -hex 32` and set it in the environment.",
          )
        _ ->
          case string.length(secret) < min_length {
            True ->
              Error(
                "JWT_SECRET must be at least "
                <> int.to_string(min_length)
                <> " characters for HS256. Generate one with `openssl rand -hex 32`.",
              )
            False -> Ok(secret)
          }
      }
    Error(_) ->
      Error(
        "JWT_SECRET is not set. The server will not start without it because a "
        <> "hardcoded fallback would let anyone forge tokens. Generate one with "
        <> "`openssl rand -hex 32` and set it in the environment.",
      )
  }
}

// --- Database Path ---

/// Path to the SQLite database file, from the `DB_PATH` env var.
///
/// Defaults to `icps.db` in the working directory. Set this explicitly where
/// the working directory is read-only or ephemeral (Render, most container
/// platforms), otherwise the database cannot be created or is lost on every
/// redeploy.
pub fn db_path() -> String {
  case get_env("DB_PATH") {
    Ok(path) if path != "" -> path
    _ -> "icps.db"
  }
}

// --- Request Limits ---

/// Maximum request body we will buffer into memory, in bytes.
///
/// Enforced by Wisp before the body is read, so an oversized upload is
/// rejected without being fully received.
pub const max_body_bytes: Int = 65_536

// --- Map JSON URL ---

/// Optional remote URL for map.json, from `MAP_JSON_URL`
/// (OS env var or `.env` file). Returns Error if unset.
pub fn map_json_url() -> Result(String, Nil) {
  get_env("MAP_JSON_URL")
}
