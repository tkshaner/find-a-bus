# Find A Bus

An interactive single-page site for exploring Honolulu's TheBus routes, vehicles, and stop arrivals. The interface uses the public TheBus API to surface the latest transit information.

## Getting started

1. Open `index.html` in a modern browser. No build steps are required.
2. Enter your TheBus API key in the field at the top of the page. You can request one for free from the [TheBus developer portal](https://www.honolulutransit.org/).
3. Use the panels to search for routes, look up a specific vehicle, or view arrivals for a stop.

> **Note:** Requests are sent directly to `https://api.thebus.org`. Browser security policies may block the call if the service does not enable CORS for your environment. If that happens, proxy the API through a server you control.

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
