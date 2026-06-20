#!/usr/bin/env python3
"""
Convert GTFS schedule data into per-route, per-stop planned timetables.

Where `convert_timetable.py` distills the schedule down to the departure time
at the *origin* of every trip (one small ``route-timetable.json``), this script
keeps the scheduled time at *every* stop along each trip so the website can show
"when does this route reach the stop I'm standing at".

A single combined file would be roughly 9-10 MB, so the output is split into one
file per route under ``schedules/routes/``. The route view already selects a
route before opening the Timetable tab, so the browser only ever fetches the one
file it needs, and the stop selector then filters within it client-side.

Output: schedules/routes/<route_short_name>.json, keyed nothing (each file is a
single route) to match the route key the website already uses.

Schema (one file per route):
{
  "id": "<route_id>",
  "name": "<route_short_name>",
  "long_name": "<route_long_name>",
  "services": {
    "Weekday": [
      {
        "headsign": "...",
        "direction_id": "0",
        "origin": "<first stop name>",
        "stops": [
          { "id": "4523", "code": "4523", "name": "...", "times": ["05:10", ...] },
          ...
        ]
      }
    ],
    "Saturday": [ ... ],
    "Sunday":   [ ... ],
    "Other":    [ ... ]
  }
}
"""

import csv
import json
import os
import sys
from collections import defaultdict

GTFS_DIR = 'gtfs'
OUTPUT_DIR = os.path.join('schedules', 'routes')

# csv field sizes in stop_times.txt are small, but raise the limit defensively.
csv.field_size_limit(min(sys.maxsize, 2**31 - 1))


def load_routes():
    """route_id -> {route_short_name, route_long_name}."""
    routes = {}
    with open(os.path.join(GTFS_DIR, 'routes.txt'), 'r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            routes[row['route_id']] = {
                'route_short_name': row['route_short_name'],
                'route_long_name': row['route_long_name'],
            }
    return routes


def load_stops():
    """stop_id -> {code, name} used to label each stop in the timetable."""
    stops = {}
    with open(os.path.join(GTFS_DIR, 'stops.txt'), 'r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            stops[row['stop_id']] = {
                'code': row.get('stop_code') or row['stop_id'],
                'name': row.get('stop_name', ''),
            }
    return stops


def load_service_categories():
    """
    service_id -> list of service-day categories.

    A service is classified by the weekdays it runs on in calendar.txt. A
    service that runs every day lands in all three buckets, which is fine for a
    timetable display.
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


def safe_filename(short_name):
    """Make a route short name safe to use as a filename component."""
    return ''.join(c if c.isalnum() or c in (' ', '-', '_') else '_'
                   for c in short_name).strip()


def main():
    print('Loading GTFS data...')
    routes = load_routes()
    stops = load_stops()
    categories = load_service_categories()
    trips = load_trips()
    print(f'Loaded {len(routes)} routes, {len(stops)} stops, {len(trips)} trips')

    # route_id -> category -> (direction_id, headsign) -> stop_id -> {seq, times}
    # `seq` is the smallest stop_sequence seen for that stop, used to order the
    # stop list; `times` collects every scheduled departure at that stop.
    def new_stop():
        return {'seq': None, 'times': []}

    schedule = defaultdict(lambda: defaultdict(lambda: defaultdict(
        lambda: defaultdict(new_stop))))

    print('Streaming stop_times.txt (this may take a moment)...')
    path = os.path.join(GTFS_DIR, 'stop_times.txt')
    with open(path, 'r', encoding='utf-8') as f:
        for i, row in enumerate(csv.DictReader(f)):
            if i % 200000 == 0:
                print(f'  Processed {i:,} stop times...')

            trip = trips.get(row['trip_id'])
            if trip is None:
                continue

            time = normalize_time(row.get('departure_time')
                                  or row.get('arrival_time') or '')
            if not time:
                continue

            try:
                seq = int(row['stop_sequence'])
            except (KeyError, ValueError):
                seq = 0
            stop_id = row['stop_id']
            key = (trip['direction_id'], trip['headsign'])

            for category in categories.get(trip['service_id'], ['Other']):
                rec = schedule[trip['route_id']][category][key][stop_id]
                if rec['seq'] is None or seq < rec['seq']:
                    rec['seq'] = seq
                rec['times'].append(time)

    # Build one output object per route.
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    file_count = 0
    total_bytes = 0
    largest = (0, '')
    skipped = []

    for route_id, by_category in schedule.items():
        route = routes.get(route_id)
        if not route:
            continue
        short_name = route['route_short_name']
        if not short_name.strip():
            skipped.append(route_id)
            continue

        services = {}
        for category, blocks in by_category.items():
            rendered = []
            for (direction_id, headsign), stop_map in blocks.items():
                ordered = sorted(stop_map.items(), key=lambda kv: kv[1]['seq'])
                stop_list = []
                for stop_id, rec in ordered:
                    meta = stops.get(stop_id, {'code': stop_id, 'name': ''})
                    stop_list.append({
                        'id': stop_id,
                        'code': meta['code'],
                        'name': meta['name'],
                        'times': sorted(set(rec['times']), key=time_sort_key),
                    })
                rendered.append({
                    'headsign': headsign,
                    'direction_id': direction_id,
                    'origin': stop_list[0]['name'] if stop_list else '',
                    'stops': stop_list,
                })
            # Stable display order: by direction then headsign.
            rendered.sort(key=lambda b: (b['direction_id'], b['headsign']))
            services[category] = rendered

        payload = {
            'id': route_id,
            'name': short_name,
            'long_name': route['route_long_name'],
            'services': services,
        }

        filename = safe_filename(short_name) + '.json'
        out_path = os.path.join(OUTPUT_DIR, filename)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, separators=(',', ':'))

        size = os.path.getsize(out_path)
        total_bytes += size
        file_count += 1
        if size > largest[0]:
            largest = (size, short_name)

    print(f'\nWrote {file_count} route files to {OUTPUT_DIR}/')
    print(f'Total: {total_bytes:,} bytes = {total_bytes / 1024 / 1024:.2f} MB')
    if file_count:
        print(f'Average: {total_bytes // file_count:,} bytes per route')
        print(f'Largest: Route {largest[1]} at {largest[0] / 1024:.1f} KB')
    if skipped:
        print(f'Skipped {len(skipped)} route(s) with empty short_name: {skipped}')


if __name__ == '__main__':
    main()
