# Find A Bus

An interactive single-page site for exploring Honolulu's TheBus routes, vehicles, and stop arrivals. The interface uses the public TheBus API to surface the latest transit information.

## Getting started

### 1. Launch the page

- Open `index.html` in any modern browser. No build steps are required because the site is fully static.

### 2. Add your API key

- Enter your TheBus API key in the banner at the top of the page.
- If you do not yet have a key, request one for free from the [TheBus developer portal](https://www.honolulutransit.org/).
- The interface stores the key locally (via `localStorage`) so you only need to enter it once per browser.

### 3. Explore transit data

- **Routes panel:** Type a route number and optionally add a headsign keyword to narrow the results.
- **Vehicles panel:** Enter a fleet number to see the vehicle's latest reported position and status.
- **Arrivals panel:** Provide a stop number to view upcoming arrivals, including direction and schedule adherence.

> **Tip:** If the browser blocks requests to `https://api.thebus.org` because of CORS, proxy the API through a server you control. The app automatically retries with a proxy-compatible URL when it detects parse or network errors.

## Deploying to GitHub Pages

Because the project is a static site, you can deploy it to GitHub Pages without a build step:

1. Push the repository to GitHub.
2. Enable GitHub Pages for the repository (Settings → Pages) and select the branch containing `index.html`.
3. Visit the published URL. Assets are referenced with relative paths and API calls use HTTPS, so they will load correctly from the GitHub Pages domain.

## Features

- Route search by number with optional headsign keyword.
- Vehicle lookup by fleet number, including last reported position.
- Stop arrivals list summarizing status, direction, and schedule adherence.
- Consistent error, loading, and empty state messaging for better UX.
- Responsive design with dark-mode support.

## Project structure

```
.
├── app.js        # Fetches data from the API and renders results
├── index.html    # Layout and form controls for the interface
├── styles.css    # Styling for the interface, cards, and states
└── README.md
```
