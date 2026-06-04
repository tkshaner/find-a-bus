# GTFS Data Analysis for Find A Bus

## Current Feed Snapshot

The latest static GTFS feed was downloaded from:

`https://www.thebus.org/transitdata/production/google_transit.zip`

Local project location:

`gtfs/`

Feed metadata from `gtfs/feed_info.txt`:

- Publisher: TheBus
- Version: `(2605_v5_BusRail_MERGED_Landlines)`
- Valid: May 20, 2026 through August 22, 2026
- Downloaded: June 3, 2026
- Agencies: TheBus and Skyline / DTS

The raw `gtfs/` folder is ignored by git because the extracted feed is about 96 MB. The website should continue to serve compact generated JSON assets instead of the raw GTFS text files.

## File Breakdown

| File | Size | Records | Website Value |
| --- | ---: | ---: | --- |
| `agency.txt` | 279 B | 2 | Low: agency labels and URLs |
| `routes.txt` | 5.2 KB | 118 | High: route names, route IDs, route type, colors |
| `stops.txt` | 407 KB | 3,831 | High: map markers, stop search, arrival links |
| `shapes.txt` | 10 MB | 296,260 | High: route polylines and network visualization |
| `trips.txt` | 3.5 MB | 37,655 | Medium: route-to-shape mapping, headsigns, directions |
| `stop_times.txt` | 70 MB | 1,416,958 | High but large: scheduled arrivals and trip planning |
| `calendar.txt` | 7.3 KB | 135 | Medium: recurring service days |
| `calendar_dates.txt` | 19 KB | 1,063 | Medium: holidays and special service exceptions |
| `feed_info.txt` | 197 B | 1 | Low: feed freshness and version display |

Record counts exclude each CSV header row.

## Data Already Incorporated

The site already uses GTFS-derived static JSON:

- `stops.json`: generated from `gtfs/stops.txt`, 3,831 stop records, about 364 KB.
- `routes-shapes.json`: generated from `routes.txt`, `trips.txt`, and `shapes.txt`, 118 routes, 549 shapes, about 2.1 MB.
- `route-stops.json`: generated from `routes.txt`, `trips.txt`, `stops.txt`, and `stop_times.txt`, 118 routes, about 2.5 MB.

Conversion scripts:

- `convert_stops.py`
- `convert_route_shapes.py`
- `convert_route_stops.py`

Recommended refresh flow:

```bash
curl -L --fail --show-error --output gtfs/google_transit.zip https://www.thebus.org/transitdata/production/google_transit.zip
unzip -o gtfs/google_transit.zip -d gtfs
python3 convert_stops.py
python3 convert_route_shapes.py
python3 convert_route_stops.py
```

## Best Incorporation Opportunities

### 1. Route Directory

Use `routes.txt` to add a browsable route list with route number, full route name, type, and color. This is small enough to ship as a separate `routes.json` or to fold into the existing route shape data.

Impact: users can discover route numbers instead of already knowing them.

### 2. Better Headsign and Direction Labels

Use `trips.txt` fields such as `trip_headsign`, `direction_id`, `trip_headsign_short`, and `display_code` to label route variants more clearly in the route variant selector.

Impact: route maps can show "toward Kalihi" style options instead of only shape IDs.

### 3. Service Calendar Display

Use `calendar.txt` and `calendar_dates.txt` to show whether a selected route normally runs today and whether a holiday/special exception applies.

Impact: useful static context without requiring a backend.

### 4. Scheduled Stop Times

`stop_times.txt` is too large to ship directly to the browser. It can still be incorporated by generating smaller indexes, for example:

- per-stop schedule JSON files under `schedules/stops/{stop_id}.json`
- next scheduled departures for today only
- route-specific schedule summaries

Impact: scheduled arrivals could be shown when real-time API data is unavailable, but the generation step needs careful size control.

### 5. Feed Freshness UI

Use `feed_info.txt` to expose the active schedule version and valid date range somewhere subtle, such as an about/details panel.

Impact: helps debug stale data reports and confirms the static assets match the current GTFS feed.

## Recommendation

Keep the current static-site approach. The highest-value next improvement is a lightweight route directory plus better route-variant labels, because the required data is small and already available in `routes.txt` and `trips.txt`.

Avoid shipping raw `stop_times.txt` to the browser. If scheduled arrivals or trip planning become a priority, generate route- or stop-scoped schedule indexes offline, or move that feature into the proxy/backend service.
