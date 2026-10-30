#!/usr/bin/env python3
"""Build icps_edged.db: rooms + corridor waypoints + stairs + edges.

Takes the positioned database (rooms already have floor/x/y) and adds a
walkable mesh that follows the Block A & B plan:

  * a main east-west corridor,
  * vertical corridor spurs down each hall,
  * one stairwell node per floor per shaft (Stair1-0, Stair1-1, ...),
  * room -> nearest corridor, corridor -> corridor, stair -> corridor,
  * stair{well} on floor N <-> floor N+1 (steps fixed at 20, direction "").

Every floor is shifted into its own quadrant, so the same base coordinates
are reused per floor with a per-floor delta.

Usage:
    python3 build_edges.py [source.db] [output.db]
"""

import math
import shutil
import sqlite3
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "icps(3).db"
OUT = sys.argv[2] if len(sys.argv) > 2 else "icps_edged.db"

# Quadrant offsets used by build_map.py; delta[floor] = offset - offset[0].
OFFSETS = {0: (-1800, -1800), 1: (1800, -1800), 2: (-1800, 1800), 3: (1800, 1800)}
DELTA = {f: (OFFSETS[f][0] - OFFSETS[0][0], OFFSETS[f][1] - OFFSETS[0][1])
         for f in OFFSETS}

COMPASS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]
STEP_SCALE = 8
STAIR_STEPS = 20

# --- Base plan, floor 0 ------------------------------------------------------
MAIN_Y = -1800
HORIZONTAL_X = [-3060, -2820, -2580, -2340, -2040, -1800,
                -1620, -1380, -1140, -900, -660, -540]

# (x, [y...], x_of_horizontal_node_to_join) — the y=-1800 point is always
# part of the chain; when x is a horizontal node it is shared, otherwise a
# short edge joins it to the given horizontal x.
VERTICALS = [
    (-2940, [-2160, -1920, -1800, -1620], -2820),
    (-2520, [-2160, -1980, -1800, -1560], -2580),
    (-2340, [-2040, -1560], None),          # x is already a horizontal node
    (-2040, [-2100, -1500, -1260], None),   # central spine, shares h node
    (-1500, [-2040, -1800, -1560, -1320], -1620),
    (-1080, [-1920, -1800, -1560, -1320], -1140),
    (-720,  [-1920, -1800, -1560, -1320], -660),
]

# Stairwells: (well, base_x, base_y, join_x, join_y)
STAIRS = [
    (1, -2940, -2220, -2940, -2160),
    (2, -2700, -1920, -2580, -1800),
    (3, -2040, -2160, -2040, -2100),
    (4, -720,  -1980, -720,  -1920),
    (5, -960,  -1320, -1080, -1320),
]


def compass(dx, dy):
    deg = math.degrees(math.atan2(dy, dx))
    if deg < 0:
        deg += 360
    return COMPASS[round(deg / 45) % 8]


def steps(dx, dy):
    return max(1, round(math.hypot(dx, dy) / STEP_SCALE))


def corridor_points():
    pts = {(x, MAIN_Y) for x in HORIZONTAL_X}
    for x, ys, _ in VERTICALS:
        for y in ys:
            pts.add((x, y))
        pts.add((x, MAIN_Y))
    return pts


