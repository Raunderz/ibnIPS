// backend.gleam
// Entry point: configure logging, open DB, start server, route requests.

import app_auth
import db
import env
import gleam/erlang/process
import gleam/http
import gleam/int
import gleam/io
import map
import mist
import nodes
import ping
import position
import rate_limit
import sqlight
import wisp
import wisp/wisp_mist

/// Start the ICPS backend server.
///
/// - Opens the SQLite database (running migrations).
/// - Loads the JWT secret.
/// - Serves HTTP on port 3000 (or `$PORT`).
pub fn main() -> Nil {
  // Enable Wisp's request logging.
  wisp.configure_logger()

  // Open SQLite database and run migrations.
  let assert Ok(conn) = db.init()
  io.println("Database connected.")

  // Load JWT secret from environment. Required — the server refuses to boot
  // without it rather than signing tokens with a publicly known key.
  let assert Ok(jwt_secret) = env.jwt_secret()
  io.println("JWT secret loaded.")

  // Start the request quota limiter.
  let assert Ok(limiter) =
    rate_limit.start(
      max: rate_limit.default_max_requests,
      window: rate_limit.default_window_ms,
    )
  io.println("Rate limiter started.")

  // Generate a random secret key base for Wisp's internal crypto
  // (CSRF tokens, session cookies, etc. — not our JWT).
  let secret_key_base = wisp.random_string(64)

  // Closure capturing conn, jwt_secret and limiter for the request handler.
  let handler = fn(req) { handle_request(req, conn, jwt_secret, limiter) }

  // Start Mist HTTP server on port 3000 (or PORT env var).
  let assert Ok(_) =
    wisp_mist.handler(handler, secret_key_base)
    |> mist.new
    |> mist.port(env.port(3000))
    |> mist.bind("0.0.0.0")
    |> mist.start

  io.println("Server started on port " <> env.port(3000) |> int.to_string)

  // Block forever — the BEAM VM keeps running.
  process.sleep_forever()
}

/// Route incoming requests to the appropriate handler.
///
/// URL structure:
///   GET  /                 -> health check
///   POST /api/auth         -> login (no auth required)
///   POST /api/auth/logout  -> revoke the caller's session (auth required)
///   POST /api/ping         -> tag room (auth required)
///   POST /api/position     -> locate caller from a Wi-Fi scan (auth required)
///   GET  /api/nodes        -> list nodes (public)
///   GET  /api/map          -> full graph (public)
fn handle_request(
  request: wisp.Request,
  conn: sqlight.Connection,
  jwt_secret: String,
  limiter: rate_limit.Limiter,
) -> wisp.Response {
  use <- wisp.log_request(request)

  // Reject oversized bodies before reading them into memory.
  let request = wisp.set_max_body_size(request, env.max_body_bytes)

  case wisp.path_segments(request) {
    // Health check — no auth needed, and not rate limited so uptime monitors
    // are not throttled alongside real traffic.
    [] -> wisp.ok() |> wisp.string_body("ICPS Server Running")

    // Everything under /api is rate limited per client.
    _ -> {
      use <- rate_limit.limit(limiter, request)
      route(request, conn, jwt_secret)
    }
  }
}

fn route(
  request: wisp.Request,
  conn: sqlight.Connection,
  jwt_secret: String,
) -> wisp.Response {
  case wisp.path_segments(request) {
    // Auth endpoint — no auth needed (this IS auth).
    ["api", "auth"] -> {
      case request.method {
        http.Post -> app_auth.handle_auth(request, conn, jwt_secret)
        _ -> wisp.method_not_allowed(allowed: [http.Post])
      }
    }

    // Logout — auth required, deletes the caller's session.
    ["api", "auth", "logout"] -> {
      case request.method {
        http.Post -> app_auth.handle_logout(request, conn, jwt_secret)
        _ -> wisp.method_not_allowed(allowed: [http.Post])
      }
    }

    // Ping — auth required. The token's user_id (roll number) is passed to
    // the handler for future audit logging.
    ["api", "ping"] -> {
      case request.method {
        http.Post -> {
          app_auth.require_auth(request, conn, jwt_secret, fn(_user_id) {
            ping.handle(request)
          })
        }
        _ -> wisp.method_not_allowed(allowed: [http.Post])
      }
    }

    // Nodes — public, no auth.
    ["api", "nodes"] -> {
      case request.method {
        http.Get -> nodes.handle(request, conn)
        _ -> wisp.method_not_allowed(allowed: [http.Get])
      }
    }

    // Position — auth required. Locates the caller from a live Wi-Fi scan
    // against the fingerprints stored by POST /api/ping.
    ["api", "position"] -> {
      case request.method {
        http.Post -> {
          app_auth.require_auth(request, conn, jwt_secret, fn(_user_id) {
            position.handle(request, conn)
          })
        }
        _ -> wisp.method_not_allowed(allowed: [http.Post])
      }
    }

    // Map — public, no auth.
    ["api", "map"] -> {
      case request.method {
        http.Get -> map.handle(request, conn)
        _ -> wisp.method_not_allowed(allowed: [http.Get])
      }
    }

    // 404 for unknown paths.
    _ -> wisp.not_found()
  }
}
