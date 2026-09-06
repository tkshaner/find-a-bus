# Find A Bus

An interactive single-page site for exploring Honolulu's TheBus routes, vehicles, and stop arrivals. The interface uses the public TheBus API to surface the latest transit information.

> 📋 See [CHANGELOG.md](CHANGELOG.md) for a complete history of changes and releases.

## Getting started

### 1. Launch the page

- Open `index.html` in any modern browser. No build steps are required because the site is fully static.

### 2. Add your API key

- Enter your TheBus API key in the banner at the top of the page.
- If you do not yet have a key, request one for free from the [TheBus developer portal](https://www.honolulutransit.org/).
- **Security:** By default, your key is stored in `sessionStorage` and cleared when you close your browser tab. Check "Remember my key" to store it permanently in `localStorage`.
- **Optional proxy template:** Routes and arrivals connect directly. Vehicle lookup requires a configured proxy, on localhost and GitHub Pages alike. Provide your own proxy template URL in the UI, such as `https://your-proxy.example/?url={url}` or `https://your-worker.workers.dev/?url={url}`.
- **Important:** Only use free developer API keys. Never enter production or paid API keys into this application.

### 3. Explore transit data

- **Routes panel:** Type a route number and optionally add a headsign keyword to narrow the results. Switch between the Map, Stops Table, and Timetable views for the selected route variant.
- **Vehicles panel:** Enter a fleet number to see the vehicle's latest reported position and status.
- **Arrivals panel:** Provide a stop number to view upcoming arrivals, including direction and schedule adherence.

> **Tip:** If the browser blocks requests to `https://api.thebus.org` because of CORS, configure the optional proxy template with a server you control. The public-proxy checkbox uses corsproxy.io without a separate proxy key. Its deployed-site access requires its own credentials and domain registration; use an authenticated custom template or a proxy you control.

## Deploying to GitHub Pages

Because the project is a static site, you can deploy it to GitHub Pages without a build step:

1. Push the repository to GitHub.
2. Enable GitHub Pages for the repository (Settings → Pages) and select the branch containing `index.html`.
3. Visit the published URL. Assets are referenced with relative paths and API calls use HTTPS, so they will load correctly from the GitHub Pages domain.

## Features

- Route search by number with optional headsign keyword.
- Route timetable view showing planned scheduled times at any stop along the route, with a live fallback to TheBus arrivals API when the static schedule is unavailable.
- Vehicle lookup by fleet number, including last reported position.
- Stop arrivals list summarizing status, direction, and schedule adherence.
- Consistent error, loading, and empty state messaging for better UX.
- Responsive design with dark-mode support.
- Secure API key handling with temporary storage by default.
- Show/hide key visibility and clear key functionality.

## Project structure

```
.
├── app.js                    # Fetches data from the API and renders results
├── index.html                # Layout and form controls for the interface
├── styles.css                # Styling for the interface, cards, and states
├── stops.json                # 3,831 bus stop locations (364 KB)
├── routes-shapes.json        # Route path coordinates (2.1 MB)
├── route-stops.json          # Stop sequences for routes (2.5 MB)
├── schedules/routes/         # Optional per-route, per-stop planned timetables
├── convert_stops.py          # GTFS stops to JSON conversion script
├── convert_route_stops.py    # GTFS to JSON conversion script
├── convert_route_schedules.py # GTFS schedule to per-route, per-stop timetables
├── convert_timetable.py      # GTFS schedule to origin-only timetable (legacy)
├── README.md                 # Project documentation
├── CHANGELOG.md              # Development log and version history
├── TESTING.md                # Test documentation and guide
├── package.json              # Node.js dependencies for testing
├── playwright.config.js      # Playwright test configuration
└── tests/                    # Playwright test suite (80+ tests)
    ├── api-key.spec.js
    ├── route-search.spec.js
    ├── vehicle-tracking.spec.js
    ├── stops-map.spec.js
    ├── arrivals.spec.js
    ├── page-structure.spec.js
    └── theme-toggle.spec.js
```

## Security considerations

This application handles API keys entirely in the browser. While we've implemented several security best practices, please be aware of the following:

### How your API key is stored

- **By default:** Your API key is stored in `sessionStorage`, which is cleared when you close your browser tab.
- **With "Remember me" checked:** Your API key is stored in `localStorage`, which persists until you manually clear it.
- **Visibility:** Your API key is hidden by default (password field), but can be toggled to visible.

### Security limitations

Because this is a client-side only application hosted on GitHub Pages:

- API keys are accessible via browser developer tools
- JavaScript on the page can access stored keys
- Browser extensions may be able to access stored keys
- There is no server-side protection or encryption
- If you configure a proxy template, your proxy service can see API requests (including the key query parameter)

### Best practices

✅ **DO:**
- Use free, rate-limited developer API keys only
- Clear your API key when using shared computers (click the ✕ button)
- Use sessionStorage mode (default) for better security
- Regularly rotate your API keys

❌ **DON'T:**
- Use production API keys with billing enabled
- Use API keys with sensitive data access
- Share your API key with others
- Use this tool on public/untrusted computers with "Remember me" enabled

### For developers

If you need production-grade security, consider implementing a backend proxy server that keeps API keys server-side. This client-side approach prioritizes simplicity and zero-cost hosting over maximum security.

## Testing

This project includes a comprehensive Playwright test suite with **80+ automated tests** covering all major functionality across multiple browsers and devices.

### Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm test

# Run tests with UI (interactive)
npm run test:ui

# View test report
npm run test:report
```

### Test Coverage

- ✅ **API Key Management** (8 tests): Storage, visibility, security
- ✅ **Route Search** (12 tests): Forms, data validation, visualization
- ✅ **Vehicle Tracking** (9 tests): Map display, templates, integration
- ✅ **Stops Map** (13 tests): 3,831 stops, clustering, geolocation
- ✅ **Arrivals** (8 tests): Form validation, results display
- ✅ **Page Structure** (19 tests): Layout, responsive design, accessibility

### Browser Coverage

Tests run on:
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)
- Mobile (Pixel 5, iPhone 12)

For detailed testing documentation, see [TESTING.md](TESTING.md).


## Request behavior and diagnosing proxy failures

Routes, arrivals, destination-stop arrivals, and vehicles share one request
handler with explicit response formats and 20-second timeouts. Routes use direct
`/routeJSON/`; all arrivals use direct XML `/arrivals/`, normalized into arrival
objects. Vehicle lookup uses XML `/vehicle/` through the configured proxy and
shows setup guidance if none is configured. Proxy settings apply only to vehicles.
The unsupported `/trip/` enrichment call has been removed; vehicle cards summarize
the trip ID and route/headsign fields already in the vehicle response.
Requests never silently switch between direct and proxy access or retry an
authentication error. Destination geocoding uses Photon separately; its subsequent
stop-arrival lookups use the common TheBus handler.

Errors identify the endpoint path, direct/proxy transport, and HTTP status when
available. They deliberately omit keys, full URLs, and raw response bodies.
A proxied HTTP 401 alone cannot distinguish proxy authentication from upstream
TheBus authentication. A network/CORS failure means the browser could not read a
response; it does not prove that the key was rejected.

The built-in public URL is `https://corsproxy.io/?url={url}`. It does not include
a corsproxy.io key. TheBus's key is nested inside the encoded upstream URL and
cannot authenticate corsproxy.io itself. For deployed access, see the provider's
[authentication documentation](https://corsproxy.io/docs/get-api-key/) and
[troubleshooting guide](https://corsproxy.io/docs/troubleshooting/).
To use provider authentication, uncheck the public option and configure the
provider's authenticated template, or use your own `fab-proxy` deployment.
Custom templates remain browser-visible and are saved in localStorage.

A credential-free diagnostic on 2026-09-06 requested public `https://example.com`
through the same unauthenticated corsproxy.io URL, with Origin set to
`https://tkshaner.github.io`. It returned HTTP 401 and a message requiring a valid
corsproxy.io API key. No TheBus credentials were used in this check. This reproduces
a proxy authentication failure independently of TheBus endpoint behavior.


## Direct arrivals and time handling

The XML arrivals endpoint returned wildcard CORS permission in the authenticated
[audit](docs/THEBUS_API_AUDIT.md), unlike its JSON counterpart. Stop lookup,
destination search, map-stop links, and live timetable fallback all use XML arrivals.
No public proxy is contacted by route or arrival searches, even if one is configured.

Arrival date and clock fields are interpreted in Hawaii time (UTC-10) regardless
of the rider's browser timezone. Scheduled/real-time flags are compared explicitly,
so the string `"0"` is correctly shown as scheduled. Unknown dates do not produce
invented countdowns. Full-date conversion handles midnight and noon.
