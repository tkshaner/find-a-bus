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
- **Important:** Only use free developer API keys. Never enter production or paid API keys into this application.

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
- Secure API key handling with temporary storage by default.
- Show/hide key visibility and clear key functionality.

## Project structure

```
.
├── app.js         # Fetches data from the API and renders results
├── index.html     # Layout and form controls for the interface
├── styles.css     # Styling for the interface, cards, and states
├── README.md      # Project documentation
└── CHANGELOG.md   # Development log and version history
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
