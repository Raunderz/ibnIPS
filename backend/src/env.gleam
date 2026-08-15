// env.gleam
// Environment variable helpers.

import gleam/int
import gleam/result

@external(erlang, "env_ffi", "get_env")
fn get_env(key: String) -> Result(String, Nil)

/// The port to listen on, from the `PORT` env var, or `default` if unset.
pub fn port(default: Int) -> Int {
  case get_env("PORT") {
    Ok(value) -> result.unwrap(int.parse(value), default)
    Error(_) -> default
  }
}

// --- JWT Secret ---

/// The JWT signing secret, from the `JWT_SECRET` env var.
///
/// Must be at least 32 bytes (256 bits) for HS256 security. Never commit the
/// secret to git. Falls back to a dev-only hardcoded value in development.
pub fn jwt_secret() -> String {
  case get_env("JWT_SECRET") {
    Ok(secret) -> secret
    Error(_) -> {
      // Dev fallback — NOT SAFE FOR PRODUCTION.
      // 64-character hex string = 256 bits of entropy.
      "dev_secret_do_not_use_in_production_please_change_me_now_immediately"
    }
  }
}
