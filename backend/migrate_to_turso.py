#!/usr/bin/env python3
"""Copy a local SQLite database into Turso.

Run once, to move existing data across. After that the backend talks to Turso on
its own and this script is not needed.

    python3 migrate_to_turso.py [database]        # defaults to icps.db

Credentials come from .env next to this file, or from DATABASE_URL and
DATABASE_TOKEN in the environment.

The old `fingerprints` table is not copied. It holds one row per raw reading from
before the move to per-network statistics, nothing writes to it any more, and
everything in it is already in room_aps.
"""

import json
import os
import sqlite3
import sys
import time
import urllib.request

# Tables to copy, with the columns the backend expects. `int` columns become
# integers, `float` columns become floats, and anything else becomes text.
TABLES = [
    (
        "nodes",
        ["node_id", "name", "floor", "x", "y", "created_at"],
        {"floor": int, "x": int, "y": int, "created_at": int},
    ),
    (
        "edges",
        ["from_node", "to_node", "steps", "direction", "created_at"],
        {"steps": int, "created_at": int},
    ),
    (
        "room_aps",
        ["node_id", "bssid", "rssi_mean", "rssi_m2", "n", "first_seen", "last_seen"],
        {
            "rssi_mean": float,
            "rssi_m2": float,
            "n": int,
            "first_seen": int,
            "last_seen": int,
        },
    ),
    ("users", ["user_id", "email", "created_at", "last_login"],
     {"created_at": int, "last_login": int}),
    ("sessions", ["session_id", "user_id", "created_at", "expires_at"],
     {"created_at": int, "expires_at": int}),
]


def read_credentials():
    """The Turso URL and token, from the environment or .env."""
    url = os.environ.get("DATABASE_URL")
    token = os.environ.get("DATABASE_TOKEN")

    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if (not url or not token) and os.path.exists(env_path):
        with open(env_path) as handle:
            for line in handle:
                key, _, value = line.strip().partition("=")
                if key == "DATABASE_URL" and not url:
                    url = value
                elif key == "DATABASE_TOKEN" and not token:
                    token = value

    if not url or not token:
        sys.exit("Error: DATABASE_URL and DATABASE_TOKEN must both be set")
    return to_https(url), token


def to_https(url):
    """Turn a Turso URL into the pipeline endpoint."""
    for prefix in ("libsql://", "libsql:"):
        if url.startswith(prefix):
            url = "https://" + url[len(prefix):]
            break
    else:
        url = url.replace("libsql:", "https://")

    url = url.rstrip("/")
    if "/v2/" not in url:
        url += "/v2/pipeline"
    return url


def send(api, token, sql, args):
    """Run one statement, retrying a few times. Returns the decoded rows."""
    body = json.dumps({
        "requests": [
            {"type": "execute", "stmt": {"sql": sql, "args": args}},
            {"type": "close"},
        ]
    }).encode()

    request = urllib.request.Request(
        api,
        data=body,
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
        },
    )

    # One row per request over HTTPS, and the connection sometimes drops
    # mid-copy. Retrying is safe: every statement here is INSERT OR REPLACE.
    last_error = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read())
            break
        except Exception as error:  # noqa: BLE001 — retried below
            last_error = error
            time.sleep(1 + attempt)
    else:
        sys.exit(f"Error: giving up after 5 attempts: {last_error}")

    result = payload["results"][0]
    if "error" in result:
        sys.exit("Error from Turso: " + json.dumps(result["error"]))
    return result.get("response", {}).get("result", {}).get("rows", [])


def to_args(row, columns, kinds):
    """Turn a Python row into the typed argument list the API expects."""
    args = []
    for column, value in zip(columns, row):
        if value is None:
            args.append({"type": "null", "value": ""})
        elif column in kinds and kinds[column] is int:
            args.append({"type": "integer", "value": str(int(value))})
        elif column in kinds and kinds[column] is float:
            args.append({"type": "float", "value": float(value)})
        else:
            args.append({"type": "text", "value": str(value)})
    return args


def table_exists(connection, name):
    row = connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    ).fetchone()
    return row is not None


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "icps.db"
    if not os.path.exists(path):
        sys.exit(f"Error: {path} not found")

    api, token = read_credentials()
    connection = sqlite3.connect(path)

    print(f"Source: {path}")
    print(f"Target: {api}\n")

    for table, columns, kinds in TABLES:
        if not table_exists(connection, table):
            print(f"  {table:<9} no such table, skipped")
            continue

        rows = connection.execute(
            "SELECT " + ", ".join(columns) + " FROM " + table
        ).fetchall()

        if not rows:
            print(f"  {table:<9} nothing to copy")
            continue

        placeholders = ",".join("?" for _ in columns)
        statement = (
            f"INSERT OR REPLACE INTO {table} ({','.join(columns)}) "
            f"VALUES ({placeholders})"
        )

        for row in rows:
            send(api, token, statement, to_args(row, columns, kinds))

        print(f"  {table:<9} {len(rows)} rows")

    print("\nVerifying...")
    for table, _, _ in TABLES:
        try:
            rows = send(api, token, f"SELECT COUNT(*) FROM {table};", [])
            print(f"  {table:<9} {rows[0][0]['value']} rows in Turso")
        except Exception:
            print(f"  {table:<9} could not read back")

    print(
        "\nDone. The backend uses Turso whenever DATABASE_URL and DATABASE_TOKEN "
        "are set;\nremove them to go back to the local file."
    )


if __name__ == "__main__":
    main()