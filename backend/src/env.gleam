import gleam/int
import gleam/result

@external(erlang, "env_ffi", "get_env")
fn get_env(key: String) -> Result(String, Nil)

pub fn port(default: Int) -> Int {
  case get_env("PORT") {
    Ok(value) -> result.unwrap(int.parse(value), default)
    Error(_) -> default
  }
}

// --- NEW: JWT Secret ---

/// set JWT_SECRET
/// via environment variable. Never commit secrets to git.
///
/// The secret must be at least 32 bytes (256 bits) for HS256 security.
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
