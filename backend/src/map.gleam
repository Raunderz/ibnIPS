// map.gleam
// GET /api/map — full graph (nodes + edges) from map.json.

import gleam/json
import models
import sqlight
import wisp

@external(erlang, "file_ffi", "read_file")
fn read_file(path: String) -> Result(String, String)

/// Handle GET /api/map. Reads map.json and returns it directly.
pub fn handle(
  _request: wisp.Request,
  _conn: sqlight.Connection,
) -> wisp.Response {
  case read_file("map.json") {
    Error(msg) -> {
      let error_json =
        models.encode_error(models.ErrorResponse("file_error", msg))
      wisp.response(500)
      |> wisp.string_body(json.to_string(error_json))
    }
    Ok(content) -> {
      wisp.ok()
      |> wisp.string_body(content)
    }
  }
}
