#!/bin/bash
# export_map.sh — Merge DB data into existing map.json
#
# - Existing nodes keep their x,y positions from map.json
# - New nodes from DB get x=0, y=0
# - Edges merged (deduplicated)
# - Fingerprints replaced from DB
#
# Usage: ./export_map.sh [database] [output]

set -e

DB="${1:-icps.db}"
OUT="${2:-map.json}"

if [ ! -f "$DB" ]; then
  echo "Error: $DB not found"
  exit 1
fi

if [ ! -f "$OUT" ]; then
  echo '{"nodes":[],"edges":[],"fingerprints":{}}' > "$OUT"
fi

# Step 1: Extract existing x,y positions from map.json
POSITIONS=$(jq -r '.nodes[] | "\(.node_id)\t\(.x)\t\(.y)"' "$OUT" 2>/dev/null || true)

# Step 2: Build nodes from DB, applying saved positions
DB_NODES=$(sqlite3 -json "$DB" "SELECT node_id, name, floor, x, y FROM nodes ORDER BY name;")

MERGED_NODES=$(echo "$DB_NODES" | jq --arg positions "$POSITIONS" '
  # Parse saved positions into a lookup
  ($positions | split("\n") | map(select(length > 0) | split("\t")) |
   map({(.[0]): {x: (.[1] | tonumber), y: (.[2] | tonumber)}}) | add // {}) as $pos |
  [
    .[] |
    if $pos[.node_id] then
      {node_id: .node_id, name: .name, floor: .floor, x: $pos[.node_id].x, y: $pos[.node_id].y}
    else
      {node_id: .node_id, name: .name, floor: .floor, x: .x, y: .y}
    end
  ]
')

# Step 3: Get edges from DB
DB_EDGES=$(sqlite3 -json "$DB" "SELECT from_node, to_node, steps, direction FROM edges;")

# Step 4: Get fingerprints grouped by node_id
FPS_GROUPED=$(sqlite3 -json "$DB" "
  SELECT node_id, bssid, ssid, rssi
  FROM fingerprints
  ORDER BY node_id
" | jq -r '
  group_by(.node_id) |
  map({key: .[0].node_id, value: [.[] | {bssid, ssid, rssi}]}) |
  from_entries
')

# Step 5: Build final JSON
jq -n \
  --argjson nodes "$MERGED_NODES" \
  --argjson edges "$DB_EDGES" \
  --argjson fps "$FPS_GROUPED" \
  '{nodes: $nodes, edges: $edges, fingerprints: $fps}' > "$OUT"

NODE_COUNT=$(jq '.nodes | length' "$OUT")
EDGE_COUNT=$(jq '.edges | length' "$OUT")
FP_NODES=$(jq '.fingerprints | length' "$OUT")
FP_TOTAL=$(jq '[.fingerprints[] | length] | add // 0' "$OUT")

echo "Updated $OUT"
echo "  Nodes: $NODE_COUNT"
echo "  Edges: $EDGE_COUNT"
echo "  Fingerprints: $FP_TOTAL entries across $FP_NODES nodes"
