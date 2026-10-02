#!/usr/bin/env python3
"""Run one SELECT against Turso and print the rows as JSON.

    python3 turso_query.py "SELECT node_id, name FROM nodes;"

Output matches `sqlite3 -json`, so export_map.sh can read from either a local
file or Turso without caring which one answered. That matters because the
backend writes to Turso whenever DATABASE_URL is set, and `sqlite3` cannot open
a remote database.

Reuses migrate_to_turso for credentials and the HTTP call, so there is only one
place that knows how to talk to Turso.

Read-only on purpose: this script exists so export and inspection can never
modify the database by accident. Use migrate_to_turso.py to write.
"""

import json
import sys

from migrate_to_turso import read_credentials, send


def to_records(result):
    """Turn one Turso result into `[{"column": value}, ...]`.

    Turso returns column names and values as two separate arrays, so each row is
    built by zipping them. Values arrive tagged with their type, with integers
    as JSON strings, so those are converted back to numbers here — otherwise
    jq would treat a floor of `2` as the string "2" and the map would break.
    """
    columns = [column["name"] for column in result.get("cols", [])]

    records = []
    for row in result.get("rows", []):
        record = {}
        for column, cell in zip(columns, row):
            value = cell.get("value")
            if cell.get("type") == "integer":
                value = int(value)
            elif cell.get("type") == "float":
                value = float(value)
            record[column] = value
        records.append(record)
    return records


def main():
    if len(sys.argv) < 2:
        sys.exit('Usage: python3 turso_query.py "SELECT ...;"')

    sql = sys.argv[1]
    if not sql.strip().upper().startswith("SELECT"):
        sys.exit("Error: this script only runs SELECT statements")

    api, token = read_credentials()
    print(json.dumps(to_records(send(api, token, sql, []))))


if __name__ == "__main__":
    main()