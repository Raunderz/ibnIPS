// database.gleam
// A connection to whichever database is configured.
//
// Separate from db.gleam so both it and db_query.gleam can refer to the type
// without importing each other.

import sqlight

/// A connection to the database.
///
/// Never constructed directly — use `open_local` or `open_remote`. Ask
/// `is_turso` to find out what is behind it.
pub type Connection

@external(erlang, "db_connection", "open_sqlite")
@external(javascript, "./database.mjs", "open_sqlite")
fn open_sqlite(path: String) -> Result(Connection, Nil)

@external(erlang, "db_connection", "open_turso")
@external(javascript, "./database.mjs", "open_turso")
fn open_turso(url: String, token: String) -> Result(Connection, Nil)

@external(erlang, "db_connection", "close")
@external(javascript, "./database.mjs", "close")
pub fn close(conn: Connection) -> Nil

/// Whether this connection is Turso rather than a local file.
@external(erlang, "db_connection", "is_turso")
@external(javascript, "./database.mjs", "is_turso")
pub fn is_turso(conn: Connection) -> Bool

/// The Turso URL and token. Only valid when `is_turso` is `True`.
@external(erlang, "db_connection", "credentials")
@external(javascript, "./database.mjs", "credentials")
pub fn credentials(conn: Connection) -> #(String, String)

/// The raw esqlite3 handle, for the local-only helpers in db.gleam.
@external(erlang, "db_connection", "sqlite_ref")
@external(javascript, "./database.mjs", "sqlite_ref")
pub fn sqlite_ref(conn: Connection) -> sqlight.Connection

/// Open a connection to the local SQLite file, created if missing.
pub fn open_local(path: String) -> Result(Connection, Nil) {
  open_sqlite(path)
}

/// Open a connection to Turso, checking the credentials work.
pub fn open_remote(url: String, token: String) -> Result(Connection, Nil) {
  open_turso(url, token)
}
