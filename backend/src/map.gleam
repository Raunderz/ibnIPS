import db_query
import gleam/dynamic/decode
import gleam/json
import models.{
  type Edge, type MapData, type Node, Edge, MapData, Node, encode_map_data,
}
import sqlight
import wisp

pub fn handle(
  _request: wisp.Request,
  conn: sqlight.Connection,
) -> wisp.Response {
  case get_map_data(conn) {
    Error(msg) -> {
      let error_json =
        models.encode_error(models.ErrorResponse("database_error", msg))
      wisp.response(500)
      |> wisp.string_body(json.to_string(error_json))
    }
    Ok(data) -> {
      wisp.ok()
      |> wisp.string_body(json.to_string(encode_map_data(data)))
    }
  }
}

fn get_map_data(conn: sqlight.Connection) -> Result(MapData, String) {
  let nodes_sql = "SELECT node_id, name, floor, x, y FROM nodes ORDER BY name"
  let nodes_result =
    db_query.query_as_maps(nodes_sql, on: conn, with: [], expecting: node_row_decoder())

  let edges_sql = "SELECT from_node, to_node, steps, direction FROM edges"
  let edges_result =
    db_query.query_as_maps(edges_sql, on: conn, with: [], expecting: edge_row_decoder())

  case nodes_result, edges_result {
    Ok(nodes), Ok(edges) -> Ok(MapData(nodes: nodes, edges: edges))
    Error(e), _ -> Error(e)
    _, Error(e) -> Error(e)
  }
}

fn node_row_decoder() -> decode.Decoder(Node) {
  use node_id <- decode.field("node_id", decode.string)
  use name <- decode.field("name", decode.string)
  use floor <- decode.field("floor", decode.int)
  use x <- decode.field("x", decode.int)
  use y <- decode.field("y", decode.int)
  decode.success(Node(node_id: node_id, name: name, floor: floor, x: x, y: y))
}

fn edge_row_decoder() -> decode.Decoder(Edge) {
  use from <- decode.field("from_node", decode.string)
  use to <- decode.field("to_node", decode.string)
  use steps <- decode.field("steps", decode.int)
  use direction <- decode.field("direction", decode.string)
  decode.success(Edge(from_node: from, to_node: to, steps: steps, direction: direction))
}
