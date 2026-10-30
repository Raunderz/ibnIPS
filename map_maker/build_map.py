#!/usr/bin/env python3
"""Build map.json from an icps SQLite database.

Every floor shares the ground-floor plan (read off the Block A & B photo).
The floor number comes from the room name: A001 -> floor 0, A101 -> floor 1,
a201 -> floor 2, a301 -> floor 3.  Each floor is then shifted into its own
quadrant of the infinite grid so the floors never sit on top of each other.

    floor 0 = top-left      floor 1 = top-right
    floor 2 = bottom-left   floor 3 = bottom-right

Usage:
    python3 build_map.py [database] [output]
"""

import json
import re
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else "icps(3).db"
OUT = sys.argv[2] if len(sys.argv) > 2 else "map.json"

SPACING = 120
QUADRANT = 1800
ROOM_RE = re.compile(r"^([A-Za-z])(\d)(\d{2})$")

# (col, row) on the shared plan, read from the ground-floor image.
SLOTS = {
    "A01": (-7, -2), "A02": (-7, -3), "A03": (-5, -4), "A04": (-7, -4),
    "A05": (-7, -5), "A06": (-5, -6), "A07": (-4, -6), "A08": (-5, -5),
    "A09": (-3, -6), "A10": (-3, -5), "A11": (0, -5), "A12": (-3, -4),
    "A13": (0, -4), "A14": (-2, -1), "A15": (-2, 0), "A16": (-5, -1),
    "A17": (-5, -3), "A18": (-7, -1),
    "B01": (14, 2), "B02": (14, 1), "B03": (12, 0), "B04": (14, -1),
    "B05": (14, -2), "B06": (13, -3), "B07": (11, -3), "B08": (11, -2),
    "B09": (9, -3), "B10": (9, -2), "B11": (7, -5), "B12": (5, -5),
    "B13": (5, -4), "B14": (3, -5), "B15": (3, -4), "B16": (4, -2),
    "B17": (4, -1), "B18": (9, 0), "B19": (9, 1), "B20": (9, 2),
    "B21": (10, 1), "B22": (10, 2),
    "WASH": (-8, -7), "SERVER": (15, -7),
}

OFFSETS = {
    0: (-QUADRANT, -QUADRANT),
    1: (QUADRANT, -QUADRANT),
    2: (-QUADRANT, QUADRANT),
    3: (QUADRANT, QUADRANT),
}

# Centre the shared plan on the origin so every quadrant is the same shape.
_centers = [c for c, r in SLOTS.values()]
_rows = [r for c, r in SLOTS.values()]
CENTER_X = (min(_centers) + max(_centers)) / 2 * SPACING
CENTER_Y = (min(_rows) + max(_rows)) / 2 * SPACING


def parse_room(name):
    """Return (floor, slot) for a room name, or (None, None) if it is special."""
    m = ROOM_RE.match(name.strip())
    if m:
        return int(m.group(2)), m.group(1).upper() + m.group(3)
    low = name.lower()
    if "wash" in low:
        return 1, "WASH"
    if "server" in low:
        return 1, "SERVER"
    return None, None


def main():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row

    rows = con.execute(
        "SELECT node_id, name, floor, x, y FROM nodes ORDER BY name"
    ).fetchall()

    nodes = []
    unknown = []
    for i, r in enumerate(rows):
        # Already-positioned nodes (corridors, stairs, or a DB we have written
        # to before) keep the coordinates they carry.
        if r["x"] or r["y"]:
            floor = r["floor"] if r["floor"] is not None else 1
            x, y = int(r["x"]), int(r["y"])
        else:
            floor, slot = parse_room(r["name"])
            if floor is None:
                floor = r["floor"] if r["floor"] is not None else 1
            if slot is None:
                unknown.append(r["name"])
                slot = "A01"
            col, row = SLOTS[slot]
            ox, oy = OFFSETS.get(floor, (0, 0))
            x = round(col * SPACING - CENTER_X + ox)
            y = round(row * SPACING - CENTER_Y + oy)
        nodes.append({
            "node_id": r["node_id"],
            "name": r["name"],
            "floor": floor,
            "x": x,
            "y": y,
        })

    edges = [
        {
            "from_node": e["from_node"],
            "to_node": e["to_node"],
            "steps": e["steps"],
            "direction": e["direction"],
        }
        for e in con.execute(
            "SELECT from_node, to_node, steps, direction FROM edges ORDER BY from_node"
        )
    ]

    fingerprints = {}
    for f in con.execute(
        "SELECT node_id, bssid, ssid, rssi FROM fingerprints ORDER BY node_id, bssid"
    ):
        fingerprints.setdefault(f["node_id"], []).append({
            "bssid": f["bssid"],
            "ssid": f["ssid"] or "",
            "rssi": int(f["rssi"]),
        })

    con.close()

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(
            {"nodes": nodes, "edges": edges, "fingerprints": fingerprints},
            fh,
            indent=2,
            ensure_ascii=False,
        )
        fh.write("\n")

    by_floor = {}
    for n in nodes:
        by_floor.setdefault(n["floor"], []).append(n)
    print(f"Wrote {OUT}: {len(nodes)} nodes, {len(edges)} edges, "
          f"{len(fingerprints)} rooms with fingerprints")
    for fl in sorted(by_floor):
        xs = [n["x"] for n in by_floor[fl]]
        ys = [n["y"] for n in by_floor[fl]]
        print(f"  floor {fl}: {len(by_floor[fl]):2d} nodes  "
              f"x[{min(xs)}..{max(xs)}] y[{min(ys)}..{max(ys)}]")
    if unknown:
        print("WARNING: no slot for:", ", ".join(unknown), "(placed at A01)")


if __name__ == "__main__":
    main()
