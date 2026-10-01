import env
import gleam/result
import sqlight

/// Open the SQLite database with the pragmas the app depends on.
///
/// SQLite defaults to `PRAGMA foreign_keys = OFF`, and the setting is
/// per-connection rather than persisted in the file. Without this the
/// `FOREIGN KEY` constraints declared in the schema are silently ignored, so
/// `edges` can reference nodes that do not exist. `busy_timeout` makes a
/// concurrent writer wait for the write lock instead of failing immediately.
fn apply_pragmas(conn: sqlight.Connection) -> Result(Nil, sqlight.Error) {
  use _ <- result.try(sqlight.exec("PRAGMA foreign_keys = ON;", conn))
  use _ <- result.try(sqlight.exec("PRAGMA busy_timeout = 5000;", conn))
  // Best effort: WAL needs filesystem shared-memory support, which is not
  // available on every network filesystem.
  let _ = sqlight.exec("PRAGMA journal_mode = WAL;", conn)
  Ok(Nil)
}

/// Open a connection to the configured database path, creating it if missing.
///
/// Migrations are *not* run — see `init` for the startup path and
/// `with_connection` for request-scoped connections.
pub fn open() -> Result(sqlight.Connection, sqlight.Error) {
  case sqlight.open("file:" <> env.db_path() <> "?mode=rwc") {
    Error(e) -> Error(e)
    Ok(conn) ->
      case apply_pragmas(conn) {
        Ok(Nil) -> Ok(conn)
        Error(e) -> {
          let _ = sqlight.close(conn)
          Error(e)
        }
      }
  }
}

/// Open the SQLite database (creating it if missing) and run migrations.
pub fn init() -> Result(sqlight.Connection, sqlight.Error) {
  case open() {
    Error(e) -> Error(e)
    Ok(conn) ->
      case run_migrations(conn) {
        Error(e) -> {
          let _ = sqlight.close(conn)
          Error(e)
        }
        Ok(Nil) -> Ok(conn)
      }
  }
}

/// Run `fun` against a dedicated connection, then close it.
///
/// Write paths use their own connection so a transaction opened inside `fun`
/// cannot interleave with another request's transaction. Sharing one connection
/// across all mist handler processes would let request B's `COMMIT` close
/// request A's still-open transaction.
pub fn with_connection(
  fun: fn(sqlight.Connection) -> a,
) -> Result(a, sqlight.Error) {
  case open() {
    Error(e) -> Error(e)
    Ok(conn) -> {
      let result = fun(conn)
      let _ = sqlight.close(conn)
      Ok(result)
    }
  }
}

/// Create all tables and indexes. Safe to run repeatedly (uses IF NOT EXISTS).
fn run_migrations(conn: sqlight.Connection) -> Result(Nil, sqlight.Error) {
  // nodes table: rooms / locations
  // x and y default to 0; set later by the backend.
  let nodes_sql =
    "
  CREATE TABLE IF NOT EXISTS nodes (
  node_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  floor INTEGER NOT NULL,
  x INTEGER DEFAULT 0,
  y INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
  );
"
  // fingerprints table: Wi-Fi signal readings per node
  // one node can have many fingerprints
  let fingerprints_sql =
    "
CREATE TABLE IF NOT EXISTS fingerprints(
id INTEGER PRIMARY KEY AUTOINCREMENT,
bssid TEXT NOT NULL,
node_id TEXT NOT NULL,
ssid TEXT,
rssi INTEGER NOT NULL,
sample_count INTEGER DEFAULT 1,
last_updated INTEGER DEFAULT (unixepoch()),
FOREIGN KEY(node_id) REFERENCES nodes(node_id) ON DELETE CASCADE
);
"

  // edges table: connection between nodes
  // unique from_node -> to_node, prevents duplicate edges
  let edges_sql =
    "
CREATE TABLE IF NOT EXISTS edges (
edge_id INTEGER PRIMARY KEY AUTOINCREMENT,
from_node TEXT NOT NULL,
to_node TEXT NOT NULL,
steps INTEGER NOT NULL,
direction TEXT NOT NULL DEFAULT '',
created_at INTEGER DEFAULT (unixepoch()),
FOREIGN KEY(from_node) REFERENCES nodes(node_id),
FOREIGN KEY(to_node) REFERENCES nodes(node_id),
UNIQUE(from_node,to_node)
);
"

  // Indexes for faster lookups.
  let indexes_sql =
    "
  CREATE INDEX IF NOT EXISTS idx_fingerprints_node ON fingerprints(node_id);
  CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_node);
  CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_node);
"

  // --- NEW: users: one row per unique roll number ---
  // user_id is the roll number extracted from email (e.g., "23b1234").
  // email stores the full address for reference.
  // last_login updated every time they authenticate.
  let users_sql =
    "
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER DEFAULT (unixepoch()),
  last_login INTEGER DEFAULT (unixepoch())
);
"

  // --- NEW: sessions: active JWT sessions ---
  // session_id is a random UUID stored inside the JWT's "sid" claim.
  // expires_at is unix epoch seconds. A cron job or cleanup could delete old rows.
  // ON DELETE CASCADE: if user is deleted, their sessions are too.
  let sessions_sql =
    "
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
"

  // Execute each migration in order.
  // `use _ <- result.try(...)` means: if this fails, return the error immediately.
  // If it succeeds, continue to the next line with the result bound to `_`.
  use _ <- result.try(sqlight.exec(nodes_sql, conn))
  use _ <- result.try(sqlight.exec(fingerprints_sql, conn))
  use _ <- result.try(sqlight.exec(edges_sql, conn))
  use _ <- result.try(sqlight.exec(indexes_sql, conn))
  use _ <- result.try(sqlight.exec(users_sql, conn))
  use _ <- result.try(sqlight.exec(sessions_sql, conn))

  Ok(Nil)
}
