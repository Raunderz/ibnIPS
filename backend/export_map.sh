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
# Usage: ./export_map.sh [database] [output]

set -e

DB="${1:-icps.db}"
OUT="${2:-map.json}"

if [ ! -f "$DB" ]; then
  echo "Error: $DB not found"
  exit 1
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

# Step 2: Nodes from the DB, with saved positions applied where we have them.
sqlite3 -json "$DB" \
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

# Step 3: Edges from the DB.
sqlite3 -json "$DB" \
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
sqlite3 -json "$DB" "
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

# Step 6: Report. A zero here means the DB had no readings — worth noticing.
NODE_COUNT=$(jq '.nodes | length' "$OUT")
EDGE_COUNT=$(jq '.edges | length' "$OUT")
FP_NODES=$(jq '.fingerprints | length' "$OUT")
FP_TOTAL=$(jq '[.fingerprints[] | length] | add // 0' "$OUT" 2>/dev/null || echo 0)

echo "Updated $OUT"
echo "  Nodes: $NODE_COUNT"
echo "  Edges: $EDGE_COUNT"
echo "  Fingerprints: $FP_TOTAL networks across $FP_NODES rooms"

if [ "$FP_TOTAL" -eq 0 ]; then
  echo
  echo "WARNING: no Wi-Fi readings were exported."
  echo "  Check that the database has rows in room_aps:"
  echo "    sqlite3 $DB 'SELECT COUNT(*) FROM room_aps;'"
fi