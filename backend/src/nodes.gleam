import db_query
import gleam/dynamic/decode
import gleam/json
import models.{type Node, Node, encode_node}
import sqlight
import wisp

pub fn handle(
  _request: wisp.Request,
  conn: sqlight.Connection,
) -> wisp.Response {
  case get_all_nodes(conn) {
    Error(msg) -> {
      let error_json =
        models.encode_error(models.ErrorResponse("database_error", msg))
      wisp.response(500)
      |> wisp.string_body(json.to_string(error_json))
    }
    Ok(nodes) -> {
      let nodes_json = json.array(nodes, encode_node)
      wisp.ok()
      |> wisp.string_body(json.to_string(nodes_json))
    }
  }
}

fn get_all_nodes(conn: sqlight.Connection) -> Result(List(Node), String) {
  let sql = "SELECT node_id, name, floor, x, y FROM nodes ORDER BY name"
  db_query.query_as_maps(sql, on: conn, with: [], expecting: node_row_decoder())
}

fn node_row_decoder() -> decode.Decoder(Node) {
  use node_id <- decode.field("node_id", decode.string)
  use name <- decode.field("name", decode.string)
  use floor <- decode.field("floor", decode.int)
  use x <- decode.field("x", decode.int)
  use y <- decode.field("y", decode.int)
  decode.success(Node(node_id: node_id, name: name, floor: floor, x: x, y: y))
}
