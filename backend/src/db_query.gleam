// db_query.gleam
// Thin wrapper over the sqlight FFI to run SQL with arguments and decode
// results into Gleam types.

import gleam/dynamic
import gleam/dynamic/decode
import gleam/list
import sqlight

pub type DbError {
  DbError(message: String)
}

pub type AnyRow

@external(erlang, "db_query_ffi", "query_as_maps")
fn query_as_maps_raw(
  sql: String,
  conn: sqlight.Connection,
  args: List(sqlight.Value),
) -> Result(List(AnyRow), DbError)

@external(erlang, "db_query_ffi", "to_dynamic")
fn to_dynamic(row: AnyRow) -> dynamic.Dynamic

@external(erlang, "db_query_ffi", "exec_with_args")
fn exec_with_args_raw(
  sql: String,
  conn: sqlight.Connection,
  args: List(sqlight.Value),
) -> Result(Nil, DbError)

/// Execute a write statement (INSERT/UPDATE/DELETE) with positional args.
pub fn exec_with_args(
  sql: String,
  on conn: sqlight.Connection,
  with args: List(sqlight.Value),
) -> Result(Nil, String) {
  case exec_with_args_raw(sql, conn, args) {
    Ok(_) -> Ok(Nil)
    Error(e) -> Error(e.message)
  }
}

/// Run a SELECT and decode each row (returned as a map of column -> value)
/// through the given decoder.
pub fn query_as_maps(
  sql: String,
  on conn: sqlight.Connection,
  with args: List(sqlight.Value),
  expecting decoder: decode.Decoder(a),
) -> Result(List(a), String) {
  case query_as_maps_raw(sql, conn, args) {
    Error(e) -> Error(e.message)
    Ok(rows) -> {
      list.try_map(rows, fn(row) {
        let dyn = to_dynamic(row)
        case decode.run(dyn, decoder) {
          Ok(value) -> Ok(value)
          Error(errors) -> {
            let msg = case errors {
              [first, ..] -> first.expected <> ", got " <> first.found
              [] -> "unknown decode error"
            }
            Error(msg)
          }
        }
      })
    }
  }
}
