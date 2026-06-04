#!/usr/bin/env python3
"""
Convert GTFS stops.txt to the compact JSON format used by the stops map.
"""

import csv
import json
import os


def main():
    stops = []

    with open("gtfs/stops.txt", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            stops.append({
                "id": row["stop_id"],
                "code": row.get("stop_code", ""),
                "name": row["stop_name"],
                "lat": float(row["stop_lat"]),
                "lon": float(row["stop_lon"]),
            })

    output_file = "stops.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(stops, f, separators=(",", ":"))

    file_size = os.path.getsize(output_file)
    print(f"Created {output_file} with {len(stops):,} stops ({file_size:,} bytes)")


if __name__ == "__main__":
    main()
