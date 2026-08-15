import gleam/result
import sqlight

const db_path = "icps.db"

/// Open the SQLite database (creating it if missing) and run migrations.
pub fn init() -> Result(sqlight.Connection, sqlight.Error) {
  case sqlight.open("file:" <> db_path <> "?mode=rwc") {
    Error(e) -> Error(e)
    Ok(conn) -> {
      // Run all CREATE TABLE statements.
      // If any fail, close the connection and return the error.
      case run_migrations(conn) {
        Error(e) -> {
          let _ = sqlight.close(conn)
          Error(e)
        }
        Ok(Nil) -> Ok(conn)
      }
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
