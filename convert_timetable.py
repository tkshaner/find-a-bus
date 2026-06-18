#!/usr/bin/env python3
"""
Convert GTFS schedule data into a compact planned timetable JSON.

The raw GTFS `stop_times.txt` is far too large (~70 MB) to ship to the
browser, so this script distills it down to the scheduled departure time at
the *origin* of every trip, grouped by route, service day (Weekday / Saturday
/ Sunday), and direction/headsign.

Output: route-timetable.json keyed by route_short_name to match the other
generated assets (route-stops.json, routes-shapes.json).

Schema:
{
  "<route_short_name>": {
    "id": "<route_id>",
    "name": "<route_short_name>",
    "long_name": "<route_long_name>",
    "services": {
      "Weekday":  [ { "headsign": "...", "origin": "...", "times": ["05:10", ...] } ],
      "Saturday": [ ... ],
      "Sunday":   [ ... ]
    }
  }
}
"""

import csv
import json
import os
from collections import defaultdict

GTFS_DIR = 'gtfs'
OUTPUT_FILE = 'route-timetable.json'


def load_routes():
    """route_id -> {short, long}."""
    routes = {}
    with open(os.path.join(GTFS_DIR, 'routes.txt'), 'r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            routes[row['route_id']] = {
                'route_short_name': row['route_short_name'],
                'route_long_name': row['route_long_name'],
            }
    return routes


def load_stops():
    """stop_id -> stop_name (used to label trip origins)."""
    stops = {}
    with open(os.path.join(GTFS_DIR, 'stops.txt'), 'r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            stops[row['stop_id']] = row['stop_name']
    return stops


def load_service_categories():
    """
    service_id -> list of service-day categories.

    A service is classified by the weekdays it runs on in calendar.txt. A
    service that runs every day lands in all three buckets, which is fine for
    a timetable display.
    """
    categories = {}
    with open(os.path.join(GTFS_DIR, 'calendar.txt'), 'r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            weekday = any(row[day] == '1' for day in
                          ('monday', 'tuesday', 'wednesday', 'thursday', 'friday'))
            cats = []
            if weekday:
                cats.append('Weekday')
            if row['saturday'] == '1':
                cats.append('Saturday')
            if row['sunday'] == '1':
                cats.append('Sunday')
            if not cats:
                cats = ['Other']
            categories[row['service_id']] = cats
    return categories


def load_trips():
    """trip_id -> {route_id, headsign, direction_id, service_id}."""
    trips = {}
    with open(os.path.join(GTFS_DIR, 'trips.txt'), 'r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            trips[row['trip_id']] = {
                'route_id': row['route_id'],
                'headsign': row.get('trip_headsign', ''),
                'direction_id': row.get('direction_id', ''),
                'service_id': row['service_id'],
            }
    return trips


def load_trip_origins():
    """
    trip_id -> (origin_stop_id, departure_time) for the earliest stop_sequence.

    Streams stop_times.txt so the full file is never held in memory.
    """
    best_seq = {}
    origins = {}

    print('Loading stop_times.txt (this may take a moment)...')
    with open(os.path.join(GTFS_DIR, 'stop_times.txt'), 'r', encoding='utf-8') as f:
        for i, row in enumerate(csv.DictReader(f)):
            if i % 200000 == 0:
                print(f'  Processed {i:,} stop times...')
            trip_id = row['trip_id']
            seq = int(row['stop_sequence'])
            if trip_id not in best_seq or seq < best_seq[trip_id]:
                best_seq[trip_id] = seq
                # Prefer departure_time, fall back to arrival_time.
                time = row.get('departure_time') or row.get('arrival_time') or ''
                origins[trip_id] = (row['stop_id'], time)
    return origins


def normalize_time(gtfs_time):
    """GTFS 'HH:MM:SS' (hour may be >= 24) -> 'HH:MM'."""
    parts = gtfs_time.split(':')
    if len(parts) < 2:
        return None
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        return None
    return f'{hour:02d}:{minute:02d}'


def time_sort_key(hhmm):
    hour, minute = hhmm.split(':')
    return int(hour) * 60 + int(minute)


def main():
    print('Loading GTFS data...')
    routes = load_routes()
    stops = load_stops()
    categories = load_service_categories()
    trips = load_trips()
    origins = load_trip_origins()

    print(f'Loaded {len(routes)} routes, {len(trips)} trips, '
          f'{len(origins)} trip origins')

    # route_id -> category -> (direction_id, headsign) -> {origin, times set}
    schedule = defaultdict(lambda: defaultdict(lambda: defaultdict(
        lambda: {'origin': '', 'times': set()})))

    for trip_id, trip in trips.items():
        if trip_id not in origins:
            continue
        origin_stop_id, raw_time = origins[trip_id]
        time = normalize_time(raw_time)
        if not time:
            continue

        for category in categories.get(trip['service_id'], ['Other']):
            key = (trip['direction_id'], trip['headsign'])
            block = schedule[trip['route_id']][category][key]
            block['origin'] = stops.get(origin_stop_id, '')
            block['times'].add(time)

    # Build the output keyed by route_short_name.
    output = {}
    for route_id, by_category in schedule.items():
        if route_id not in routes:
            continue
        short_name = routes[route_id]['route_short_name']
        services = {}
        for category, blocks in by_category.items():
            rendered = []
            for (direction_id, headsign), block in blocks.items():
                rendered.append({
                    'headsign': headsign,
                    'origin': block['origin'],
                    'times': sorted(block['times'], key=time_sort_key),
                })
            # Order direction 0 before 1 for a stable display.
            rendered.sort(key=lambda b: b['headsign'])
            services[category] = rendered
        output[short_name] = {
            'id': route_id,
            'name': short_name,
            'long_name': routes[route_id]['route_long_name'],
            'services': services,
        }

    print(f'\nWriting to {OUTPUT_FILE}...')
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, separators=(',', ':'))

    file_size = os.path.getsize(OUTPUT_FILE)
    print(f'Created {OUTPUT_FILE} ({file_size:,} bytes = {file_size / 1024:.1f} KB)')

    # Sample output.
    if output:
        sample = next(iter(output))
        services = output[sample]['services']
        print(f'\nSample (Route {sample}):')
        for category, blocks in services.items():
            if blocks:
                first = blocks[0]
                preview = ', '.join(first['times'][:6])
                print(f'  {category}: {first["headsign"]} — {preview} ...')


if __name__ == '__main__':
    main()
