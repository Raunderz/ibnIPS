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

  // Load JWT secret from environment.
  // In production, set JWT_SECRET env var. In dev, falls back to hardcoded.
  let jwt_secret = env.jwt_secret()
  io.println("JWT secret loaded.")

  // Generate a random secret key base for Wisp's internal crypto
  // (CSRF tokens, session cookies, etc. — not our JWT).
  let secret_key_base = wisp.random_string(64)

  // Closure capturing conn and jwt_secret for the request handler.
  let handler = fn(req) { handle_request(req, conn, jwt_secret) }

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
///   POST /api/ping         -> tag room (auth required)
///   GET  /api/nodes        -> list nodes (public)
///   GET  /api/map          -> full graph (public)
///   GET  /api/db/download  -> dev-only: download the SQLite DB file
fn handle_request(
  request: wisp.Request,
  conn: sqlight.Connection,
  jwt_secret: String,
) -> wisp.Response {
  use <- wisp.log_request(request)

  case wisp.path_segments(request) {
    // Health check — no auth needed.
    [] -> wisp.ok() |> wisp.string_body("ICPS Server Running")

    // Auth endpoint — no auth needed (this IS auth).
    ["api", "auth"] -> {
      case request.method {
        http.Post -> app_auth.handle_auth(request, conn, jwt_secret)
        _ -> wisp.method_not_allowed(allowed: [http.Post])
      }
    }

    // Ping — auth required. The token's user_id (roll number) is passed to
    // the handler for future audit logging.
    ["api", "ping"] -> {
      case request.method {
        http.Post -> {
          app_auth.require_auth(request, conn, jwt_secret, fn(_user_id) {
            ping.handle(request, conn)
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

    // Map — public, no auth.
    ["api", "map"] -> {
      case request.method {
        http.Get -> map.handle(request, conn)
        _ -> wisp.method_not_allowed(allowed: [http.Get])
      }
    }

    // Dev-only: download the SQLite database file.
    ["api", "db", "download"] -> {
      case request.method {
        http.Get -> {
          wisp.ok()
          |> wisp.file_download(named: "icps.db", from: "icps.db")
        }
        _ -> wisp.method_not_allowed(allowed: [http.Get])
      }
    }

    // 404 for unknown paths.
    _ -> wisp.not_found()
  }
}
