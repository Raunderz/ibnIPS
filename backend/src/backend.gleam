// main.gleam
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

pub fn main() -> Nil {
  wisp.configure_logger()

  let assert Ok(conn) = db.init()
  io.println("Database connected.")

  let _ = app_auth.init_table()
  io.println("Auth token table initialized.")

  let secret_key_base = wisp.random_string(64)

  let handler = fn(req) { handle_request(req, conn) }

  let assert Ok(_) =
    wisp_mist.handler(handler, secret_key_base)
    |> mist.new
    |> mist.port(env.port(3000))
    |> mist.bind("0.0.0.0")
    |> mist.start

  io.println("Server started on port " <> env.port(3000) |> int.to_string)

  process.sleep_forever()
}

fn handle_request(
  request: wisp.Request,
  conn: sqlight.Connection,
) -> wisp.Response {
  use <- wisp.log_request(request)

  case wisp.path_segments(request) {
    [] -> wisp.ok() |> wisp.string_body("ICPS Server Running")

    ["api", "auth"] -> {
      case request.method {
        http.Post -> app_auth.handle_auth(request)
        _ -> wisp.method_not_allowed(allowed: [http.Post])
      }
    }

    ["api", "ping"] -> {
      case request.method {
        http.Post -> ping.handle(request, conn)
        _ -> wisp.method_not_allowed(allowed: [http.Post])
      }
    }

    ["api", "nodes"] -> {
      case request.method {
        http.Get -> nodes.handle(request, conn)
        _ -> wisp.method_not_allowed(allowed: [http.Get])
      }
    }

    ["api", "map"] -> {
      case request.method {
        http.Get -> map.handle(request, conn)
        _ -> wisp.method_not_allowed(allowed: [http.Get])
      }
    }

    _ -> wisp.not_found()
  }
}
