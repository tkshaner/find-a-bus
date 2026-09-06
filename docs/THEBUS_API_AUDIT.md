# TheBus API and CORS audit

Audit date: September 5, 2026, Hawaii time (September 6 UTC).

## Finding

There is a supported way to eliminate the proxy for arrivals: use the documented
XML `/arrivals/` endpoint, then normalize its response into the app's existing
arrival objects. It returns `Access-Control-Allow-Origin: *` and valid authenticated
arrival data. The JSON `/arrivalsJSON/` endpoint returns equivalent categories of
data but does not return that CORS header.

This is endpoint-specific server configuration, not a JSON-versus-XML browser rule.
The opposite pairing exists for routes: JSON permits CORS, XML does not.
No forwarding through `routeJSON` is needed or documented.

An arbitrary fleet-number vehicle lookup still needs a controlled backend or an
upstream CORS fix. The working XML vehicle endpoint lacks CORS; its documented
JSON counterpart returned 404 during this audit.

## Scope and method

- Inventoried all six endpoints linked from the official API index: three services,
  each documented in XML and JSON. Also tested the app's additional `/trip/` call.
- Ran six authenticated, direct `fetch` calls in the local in-app browser. Used
  only safelisted Accept headers, GET, HTTPS, no proxy, and the default fetch
  credential behavior. Each request had a 25-second timeout.
- Ran 23 authenticated HTTPS probes through a temporary localhost-only diagnostic
  service to see headers that browsers hide. Twelve compared the same endpoint,
  key and parameters with localhost and GitHub Pages Origin headers; six checked
  trailing-slash redirects; four checked OPTIONS; one checked `/trip/` using a
  real trip ID returned by arrivals.
- Separately inspected seven unauthenticated endpoint responses.
- Route: 2. Stop: 45. Vehicle: 249. Each Origin pair used identical parameters.
- The local audit service used the key in memory and sent it only to
  `https://api.thebus.org`. It did not follow redirects or log full URLs.
  Evidence excludes the key, raw bodies, driver fields, and full query URLs.
- The GitHub Pages comparison used server-side requests with
  `Origin: https://tkshaner.github.io`. It was **not** a browser test on the
  deployed GitHub Pages site. The wildcard permission on successful responses
  supports direct access from that origin under normal CORS rules.
- This is a point-in-time functional audit, not a guarantee of future uptime or
  all possible input combinations. No undocumented endpoint enumeration,
  authentication bypass, or URL-forwarding exploit testing was performed.

Sanitized evidence: [thebus-api-audit-results.json](thebus-api-audit-results.json).

## Endpoint compatibility matrix

Headers and statuses below were the same for both Origin values on all six services.

| Endpoint | Format | Authenticated HTTP result | Allow-Origin | Local browser result | App implication |
|---|---|---|---|---|---|
| `/routeJSON/?route=2` | JSON | 200; 12 route variants | `*` | Readable, valid data | Keep for direct route search |
| `/route/?route=2` | XML | 200; 12 route variants | absent | TypeError | No advantage over routeJSON |
| `/arrivalsJSON/?stop=45` | JSON | 200; 25 arrivals | absent | TypeError | Data is valid, but browser cannot read it |
| `/arrivals/?stop=45` | XML | 200; 25 arrivals | `*` | Readable, valid data | Use to remove arrival proxy dependency |
| `/vehicle/?num=249` | XML | 200; one vehicle | absent | TypeError | Fleet lookup still needs backend/upstream change |
| `/vehicleJSON/?num=249` | Documented JSON | 404; HTML error page | absent | TypeError | Do not switch to this without provider clarification |
| `/trip/?trip=<observed trip ID>` | Not listed in official index | 404; HTML error page | absent | Not tested separately in browser | Current enrichment call is unsupported by available docs and failed live |

All successful data responses had no API error. The key was therefore accepted
by route, arrivals, and vehicle services. Their browser failures should not be
classified as invalid-key failures.

## Architecture supported by the evidence

The public interface consists of separate route, arrival, and vehicle resources,
with format-specific paths. Observed responses identify Microsoft IIS 8.5 and
ASP.NET. The per-path CORS differences and redirects are consistent with separate
resource/application configuration; response headers do not establish the private
backend topology or implementation language.

Route results provide GTFS linkage (route ID and shape ID) and headsign/first-stop
metadata. Arrival results provide stop-level predictions and identifiers for
routes, trips, vehicles, and shapes. Vehicle results provide fleet-level location
and adherence data. A trip identifier is a GTFS reference; it does not establish
the existence of a live `/trip/` API.

The API index now links JSON documentation even though its introductory paragraph
and older combined PDF still describe XML only. Documentation is not fully aligned
with observed availability: `/vehicleJSON/` is advertised but returned 404.

## CORS, redirects, and authentication

- Localhost does not receive special treatment in this audit. Both origins got
  the same headers and successful upstream data for each working endpoint.
