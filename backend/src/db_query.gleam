// db_query.gleam
// Run SQL and decode the results into Gleam types.
//
// Two backends sit behind one set of functions: a local SQLite file (esqlite3,
// via db_query_ffi) and Turso over HTTPS (via turso). `db.open` decides which,
// and this module sends each statement to whichever the connection holds.
//
// The SQL itself is identical for both — Turso speaks the same dialect.

import database
import gleam/dynamic
import gleam/dynamic/decode
import gleam/list
import sqlight
import turso

pub type DbError {
  DbError(message: String)
}

/// A row as the backend hands it back: a map of column name to value.
pub type AnyRow =
  dynamic.Dynamic

@external(erlang, "db_query_ffi", "query_as_maps")
fn sqlite_query(
  sql: String,
  conn: database.Connection,
  args: List(sqlight.Value),
) -> Result(List(AnyRow), DbError)

@external(erlang, "db_query_ffi", "exec_with_args")
fn sqlite_exec(
  sql: String,
  conn: database.Connection,
  args: List(sqlight.Value),
) -> Result(Nil, DbError)

/// Run a statement with no arguments.
///
/// Used for the schema statements at boot, which are plain SQL and should work
/// against either backend.
pub fn exec_plain(
  sql: String,
  on conn: database.Connection,
) -> Result(Nil, Nil) {
  case exec_with_args(sql, on: conn, with: []) {
    Ok(_) -> Ok(Nil)
    Error(_) -> Error(Nil)
  }
}

/// Execute a write statement (INSERT/UPDATE/DELETE) with positional args.
pub fn exec_with_args(
  sql: String,
  on conn: database.Connection,
  with args: List(sqlight.Value),
) -> Result(Nil, String) {
  case database.is_turso(conn) {
    False ->
      case sqlite_exec(sql, conn, args) {
        Ok(_) -> Ok(Nil)
        Error(e) -> Error(e.message)
      }
    True -> {
      let #(url, token) = database.credentials(conn)
      case turso.query(url, token, sql, args) {
        Ok(_) -> Ok(Nil)
        Error(message) -> Error(message)
      }
    }
  }
}

/// Run `fun` inside a transaction, rolling back if it returns an Error.
///
/// Only local SQLite gets a real transaction. Over HTTP each statement is its
/// own request, so BEGIN/COMMIT are meaningless there — Turso serialises writes
/// itself, and our writes are single statements, so they are already atomic.
/// `fun` still runs, just without the wrapper.
///
/// `to_error` converts this function's own database errors (begin, commit) into
/// the caller's error type; errors from `fun` pass through untouched.
///
/// Call this with a connection dedicated to the current request — see
/// `db.with_connection`. A transaction on a connection shared with other
/// processes is not isolated from them.
pub fn transaction(
  conn: database.Connection,
  to_error to_error: fn(String) -> e,
  run fun: fn() -> Result(a, e),
) -> Result(a, e) {
  case database.is_turso(conn) {
    True -> fun()
    False ->
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
}

/// Run a SELECT and decode each row (returned as a map of column -> value)
/// through the given decoder.
pub fn query_as_maps(
  sql: String,
  on conn: database.Connection,
  with args: List(sqlight.Value),
  expecting decoder: decode.Decoder(a),
) -> Result(List(a), String) {
  case database.is_turso(conn) {
    False ->
      case sqlite_query(sql, conn, args) {
        Error(e) -> Error(e.message)
        Ok(rows) -> decode_rows(rows, decoder)
      }
    True -> {
      let #(url, token) = database.credentials(conn)
      case turso.query(url, token, sql, args) {
        Error(message) -> Error(message)
        Ok(rows) -> decode_rows(rows, decoder)
      }
    }
  }
}

fn decode_rows(
  rows: List(AnyRow),
  decoder: decode.Decoder(a),
) -> Result(List(a), String) {
  list.try_map(rows, fn(row) {
    case decode.run(row, decoder) {
      Ok(value) -> Ok(value)
      Error(errors) ->
        case errors {
          [first, ..] -> Error(first.expected <> ", got " <> first.found)
          [] -> Error("unknown decode error")
        }
    }
  })
}
