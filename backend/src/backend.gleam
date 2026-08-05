////
//// ICPS Server Entry Point
////
//// This module bootstraps the Wisp web server using the Mist HTTP adapter.
//// It configures logging, generates a session secret key, binds to port 3000
//// on all interfaces, and dispatches incoming requests to `handle_request`.
////

import db
import gleam/erlang/process
import gleam/io
import mist
import sqlight
import wisp
import wisp/wisp_mist

/// Starts the ICPS web server and blocks forever.
///
/// This function is the application entry point. It performs the following
/// setup steps in order:
///
/// 1. Configures Wisp's structured logger.
/// 2. Generates a cryptographically random 64-character secret key base
///    for cookie signing and session encryption.
/// 3. Builds a Mist HTTP handler from `handle_request` and the secret key.
/// 4. Binds the server to `0.0.0.0:3000` and starts accepting connections.
/// 5. Prints a startup message to stdout.
/// 6. Puts the main Erlang process to sleep forever so the VM stays alive.
///
/// Returns `Nil` because it never actually returns — it blocks via
/// `process.sleep_forever()`.
pub fn main() -> Nil {
  // Enable Wisp's default request logging.
  wisp.configure_logger()

  // open sqlite database
  let assert Ok(conn) = db.init()
  io.println("Database connected")

  // Generate a fresh 64-char random string to sign cookies / sessions.
  let secret_key_base = wisp.random_string(64)

  // closure that cpatures `conn`
  let handler = fn(req) { handle_request(req, conn) }

  // Build the Mist server pipeline:
  //   handler -> adapter -> port -> bind -> start
  let assert Ok(_) =
    wisp_mist.handler(handler, secret_key_base)
    |> mist.new
    |> mist.port(3000)
    |> mist.bind("0.0.0.0")
    |> mist.start

  io.println("Server started on http://localhost:3000")

  // Block the main process so the BEAM VM keeps the server alive.
  process.sleep_forever()
}

/// Dispatches an incoming HTTP request to the appropriate route handler.
///
/// Matches on the URL path segments (the parts between slashes). Currently
/// supports:
///
/// - `[]` (root path `/`) → Returns a 200 OK with "Hello, World!".
/// - Any other path       → Returns a 404 Not Found.
///
/// # Parameters
///
/// - `request`: The incoming `wisp.Request` to route and respond to.
///
/// # Returns
///
/// A `wisp.Response` ready to be sent back to the client.
fn handle_request(request, conn: sqlight.Connection) {
  case wisp.path_segments(request) {
    // Root route: plain text greeting.
    [] -> wisp.ok() |> wisp.string_body("Hello, World!")

    // routes for icps endpoints
    ["api", "tag"] -> wisp.ok() |> wisp.string_body("tag endpoint")
    ["api", "locate"] -> wisp.ok() |> wisp.string_body("locate endpoint")

    // Catch-all: nothing else is defined yet.
    _ -> wisp.not_found()
  }
}
