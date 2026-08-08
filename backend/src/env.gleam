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