- Earlier apparent local/deployed differences can be explained by the old
  host-dependent transport selection, separate saved proxy/key settings, or stale
  assets. This audit does not establish which caused every prior observation.
- Missing CORS on `/arrivalsJSON/` and `/vehicle/` hides successful HTTP 200 data
  from JavaScript. Missing CORS on `/vehicleJSON/` and `/trip/` can hide HTTP 404s.
- Unauthenticated `/arrivalsJSON/` and `/vehicle/` return HTTP 200 with an
  `errorMessage`; their lack of CORS hides that error too. `/arrivals/` returns a
  readable XML API error with HTTP 200. Status alone is insufficient.
- Removing the trailing slash causes 301 redirects for the five available
  resource paths. Their Location targets remain HTTPS on api.thebus.org, with a
  trailing slash. `/vehicleJSON` also returns 404. Use the canonical slash URLs.
- OPTIONS returned HTTP 200, but none of the four tested paths returned
  `Access-Control-Allow-Headers` authorizing `X-Requested-With`. Successful
  OPTIONS status alone does not authorize a preflighted request. Avoid unnecessary
  custom headers; our standard GET requests do not need that header.
- JSON versus XML is not the CORS criterion. The response's CORS headers are.
- Do not switch to plain HTTP: these authenticated tests succeed over HTTPS, and
  HTTP would expose the key and conflict with an HTTPS site's mixed-content rules.
- `no-cors` fetch would yield an unreadable response and would not solve parsing.
- Separately, the earlier public-proxy test returned a corsproxy.io 401 requiring
  its own API key. That is a different failure from these direct TheBus responses.

## Recommended application changes

1. Keep route searches on `/routeJSON/`.
2. Add a dedicated arrivals adapter for `/arrivals/` using `DOMParser`.
   Validate the `stopTimes` root and `errorMessage`; map repeated `arrival`
   elements into `{ stop, timestamp, arrivals: [...] }`. Preserve IDs as strings,
   reject malformed responses, and distinguish no arrivals from an API error.
3. Route all arrival consumers through that adapter: stop search, destination
   nearby-stop search, stop-marker links, and live timetable fallback. These can
   then use direct requests without a proxy. Photon geocoding is a separate API
   and is outside this TheBus audit.
4. Choose transport by documented endpoint capability rather than forcing every
   endpoint through a configured proxy. Direct route/arrival calls can coexist
   with a controlled backend for fleet lookup. Keep any user-selected override
   explicit and avoid silently transmitting credentials to third-party proxies.
5. Remove or disable `/trip/` enrichment until an official working endpoint is
   provided. Existing vehicle fields and refreshed GTFS trip metadata can supply
   much of the display without the failing request.
6. Keep `/vehicle/` behind our own backend if arbitrary fleet-number tracking is
   required. Alternatively, display vehicles observed in a selected stop's
   arrivals, clearly scoped to that stop; this does not replace arbitrary fleet
   lookup and should not require polling every stop.
7. Ask TheBus support whether `/vehicleJSON/` is deployed at a new documented URL
   and whether `/vehicle/` can receive the same wildcard CORS headers as arrivals.
   No message was sent during this audit.

## Additional data-contract issues found in the app

These are independent of CORS and should be covered when implementing the adapter:

- `parseArrivalWaitMinutes` treats `stopTime` as a minute count. The observed API
  value is a local clock string such as `5:18 PM`, with a separate `date` field.
  The function does not combine those fields and can fall back to its 240-minute
  sentinel. Parse the date and clock time in `Pacific/Honolulu`, then calculate
  wait minutes; test midnight and visitors in other time zones.
- Arrival card rendering checks `estimated` by truthiness. The documented format
  uses string flags, so `"0"` is truthy and can incorrectly display a scheduled
  arrival as real-time. Normalize explicitly or compare with `"1"`.
- The request handler currently detects XML with `path.includes('/vehicle')`.
  An arrivals XML adapter must explicitly select the parser; simply replacing
  `/arrivalsJSON/` with `/arrivals/` would currently attempt JSON parsing and fail.
  That same substring test would misclassify `/vehicleJSON/` if it becomes available.

## Sources

- [Official API index](https://hea.thebus.org/api_info.asp)
- [Route JSON](https://hea.thebus.org/api/documentation/routeJSON.pdf)
- [Route XML / combined API documentation](https://hea.thebus.org/api/documentation/Web%20Services%20API.pdf)
- [Arrivals JSON](https://hea.thebus.org/api/documentation/arrivalsJSON.pdf)
- [Arrivals XML](https://hea.thebus.org/api/documentation/arrivals.pdf)
- [Vehicle XML](https://hea.thebus.org/api/documentation/vehicle.pdf)
- [Vehicle JSON](https://hea.thebus.org/api/documentation/vehicleJSON.pdf)
- [CORS behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

The audit itself changed no application behavior. The subsequent implementation
uses direct XML arrivals, fixes date/flag handling, limits proxy use to vehicles,
and removes the unsupported trip request.
