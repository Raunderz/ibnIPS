#!/bin/bash
# export_map.sh — Merge DB data into existing map.json
#
# - Existing nodes keep their x,y positions from map.json
# - New nodes from DB get x=0, y=0
# - Edges replaced from DB
# - Fingerprints replaced from DB
#
# Reads the `room_aps` table, which is where Wi-Fi readings live and where
# every new reading lands. It is already one row per (room, network), so there
# is no grouping to do here.
#
# Usage:
#   ./export_map.sh                      local icps.db -> map.json
#   ./export_map.sh <database> [output]  explicit local database
#   ./export_map.sh --turso [output]     read from Turso instead of a local file
#
# The backend writes to Turso whenever DATABASE_URL and DATABASE_TOKEN are set,
# and the sqlite3 command line cannot open a remote database. Use --turso in
# that case; turso_query.py does the same SELECT over HTTPS and prints the same
# JSON shape.

set -e

SOURCE="local"
DB="icps.db"
OUT="map.json"

case "${1:-}" in
  --turso) SOURCE="turso"; OUT="${2:-map.json}" ;;
  "")     SOURCE="local"; DB="icps.db"; OUT="map.json" ;;
  *)      SOURCE="local"; DB="$1";     OUT="${2:-map.json}" ;;
esac

query() {
  if [ "$SOURCE" = "turso" ]; then
    python3 turso_query.py "$1"
  else
    sqlite3 -json "$DB" "$1"
  fi
}

if [ "$SOURCE" = "turso" ]; then
  command -v python3 > /dev/null || { echo "Error: python3 is required for --turso"; exit 1; }
else
  if [ ! -f "$DB" ]; then
    echo "Error: $DB not found"
    echo "Hint: the backend uses Turso when DATABASE_URL and DATABASE_TOKEN are set."
    echo "      Use --turso in that case."
    exit 1
  fi
  # A database from before the per-network statistics change has a `fingerprints`
  # table and no `room_aps`. Starting the backend once migrates it; without that,
  # the query below fails with a bare sqlite error that explains nothing.
  if ! sqlite3 "$DB" "SELECT 1 FROM sqlite_master WHERE type='table' AND name='room_aps';" | grep -q 1; then
    echo "Error: $DB has no room_aps table, so there are no readings to export."
    echo "Hint: run the backend once against it to migrate, or point at Turso with --turso."
    exit 1
  fi
fi

if ! command -v jq > /dev/null; then
  echo "Error: jq is required"
  exit 1
fi

if [ ! -f "$OUT" ]; then
  echo '{"nodes":[],"edges":[],"fingerprints":{}}' > "$OUT"
fi

# Intermediate files, so large results never hit the shell's argument limit.
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Step 1: Existing x,y positions, so hand-placed rooms keep them.
jq -r '.nodes[]? | "\(.node_id)\t\(.x)\t\(.y)"' "$OUT" > "$WORK/positions.tsv" 2>/dev/null || true

# The room ids the current map.json knows about, captured before it is
# overwritten, so the report at the end can say what the export dropped.
jq -r '.nodes[]?.node_id' "$OUT" 2>/dev/null | sort > "$WORK/previous_ids.txt" || true

# Step 2: Nodes from the database, with saved positions applied where we have them.
query \
  "SELECT node_id, name, floor, x, y FROM nodes ORDER BY name;" \
  > "$WORK/db_nodes.json"

