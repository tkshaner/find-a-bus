#!/usr/bin/env python3
"""
Convert GTFS route, trip, and stop_times data to JSON format
showing which stops belong to each route in sequence.
"""

import csv
import json
from collections import defaultdict

def load_routes():
    """Load route metadata."""
    routes = {}
    with open('gtfs/routes.txt', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            routes[row['route_id']] = {
                'route_short_name': row['route_short_name'],
                'route_long_name': row['route_long_name']
            }
    return routes

def load_stops():
    """Load stop locations."""
    stops = {}
    with open('gtfs/stops.txt', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            stops[row['stop_id']] = {
                'id': row['stop_id'],
                'code': row.get('stop_code', ''),
                'name': row['stop_name'],
                'lat': float(row['stop_lat']),
                'lon': float(row['stop_lon'])
            }
    return stops

def load_trips():
    """Map trip_id to route_id and shape_id."""
    trips = {}
    with open('gtfs/trips.txt', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            trips[row['trip_id']] = {
                'route_id': row['route_id'],
                'shape_id': row['shape_id'],
                'headsign': row.get('trip_headsign', '')
            }
    return trips

def load_route_stops(trips, stops):
    """
    Load stop sequences for each route.
    Returns: {route_id: {shape_id: [(stop_id, stop_sequence, stop_data), ...]}}
    """
    route_stops = defaultdict(lambda: defaultdict(set))

    print("Loading stop_times.txt (this may take a moment)...")
    with open('gtfs/stop_times.txt', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i % 100000 == 0:
                print(f"  Processed {i:,} stop times...")

            trip_id = row['trip_id']
            if trip_id not in trips:
                continue

            trip = trips[trip_id]
            route_id = trip['route_id']
            shape_id = trip['shape_id']
            stop_id = row['stop_id']
            stop_sequence = int(row['stop_sequence'])

            if stop_id in stops:
                route_stops[route_id][shape_id].add((stop_id, stop_sequence))

    print(f"  Total stop times processed: {i+1:,}")

    # Convert sets to sorted lists with stop data
    result = {}
    for route_id, shapes in route_stops.items():
        result[route_id] = {}
        for shape_id, stop_set in shapes.items():
            # Sort by stop_sequence
            sorted_stops = sorted(stop_set, key=lambda x: x[1])
            # Add stop data and remove duplicates (keep first occurrence)
            seen_stops = set()
            unique_stops = []
            for stop_id, seq in sorted_stops:
                if stop_id not in seen_stops:
                    seen_stops.add(stop_id)
                    stop_data = stops[stop_id].copy()
                    stop_data['sequence'] = seq
                    unique_stops.append(stop_data)

            result[route_id][shape_id] = unique_stops

    return result

def main():
    print("Loading GTFS data...")
    routes = load_routes()
    stops = load_stops()
    trips = load_trips()

    print(f"Loaded {len(routes)} routes, {len(stops)} stops, {len(trips)} trips")

    route_stops = load_route_stops(trips, stops)

    print(f"\nFound stops for {len(route_stops)} routes")

    # Add route metadata
    output = {}
    for route_id, shapes in route_stops.items():
        if route_id in routes:
            output[route_id] = {
                'name': routes[route_id]['route_short_name'],
                'long_name': routes[route_id]['route_long_name'],
                'shapes': shapes
            }

    # Write to JSON
    output_file = 'route-stops.json'
    print(f"\nWriting to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, separators=(',', ':'))

    # Print stats
    import os
    file_size = os.path.getsize(output_file)
    print(f"Created {output_file} ({file_size:,} bytes = {file_size/1024:.1f} KB)")

    # Sample output
    sample_route = list(output.keys())[0]
    sample_shape = list(output[sample_route]['shapes'].keys())[0]
    sample_stops = output[sample_route]['shapes'][sample_shape][:3]
    print(f"\nSample (Route {output[sample_route]['name']}, first 3 stops):")
    for stop in sample_stops:
        print(f"  {stop['sequence']}: {stop['name']} ({stop['lat']}, {stop['lon']})")

if __name__ == '__main__':
    main()
