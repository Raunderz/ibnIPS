import db_query
import env
import gleam/dynamic/decode
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

  // room_aps table: what each room has seen for each Wi-Fi network.
  //
  // One row per (room, network), holding running statistics rather than one
  // row per reading. Tagging a room again updates its row instead of adding
  // more, so a room walked a hundred times still occupies a hundred rows —
  // one per distinct network — instead of ten thousand.
  //
  // rssi_mean / rssi_m2 / n are the running summary described in stats.gleam:
  // average signal, sum of squared differences from that average, and how many
  // readings went in. last_seen is when the network was last heard in this
  // room, so networks that have since been switched off can be aged out.
  let room_aps_sql =
    "
CREATE TABLE IF NOT EXISTS room_aps(
  node_id TEXT NOT NULL,
  bssid TEXT NOT NULL,
  rssi_mean REAL NOT NULL DEFAULT 0,
  rssi_m2 REAL NOT NULL DEFAULT 0,
  n INTEGER NOT NULL DEFAULT 0,
  first_seen INTEGER DEFAULT (unixepoch()),
  last_seen INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY(node_id,bssid),
  FOREIGN KEY(node_id) REFERENCES nodes(node_id) ON DELETE CASCADE
);
"

  // Indexes for faster lookups. room_aps is keyed on (node_id, bssid), so the
  // primary key already covers lookups by node_id.
  let indexes_sql =
    "
  CREATE INDEX IF NOT EXISTS idx_room_aps_bssid ON room_aps(bssid);
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
  use _ <- result.try(sqlight.exec(edges_sql, conn))
  use _ <- result.try(sqlight.exec(room_aps_sql, conn))
  use _ <- result.try(sqlight.exec(indexes_sql, conn))
  use _ <- result.try(sqlight.exec(users_sql, conn))
  use _ <- result.try(sqlight.exec(sessions_sql, conn))

  // Fold any readings recorded by an older version of the app into room_aps.
  use _ <- result.try(migrate_fingerprints(conn))

  Ok(Nil)
}

/// Copy readings out of the old `fingerprints` table into `room_aps`.
///
/// Only runs if `fingerprints` exists — a fresh database never had one. The
/// `WHERE` clause keeps it from touching rows it already copied, so it is safe
/// to run on every boot.
///
/// The old table is left in place rather than dropped. It is small once the
/// data has been copied, and leaving it means a rollback does not lose data.
fn migrate_fingerprints(
  conn: sqlight.Connection,
) -> Result(Nil, sqlight.Error) {
  let sql =
    "
  INSERT OR REPLACE INTO room_aps
    (node_id, bssid, rssi_mean, rssi_m2, n, first_seen, last_seen)
  SELECT
    node_id,
    -- Lower-cased because BSSIDs were not normalised before, so one network
    -- can be stored as AA:BB:.. or aa:bb:... Grouping on the raw value would
    -- split a single network into two half-sized rows.
    LOWER(bssid),
    AVG(rssi),
    -- The average squared reading, minus the square of the average reading.
    -- That difference is the variance, so multiplying by the count gives the
    -- sum of squared differences that `rssi_m2` holds.
    (AVG(rssi * rssi) - (AVG(rssi) * AVG(rssi))) * COUNT(*),
    COUNT(*),
    MIN(last_updated),
    MAX(last_updated)
  FROM fingerprints
  WHERE NOT EXISTS (
    SELECT 1 FROM room_aps
    WHERE LOWER(room_aps.node_id) = LOWER(fingerprints.node_id)
      AND room_aps.bssid = LOWER(fingerprints.bssid)
  )
  GROUP BY node_id, LOWER(bssid)
  "
  case has_table(conn, "fingerprints") {
    True -> sqlight.exec(sql, conn)
    False -> Ok(Nil)
  }
}

/// Whether a table with this name exists in the database.
fn has_table(conn: sqlight.Connection, name: String) -> Bool {
  let sql =
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
  let decoder = {
    use name <- decode.field("name", decode.string)
    decode.success(name)
  }
  case
    db_query.query_as_maps(
      sql,
      on: conn,
      with: [sqlight.text(name)],
      expecting: decoder,
    )
  {
    // No rows means no such table. Matching `Ok(_)` here would read an empty
    // result — which is exactly what a missing table looks like — as "yes it
    // exists", and then the migration would fail on a fresh database.
    Ok(rows) ->
      case rows {
        [] -> False
        _ -> True
      }
    Error(_) -> False
  }
}
