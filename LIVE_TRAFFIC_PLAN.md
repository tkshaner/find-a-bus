# Plan: Live-Traffic Commute Check — Route 81 Express vs. A Line Feeder + Skyline

## Goal

Answer one very specific question in real time: *"I'm at Alapai Transit Center about to head west. Should I board the Route 81 Waipahu Express, or walk to King & South St, take the A Line feeder to Ahua (Lagoon Drive) Station, and ride Skyline to Waipahu?"*

The 81 rides H-1 westbound through the PM peak, so its actual runtime swings heavily with traffic. The A Line + Skyline chain is almost entirely traffic-immune (the rail is grade-separated; the A Line's Nimitz/Lagoon segment is short). The feature hits the Google Maps Routes API for a live traffic-aware drive time along the 81's alignment, converts that into a live bus estimate, and compares it against the fixed feeder+rail estimate.

## What the data already tells us (verified against this repo's GTFS-derived JSON)

### Route 81 westbound (`schedules/routes/81.json`, shape `810135`, direction 0, "EXPRESS - Waipahu")

- Runs **weekday PM peak only**: 9 trips departing Alapai Transit Center (stop **2288**) at 15:00, 15:30, 15:50, 16:05, 16:25, 16:50, 17:10, 17:30, 17:50.
- Scheduled runtime Alapai → Leoku St + Farrington Hwy (stop **1017**, terminus): **65–66 min**.
- Scheduled runtime Alapai → Waipahu St + Waipahu Depot Rd (stop **1383**, adjacent to Waipahu Transit Center): **~56 min**.

### A Line feeder westbound (`schedules/routes/A LINE.json`, shape `A0314`, direction 0, "AHUA LAGOON DRIVE SKYLINE STATION")

- The A Line does **not** stop at King & South St itself. The nearest boarding stop on the westbound shape is **Kapiolani Bl + South St (stop 436)** — one block makai of King & South (~2 min walk from Alapai TC). The plan uses stop 436 and labels it accordingly; if TheBus later adds a King St routing, only the config changes.
- Drop-off: **Lagoon Dr + Ualena St nearside (stop 4850)**, serving Ahua Lagoon Drive Station.
- Scheduled ride stop 436 → stop 4850: **~26 min**; weekday headway ~15 min (85 trips/day, 04:26–21:59 at stop 436).

### Skyline rail (route key `""` in `route-stops.json`, shape `SKY0019`)

- Westbound from Ahua Lagoon Drive Station (stop 10031) → **Pouhala Waipahu Transit Center Station (stop 10043)** is 7 station-to-station segments (~15 min), continuing to East Kapolei.
- **Gap:** `schedules/routes/` has no Skyline file because `convert_route_schedules.py` names output files by `route_short_name`, which is empty for Skyline. Phase 1 fixes this (see below).

### Destination anchoring

The two itineraries end at different points, so the comparison must be anchored to a common arrival point. Default anchor: **Waipahu Transit Center** — the 81 serves Waipahu St + Waipahu Depot Rd (stop 1383) directly across from it, and Skyline arrives at Pouhala Station on top of it. The config allows the anchor to be swapped (e.g., 81 terminus at Leoku + Farrington with a rail+walk or transfer adjustment) without touching code.

## The comparison model

Both estimates are "door-to-door" from a decision instant `t` (now, at Alapai TC) to arrival at the anchor.

### Express (81) — live-traffic adjusted

```
expressETA(t) = nextDeparture81(t)                       // static schedule at stop 2288
              + scheduledRuntime(2288 → 1383)             // from 81.json, per-trip
              + trafficDelta                              // the live part
trafficDelta  = duration − staticDuration                 // Google Routes API, driving,
                                                          // Alapai TC → Waipahu Depot Rd,
                                                          // via an H-1 waypoint
```

Key insight: the Google Routes API (`routes.googleapis.com/directions/v2:computeRoutes`) returns **both** `duration` (traffic-aware, `routingPreference: TRAFFIC_AWARE`) and `staticDuration` (traffic-free) in a single call. We never treat the raw drive time as the bus time — buses dwell at stops and don't drive like cars. Instead we take only the *congestion delta* and add it to the GTFS scheduled runtime, which already encodes typical dwell and typical traffic for the scheduled hour. A `route.polyline` from the same response can optionally be drawn on the existing Leaflet map for transparency.

- Origin: `21.304159,-157.853321` (Alapai TC), destination: stop 1383 coordinates, one `intermediates` via-point on H-1 near the Waikele/Paiwa exit so Google follows the 81's freeway alignment rather than a surface-street alternative.
- Optional refinement (Phase 3): when a 81 vehicle is already en route, blend in TheBus real-time arrivals adherence at stop 2288 for the wait portion.

### Feeder + rail — fixed estimate

```
feederRailETA(t) = walk(Alapai TC → stop 436)             // ~2 min constant
                 + wait for next A Line at stop 436        // static schedule; live TheBus
                                                          //   arrivals for stop 436 when a
                                                          //   key is present
                 + scheduledRide(436 → 4850)              // ~26 min from A LINE.json
                 + transfer walk + fare gate               // ~4 min constant
                 + expected rail wait                      // headway/2 from SKYLINE.json
                 + railRuntime(Ahua → Pouhala)             // ~15 min from SKYLINE.json
```

No Google call needed for this leg. All constants live in the scenario config, not code.

### Verdict

Render both ETAs as clock times with a breakdown, highlight the winner, and show the margin ("A Line + Skyline arrives ~12 min earlier"). Below a configurable indifference threshold (default 5 min) call it a toss-up. Outside the 81's service window (weekday 15:00–17:50), state that plainly and show the feeder+rail time alone.

## Implementation phases

### Phase 1 — Skyline static schedule (prerequisite, no UI)

1. Fix `convert_route_schedules.py` (and `convert_route_stops.py` keying if needed): when `route_short_name` is empty, fall back to a slug of `route_long_name` → emits `schedules/routes/SKYLINE.json`.
2. Regenerate from the current feed; commit the new JSON. This also fixes the rail's empty key (`""`) in future regenerations of `route-stops.json` (keep `""` reads working for the current files).

### Phase 2 — Scenario config + estimator module

1. Add a `commute-scenarios.json` (or a `const` block in `app.js`, matching the repo's no-build style) describing this scenario declaratively: stop IDs (2288, 436, 4850, 10031, 10043, 1383), shape IDs (`810135`, `A0314`, `SKY0019`), walk/transfer constants, indifference threshold, Google origin/destination/via coordinates, labels.
2. Pure functions in `app.js` (exported for tests): `nextDepartures(scheduleFile, stopId, t)`, `segmentRuntime(scheduleFile, fromStop, toStop, tripIndex)`, `buildExpressEstimate(...)`, `buildFeederRailEstimate(...)`, `compareCommutes(...)`. All take `t` as a parameter — no hidden `Date.now()` — so Playwright can pin the clock.
3. Service-day handling reuses the existing `currentServiceCategory()` helper.

### Phase 3 — Google Routes API integration

1. New "Advanced API settings" field: **Google Maps API key**, stored exactly like the TheBus key (`sessionStorage` default, opt-in `localStorage`, show/hide, clear). README gains a section: create a key restricted to *Routes API* + HTTP-referrer restriction to the deployed origin; Routes API Basic SKU is ~$5/1k after the monthly free tier, and this feature makes **one** `computeRoutes` call per manual check (no polling).
2. `fetchTrafficDelta()` calls `POST https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-Api-Key` and a minimal `X-Goog-FieldMask: routes.duration,routes.staticDuration,routes.polyline.encodedPolyline`. Unlike the legacy Directions API, the Routes API supports browser CORS, so no proxy is required; on network/CORS failure, fall back to the existing proxy-template path (`createProxyUrl`) like other requests.
3. Cache the result for 60 s to guard against repeated clicks.
4. Optionally blend TheBus real-time arrivals (stop 2288 for the 81, stop 436 for the A Line) when a TheBus key is present — reusing `fetchArrivalsForStopCached`.

### Phase 4 — UI panel

1. New panel after "Find Stops Near Destination": **"Express vs. Rail: Route 81 Westbound"** with a single "Check now" button (plus an optional "depart at" time picker defaulting to now).
2. Result card: two columns (81 Express | A Line + Skyline), each with a step-by-step breakdown (depart / ride / transfer / arrive times), the live traffic delta badge for the 81 ("H-1 currently +14 min over free-flow"), verdict banner, and data-source/freshness line. Reuse `renderLoading` / `renderMessage` / card styles.
3. Degradation ladder: no Google key → schedule-only comparison with a note that the 81 estimate ignores live traffic; no TheBus key → static schedules only (feature still works, since Google and the static JSON need no TheBus key); outside 81 service window → informational state.
4. Optional: "Save" hooks into the existing Saved Commute storage so the check is one click on return visits.

### Phase 5 — Tests & docs

1. Playwright spec `tests/commute-compare.spec.js`: mock `routes.googleapis.com` and `api.thebus.org` via `page.route()`, pin the clock to a weekday 16:10 HST, and assert: correct next-departure selection, traffic delta applied, verdict flips when the mocked delta crosses the margin, all three degradation states, and the outside-service-window message.
2. Unit-style assertions for the pure estimator functions (same spec file, `page.evaluate`, consistent with the current test approach).
3. Update README (feature + Google key setup), CHANGELOG, and GTFS_ANALYSIS.md (SKYLINE.json output).

## Risks / open questions

- **Boarding stop mismatch**: "King & South St" has no A Line stop; nearest is Kapiolani Bl + South St (stop 436). Confirm this matches the intended commute, or whether boarding at S. Beretania + Punchbowl (stop 4860, also on `A0314` and closer to some Alapai TC exits) is preferred.
- **Traffic-delta proxy accuracy**: car congestion delta on H-1 approximates but doesn't equal bus delay (zipper lane / bus-permitted shoulder use differ). The scheduled-runtime-plus-delta model bounds the error, and the breakdown UI makes the assumption visible. A future calibration pass could compare against TheBus adherence data.
- **Google billing exposure**: mitigated by user-supplied, referrer-restricted keys, one call per check, 60 s cache, and prominent "free-tier developer key only" guidance mirroring the TheBus key policy.
- **GTFS drift**: stop IDs and the 81's PM-only span are pinned to feed version `2605_v5` (valid through Aug 22, 2026). The scenario config isolates every ID/constant so a feed refresh is a config-only change; a startup sanity check should warn in the console if a configured stop ID is missing from the loaded schedule.
- **Generalization**: everything scenario-specific lives in config, so a future "any express vs. any feeder+rail pair" feature is a config-schema change, not a rewrite — but that is explicitly out of scope here.