jq --rawfile positions "$WORK/positions.tsv" '
  # Turn the tab-separated list into a lookup keyed by node_id.
  ($positions | split("\n") | map(select(length > 0) | split("\t")) |
   map({(.[0]): {x: (.[1] | tonumber), y: (.[2] | tonumber)}}) | add // {}) as $pos |
  [
    .[] |
    if $pos[.node_id] then
      {node_id: .node_id, name: .name, floor: .floor,
       x: $pos[.node_id].x, y: $pos[.node_id].y}
    else
      {node_id: .node_id, name: .name, floor: .floor, x: .x, y: .y}
    end
  ]
' "$WORK/db_nodes.json" > "$WORK/nodes.json"

# Step 3: Edges from the database.
query \
  "SELECT from_node, to_node, steps, direction FROM edges ORDER BY from_node;" \
  > "$WORK/edges.raw"

# sqlite3 -json prints nothing for an empty result, which jq would reject.
# Writing an empty array instead keeps the rest of the script uniform.
[ -s "$WORK/edges.raw" ] || echo '[]' > "$WORK/edges.raw"
mv "$WORK/edges.raw" "$WORK/edges.json"

# Step 4: Fingerprints, grouped by room.
#
# `room_aps` holds one row per (room, network) already, so this only has to
# reshape it into { node_id: [{bssid, ssid, rssi}] }.
#
# rssi is rounded to a whole dBm because that is what the app expects.
# `ssid` is emitted as an empty string: the network name is not used for
# matching (which keys on BSSID) and `room_aps` does not store it.
query "
  SELECT node_id, bssid, CAST(ROUND(rssi_mean) AS INTEGER) AS rssi
  FROM room_aps
  ORDER BY node_id, bssid
" > "$WORK/fp_rows.json"

# `// []` because sqlite3 -json prints nothing at all when a query returns no
# rows, which would otherwise reach group_by as null.
jq '
  (. // []) |
  group_by(.node_id) |
  map({key: .[0].node_id, value: [.[] | {bssid, ssid: "", rssi: (.rssi | floor)}]}) |
  from_entries
' "$WORK/fp_rows.json" > "$WORK/fingerprints.json"

# Step 5: Assemble the map.
#
# The existing file is copied into the work directory first: `> "$OUT"` below
# truncates the file the moment jq starts, so slurpping $OUT directly would
# read an empty document and silently drop any extra keys it held.
cp "$OUT" "$WORK/existing.json"

jq -n \
  --slurpfile nodes "$WORK/nodes.json" \
  --slurpfile edges "$WORK/edges.json" \
  --slurpfile fps "$WORK/fingerprints.json" \
  --slurpfile existing "$WORK/existing.json" \
  '{
    nodes: $nodes[0],
    edges: $edges[0],
    fingerprints: $fps[0]
  } + ($existing[0] // {} | del(.nodes, .edges, .fingerprints))' > "$WORK/out.json"

mv "$WORK/out.json" "$OUT"

# Step 6: Report. A zero here means the database had no readings — worth noticing.
NODE_COUNT=$(jq '.nodes | length' "$OUT")
EDGE_COUNT=$(jq '.edges | length' "$OUT")
FP_NODES=$(jq '.fingerprints | length' "$OUT")
FP_TOTAL=$(jq '[.fingerprints[] | length] | add // 0' "$OUT" 2>/dev/null || echo 0)

# Rooms that were in the old map.json but are not in the database. The node list
# is replaced wholesale, so these are gone from the output — including any
# coordinates that were placed by hand. Worth saying out loud, because a room
# that has only ever been placed and never tagged disappears without complaint.
jq -r '.[].node_id' "$WORK/nodes.json" | sort > "$WORK/db_ids.txt"
comm -23 "$WORK/previous_ids.txt" "$WORK/db_ids.txt" > "$WORK/dropped.txt" 2>/dev/null || true
DROPPED=$(wc -l < "$WORK/dropped.txt" | tr -d ' ')

echo "Updated $OUT (from $SOURCE)"
echo "  Nodes: $NODE_COUNT"
echo "  Edges: $EDGE_COUNT"
echo "  Fingerprints: $FP_TOTAL networks across $FP_NODES rooms"

if [ "$DROPPED" -gt 0 ]; then
  echo
  echo "WARNING: $DROPPED room(s) were in the old map.json but not in the database,"
  echo "so they have been dropped along with any coordinates placed for them:"
  head -10 "$WORK/dropped.txt" | sed 's/^/  /'
  [ "$DROPPED" -gt 10 ] && echo "  ... and $((DROPPED - 10)) more"
  echo
  echo "Re-tag them, or re-add them by hand, if they should stay on the map."
fi

if [ "$FP_TOTAL" -eq 0 ]; then
  echo
  echo "WARNING: no Wi-Fi readings were exported."
  echo "  Local database: check that room_aps has rows in $DB"
  echo "    sqlite3 $DB 'SELECT COUNT(*) FROM room_aps;'"
  echo "  Turso: check DATABASE_URL and DATABASE_TOKEN are set for --turso"
fi