def main():
    shutil.copyfile(SRC, OUT)
    con = sqlite3.connect(OUT)
    cur = con.cursor()

    # Idempotent: drop the mesh we own, keep rooms/fingerprints.
    cur.execute("DELETE FROM edges")
    cur.execute("DELETE FROM nodes WHERE node_id LIKE 'corridor%' "
                "OR node_id LIKE 'stair%'")

    pts = sorted(corridor_points(), key=lambda p: (p[1], p[0]))
    corr_id = {}
    for i, (bx, by) in enumerate(pts, start=1):
        for fl, (dx, dy) in DELTA.items():
            nid = f"corridor{i}_f{fl}"
            cur.execute(
                "INSERT INTO nodes (node_id, name, floor, x, y) VALUES (?,?,?,?,?)",
                (nid, f"Corridor {i}", fl, bx + dx, by + dy),
            )
            corr_id[(fl, bx, by)] = nid

    stair_id = {}
    for well, bx, by, _, _ in STAIRS:
        for fl, (dx, dy) in DELTA.items():
            nid = f"stair{well}_f{fl}"
            cur.execute(
                "INSERT INTO nodes (node_id, name, floor, x, y) VALUES (?,?,?,?,?)",
                (nid, f"Stair{well}-{fl + 1}", fl, bx + dx, by + dy),
            )
            stair_id[(well, fl)] = (nid, bx + dx, by + dy)

    edges = {}

    def link(a, b, direction=None, st=None):
        key = tuple(sorted((a, b)))
        if a == b or key in edges:
            return
        if direction is None:
            ax, ay = coord[a]
            bx2, by2 = coord[b]
            direction = compass(bx2 - ax, by2 - ay)
            st = steps(bx2 - ax, by2 - ay)
        edges[key] = (a, b, st, direction)

    # coordinate lookup for every node we just inserted
    coord = {}
    for (fl, bx, by), nid in corr_id.items():
        coord[nid] = (bx + DELTA[fl][0], by + DELTA[fl][1])
    for (well, fl), (nid, x, y) in stair_id.items():
        coord[nid] = (x, y)

    for fl, (dx, dy) in DELTA.items():
        h = [corr_id[(fl, x, MAIN_Y)] for x in HORIZONTAL_X]
        for a, b in zip(h, h[1:]):
            link(a, b)

        for x, ys, join_x in VERTICALS:
            chain = sorted(set(ys + [MAIN_Y]))
            ids = [corr_id[(fl, x, y)] for y in chain]
            for a, b in zip(ids, ids[1:]):
                link(a, b)
            if join_x is not None:
                link(corr_id[(fl, x, MAIN_Y)], corr_id[(fl, join_x, MAIN_Y)])

        # rooms (and washroom/server) -> nearest corridor node on this floor
        rooms = cur.execute(
            "SELECT node_id, name, x, y FROM nodes WHERE floor=? "
            "AND node_id NOT LIKE 'corridor%' AND node_id NOT LIKE 'stair%'",
            (fl,),
        ).fetchall()
        corr_on_floor = [(nid, *coord[nid]) for (f2, _, _), nid in corr_id.items()
                         if f2 == fl]
        for rid, name, rx, ry in rooms:
            coord[rid] = (rx, ry)
            best = min(corr_on_floor, key=lambda c: (c[1] - rx) ** 2 + (c[2] - ry) ** 2)
            link(rid, best[0])

        # stairs -> nearest corridor node
        for well, _, _, _, _ in STAIRS:
            sid, sx, sy = stair_id[(well, fl)]
            best = min(corr_on_floor, key=lambda c: (c[1] - sx) ** 2 + (c[2] - sy) ** 2)
            link(sid, best[0])

    # stair shafts: same well, adjacent floors
    for well, _, _, _, _ in STAIRS:
        for fl in range(3):
            a = stair_id[(well, fl)][0]
            b = stair_id[(well, fl + 1)][0]
            key = tuple(sorted((a, b)))
            edges[key] = (a, b, STAIR_STEPS, "")

    for a, b, st, direction in edges.values():
        cur.execute(
            "INSERT INTO edges (from_node, to_node, steps, direction) VALUES (?,?,?,?)",
            (a, b, st, direction),
        )

    con.commit()

    n = cur.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
    e = cur.execute("SELECT COUNT(*) FROM edges").fetchone()[0]
    print(f"Wrote {OUT}: {n} nodes, {e} edges")
    floors = cur.execute(
        "SELECT floor, COUNT(*), "
        "SUM(node_id LIKE 'corridor%'), SUM(node_id LIKE 'stair%') "
        "FROM nodes GROUP BY floor ORDER BY floor"
    ).fetchall()
    for fl, cnt, c, s in floors:
        print(f"  floor {fl}: {cnt} nodes ({c} corridor, {s} stair)")
    con.close()


if __name__ == "__main__":
    main()
