#!/usr/bin/env python3
"""
Convert GTFS shapes.txt and routes.txt to JSON format for route visualization.
Uses route_short_name (user-facing route number) as the key.
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
                'route_long_name': row['route_long_name'],
                'route_color': row.get('route_color', '')
            }
    return routes

def load_trips():
    """Map route_id to shape_ids."""
    route_shapes = defaultdict(set)
    with open('gtfs/trips.txt', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            route_id = row['route_id']
            shape_id = row['shape_id']
            route_shapes[route_id].add(shape_id)
    return route_shapes

def load_shapes():
    """Load shape coordinates."""
    shapes = defaultdict(list)
    print("Loading shapes.txt...")
    with open('gtfs/shapes.txt', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i % 50000 == 0:
                print(f"  Processed {i:,} shape points...")
            shape_id = row['shape_id']
            lat = float(row['shape_pt_lat'])
            lon = float(row['shape_pt_lon'])
            seq = int(row['shape_pt_sequence'])
            shapes[shape_id].append((seq, [lat, lon]))

    # Sort by sequence and extract coordinates
    for shape_id in shapes:
        shapes[shape_id] = [coord for seq, coord in sorted(shapes[shape_id])]

    return shapes

def main():
    print("Loading GTFS data...")
    routes = load_routes()
    route_shapes_map = load_trips()
    shapes = load_shapes()

    print(f"\nLoaded {len(routes)} routes, {len(shapes)} shapes")

    # Build output structure - use route_short_name as key
    output = {}
    for route_id, shape_ids in route_shapes_map.items():
        if route_id not in routes:
            continue

        route_info = routes[route_id]
        route_short_name = route_info['route_short_name']

        # Collect shapes for this route
        route_shapes_data = {}
        for shape_id in shape_ids:
            if shape_id in shapes:
                # Simplify: keep every 3rd point to reduce file size
                coords = shapes[shape_id][::3]
                if coords:  # Only add if not empty
                    route_shapes_data[shape_id] = coords

        if route_shapes_data:
            output[route_short_name] = {
                'id': route_id,
                'name': route_short_name,
                'long_name': route_info['route_long_name'],
                'color': route_info['route_color'],
                'shapes': route_shapes_data
            }

    # Write to JSON
    output_file = 'routes-shapes.json'
    print(f"\nWriting to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, separators=(',', ':'))

    # Print stats
    import os
    file_size = os.path.getsize(output_file)
    print(f"Created {output_file} ({file_size:,} bytes = {file_size/1024:.1f} KB)")

    # Sample output
    if output:
        sample_route = list(output.keys())[0]
        sample_data = output[sample_route]
        print(f"\nSample (Route {sample_route}):")
        print(f"  ID: {sample_data['id']}")
        print(f"  Name: {sample_data['name']}")
        print(f"  Long name: {sample_data['long_name']}")
        print(f"  Shapes: {len(sample_data['shapes'])}")
        sample_shape = list(sample_data['shapes'].keys())[0]
        print(f"  First shape ({sample_shape}): {len(sample_data['shapes'][sample_shape])} points")

if __name__ == '__main__':
    main()
