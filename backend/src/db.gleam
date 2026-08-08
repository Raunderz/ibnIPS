import gleam/result
import sqlight

const db_path = "icps.db"

pub fn init() -> Result(sqlight.Connection, sqlight.Error) {
  case sqlight.open("file:" <> db_path <> "?mode=rwc") {
    Error(e) -> Error(e)
    Ok(conn) -> {
      // run all create table cstatements
      // if any fails close connection and return error
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

fn run_migrations(conn: sqlight.Connection) -> Result(Nil, sqlight.Error) {
  //  todo
  // nodes table : rooms / locations
  // x and y default to 0 , i will set it at backend later
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
  // fingerprint table : wifi signals readings per node
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

  // edges table , connection betweee nodes
  // unique from node to node , prevcents duplicate edgs
  let edges_sql =
    "
CREATE TABLE IF NOT EXISTS edges (
edge_id INTEGER PRIMARY KEY AUTOINCREMENT,
from_node TEXT NOT NULL,
to_node TEXT NOT NULL,
steps INTEGER NOT NULL,
created_at INTEGER DEFAULT (unixepoch()),
FOREIGN KEY(from_node) REFERENCES nodes(node_id),
FOREIGN KEY(from_node) REFERENCES nodes(node_id),
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

  // Execute each statement in sequence.
  // The `use` syntax here is Gleam's way of early-returning on error.
  use _ <- result.try(sqlight.exec(nodes_sql, conn))
  use _ <- result.try(sqlight.exec(fingerprints_sql, conn))
  use _ <- result.try(sqlight.exec(edges_sql, conn))
  use _ <- result.try(sqlight.exec(indexes_sql, conn))

  Ok(Nil)
}
