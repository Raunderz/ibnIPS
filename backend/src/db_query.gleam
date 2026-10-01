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

/// Run `fun` inside a transaction, rolling back if it returns an Error.
///
/// `BEGIN IMMEDIATE` takes the write lock up front. A deferred transaction that
/// only upgrades to a write part-way through can fail with SQLITE_BUSY in a
/// situation that cannot be retried without losing the work already done.
///
/// `to_error` converts this function's own database errors (begin, commit) into
/// the caller's error type; errors from `fun` pass through untouched.
///
/// Call this with a connection dedicated to the current request — see
/// `db.with_connection`. A transaction on a connection shared with other
/// processes is not isolated from them.
pub fn transaction(
  conn: sqlight.Connection,
  to_error to_error: fn(String) -> e,
  run fun: fn() -> Result(a, e),
) -> Result(a, e) {
  case exec_with_args("BEGIN IMMEDIATE;", on: conn, with: []) {
    Error(msg) -> Error(to_error(msg))
    Ok(Nil) ->
      case fun() {
        Ok(value) ->
          case exec_with_args("COMMIT;", on: conn, with: []) {
            Ok(Nil) -> Ok(value)
            Error(msg) -> {
              let _ = exec_with_args("ROLLBACK;", on: conn, with: [])
              Error(to_error(msg))
            }
          }
        Error(e) -> {
          let _ = exec_with_args("ROLLBACK;", on: conn, with: [])
          Error(e)
        }
      }
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
