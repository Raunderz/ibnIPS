import gleam/dynamic/decode
import gleam/erlang/atom
import sqlight

const db_path = "icps.db"

// migrations
pub fn init() -> Result(sqlight.Connection, sqlight.Error) {
  use conn <- sqlight.with_connection(db_path)
  // todo
  // creat tables if not existing
  let create_tags =
    "
  CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bssid TEXT NOT NULL,
ssid TEXT,
rssi INTEGER NOT NULL,
lat REAL NOT NULL,
lon REAL NOT NULL,
created_at INTEGER DEFAULT (unixepoch())
  );
  "
  let create_fingerprints =
    "
CREATE TABLE IF NOT EXISTS fingerprints (
id INTEGER PRIMARY KEY AUTOINCREMENT,
lat REAL NOT NULL,
lon REAL NOT NULL,
bssid TEXT NOT NULL,
ssid TEXT,
rssi INTEGER NOT NULL,
created_at INTEGER DEFAULT (unixepoch())
);
  "

  case sqlight.exec(create_tags, conn) {
    Error(e) -> {
      let _ = sqlight.close(conn)
      Error(e)
    }
    Ok(Nil) -> {
      case sqlight.exec(create_fingerprints, conn) {
        Error(e) -> {
          let _ = sqlight.close(conn)
          Error(e)
        }
        Ok(Nil) -> Ok(conn)
      }
    }
  }
}
