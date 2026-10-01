// turso.gleam
// Run SQL against Turso over HTTPS instead of a local SQLite file.
//
// Turso speaks the same SQL dialect, so every query in the rest of the backend
// is unchanged. What changes is how a statement runs: instead of `esqlite3`
// opening a file, the SQL is packed into a JSON request, POSTed, and the
// response decoded back into rows.
//
// The response shape, and the only thing this has to understand:
//
//   {"results":[{"type":"ok","response":{"result":{
//      "cols":[{"name":"lab_201_f2"}, ...],
//      "rows":[[{"type":"text","value":"Lab 201"}], ...]}}}]}
//
// Column names and values arrive in two separate arrays, so each row is built by
// zipping them together into a map — which is exactly what `db_query` expects
// from a local database, so nothing downstream changes.

import gleam/dynamic.{type Dynamic}
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/result
import sqlight.{type Value}

@external(erlang, "turso_http", "post")
fn post(url: String, token: String, body: String) -> Result(String, String)

@external(erlang, "turso_http", "classify")
fn classify(value: Value) -> Result(String, Nil)

@external(erlang, "turso_http", "to_string")
fn as_string(value: Value) -> String

@external(erlang, "turso_http", "to_integer")
fn as_integer(value: Value) -> String

@external(erlang, "turso_http", "to_float")
fn as_float(value: Value) -> Float

/// Run one statement with its arguments, returning one map per row.
///
/// `args` are the `sqlight.Value`s the rest of the backend already builds.
pub fn query(
  url: String,
  token: String,
  sql: String,
  args: List(Value),
) -> Result(List(Dynamic), String) {
  let body = request_body(sql, args)

  case post(url, token, body) {
    Error(message) -> Error(message)
    Ok(response) -> decode_rows(response)
  }
}

/// Check the credentials work, so a bad token fails at boot rather than on the
/// first request of the day.
pub fn ping(url: String, token: String) -> Result(Nil, String) {
  case query(url, token, "SELECT 1", []) {
    Ok(_) -> Ok(Nil)
    Error(message) -> Error(message)
  }
}

// --- Building the request ---

/// One execute statement plus a close, which is what the pipeline endpoint
/// expects. It always answers with exactly one result.
fn request_body(sql: String, args: List(Value)) -> String {
  let statement =
    json.object([
      #("sql", json.string(sql)),
      #("args", json.array(args, encode_arg)),
    ])

  json.object([
    #(
      "requests",
      json.array(
        [
          json.object([
            #("type", json.string("execute")),
            #("stmt", statement),
          ]),
          json.object([#("type", json.string("close"))]),
        ],
        fn(entry) { entry },
      ),
    ),
  ])
  |> json.to_string
}

/// Render one argument in the typed form the API expects:
/// `{"type":"text","value":"Lab 201"}`.
fn encode_arg(value: Value) -> json.Json {
  case classify(value) {
    Error(_) -> typed("null", json.string(""))
    Ok("text") -> typed("text", json.string(as_string(value)))
    Ok("integer") -> typed("integer", json.string(as_integer(value)))
    Ok("float") -> typed("float", json.float(as_float(value)))
    Ok(_) -> typed("null", json.string(""))
  }
}

fn typed(kind: String, value: json.Json) -> json.Json {
  json.object([
    #("type", json.string(kind)),
    #("value", value),
  ])
}

// --- Decoding the response ---

// Decoding is written as ordinary Gleam rather than one large decoder, because
// the three possible responses differ in which fields they carry and branching
// on a missing field is clearer than nesting optional_field four deep.

/// Read the rows out of a pipeline response.
///
/// Three shapes come back:
///   {"results":[{"type":"ok","response":{"result":{"cols":…,"rows":…}}}]}
///   {"results":[{"type":"ok","response":{"type":"execute"}}]}      a write
///   {"results":[{"type":"error","error":{"message":…}}]}
fn decode_rows(response: String) -> Result(List(Dynamic), String) {
  let results =
    decode.field("results", decode.list(decode.dynamic), decode.success)

  case json.parse(response, using: results) {
    Error(_) -> Error("could not read the database response")
    Ok([]) -> Error("the database returned no result")
    Ok([first, ..]) -> read_one_result(first)
  }
}

fn read_one_result(result: Dynamic) -> Result(List(Dynamic), String) {
  case error_from(result) {
    Ok(message) -> Error(message)
    Error(Nil) -> rows_in(result)
  }
}

/// The error message, if this result is an error.
fn error_from(result: Dynamic) -> Result(String, Nil) {
  case decode.run(result, field("error")) {
    Ok(error) ->
      case
        decode.run(
          error,
          decode.field("message", decode.string, decode.success),
        )
      {
        Ok(message) -> Ok(message)
        Error(_) -> Ok("the database rejected the statement")
      }
    Error(_) -> Error(Nil)
  }
}

/// The rows, or none for a write.
fn rows_in(result: Dynamic) -> Result(List(Dynamic), String) {
  case decode.run(result, field("response")) {
    Error(_) -> Ok([])
    Ok(response) ->
      case decode.run(response, field("result")) {
        Error(_) -> Ok([])
        Ok(inner) -> {
          // `cols` and `rows` are siblings, so the same object is decoded twice.
          let columns = decode.run(inner, columns())
          let values = decode.run(inner, all_rows())

          case columns, values {
            Ok(columns), Ok(values) -> Ok(zip_rows(columns, values))
            Error(_), _ -> Ok([])
            _, Error(_) -> Ok([])
          }
        }
      }
  }
}

/// One field, as whatever dynamic value it holds.
fn field(name: String) -> decode.Decoder(Dynamic) {
  decode.field(name, decode.dynamic, decode.success)
}

/// Column names. Absent on writes, where there is nothing to select.
fn columns() -> decode.Decoder(List(String)) {
  decode.field(
    "cols",
    decode.list(decode.field("name", decode.string, decode.success)),
    decode.success,
  )
}

/// Every row's values, decoded but not yet paired with column names.
fn all_rows() -> decode.Decoder(List(List(Dynamic))) {
  decode.field("rows", decode.list(decode.list(value())), decode.success)
}

/// One value, tagged by the database with its type.
fn value() -> decode.Decoder(Dynamic) {
  decode.field("type", decode.string, fn(kind) {
    case kind {
      // The API sends integers as JSON strings ("value":"1"), so they are read
      // as a string and parsed here. Floats arrive as real JSON numbers.
      "integer" ->
        decode.field("value", decode.string, fn(v) {
          decode.success(dynamic.int(int.parse(v) |> result.unwrap(0)))
        })
      "float" ->
        decode.field("value", decode.float, fn(v) {
          decode.success(dynamic.float(v))
        })
      "text" ->
        decode.field("value", decode.string, fn(v) {
          decode.success(dynamic.string(v))
        })
      _ -> decode.success(dynamic.nil())
    }
  })
}

/// Pair each row's values with the column names.
fn zip_rows(columns: List(String), rows: List(List(Dynamic))) -> List(Dynamic) {
  list.map(rows, fn(row) { row_to_map(columns, row) })
}

fn row_to_map(columns: List(String), values: List(Dynamic)) -> Dynamic {
  columns
  |> list.zip(values)
  |> list.map(fn(pair) {
    let #(name, value) = pair
    #(dynamic.string(name), value)
  })
  |> dynamic.properties
}
