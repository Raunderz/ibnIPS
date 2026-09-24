// map.gleam
// GET /api/map — full graph (nodes + edges) from MAP_JSON_URL or map.json.

import env
import gleam/io
import gleam/json
import models
import sqlight
import wisp

@external(erlang, "file_ffi", "read_file")
fn read_file(path: String) -> Result(String, String)

@external(erlang, "map_ffi", "fetch_url")
fn fetch_url(url: String) -> Result(String, String)

/// Handle GET /api/map.
/// Uses MAP_JSON_URL (.env / env) when set; otherwise reads local map.json.
pub fn handle(
  _request: wisp.Request,
  _conn: sqlight.Connection,
) -> wisp.Response {
  case env.map_json_url() {
    Ok(url) -> load_from_url(url)
    Error(_) -> load_from_file()
  }
}

fn load_from_url(url: String) -> wisp.Response {
  case fetch_url(url) {
    Error(msg) -> {
      // Log the real fetch failure — Render only shows these lines.
      io.println("MAP_JSON_URL fetch failed: " <> msg)
      error_response("map_fetch_error", msg)
    }
    Ok(content) -> ok_response(content)
  }
}

fn load_from_file() -> wisp.Response {
  case read_file("map.json") {
    Error(msg) -> error_response("file_error", msg)
    Ok(content) -> ok_response(content)
  }
}

fn ok_response(content: String) -> wisp.Response {
  wisp.ok()
  |> wisp.string_body(content)
}

fn error_response(code: String, msg: String) -> wisp.Response {
  let error_json = models.encode_error(models.ErrorResponse(code, msg))
  wisp.response(500)
  |> wisp.string_body(json.to_string(error_json))
}
