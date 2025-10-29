# Testing Guide for Find A Bus

This document describes the automated testing setup for the Find A Bus application using Playwright.

## Overview

The test suite uses [Playwright](https://playwright.dev/) for end-to-end testing across multiple browsers and devices. Tests cover all major functionality including API key management, route search, vehicle tracking, stop maps, and arrivals lookup.

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

This will download Chromium, Firefox, and WebKit browsers for testing.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run tests with UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in debug mode
```bash
npm run test:debug
```

### View test report
```bash
npm run test:report
```

### Run specific test file
```bash
npx playwright test tests/api-key.spec.js
```

### Run specific test by name
```bash
npx playwright test -g "should display API key input"
```

## Test Structure

### Test Files

```
tests/
├── api-key.spec.js           # API key storage and security
├── route-search.spec.js      # Route search and visualization
├── vehicle-tracking.spec.js  # Vehicle tracking functionality
├── stops-map.spec.js         # All stops map with clustering
├── arrivals.spec.js          # Stop arrivals lookup
└── page-structure.spec.js    # Overall page layout and structure
```

### Test Coverage

#### 1. API Key Management (`api-key.spec.js`)
- ✅ Password field type for API key input
- ✅ Show/hide toggle functionality
- ✅ SessionStorage (default) vs localStorage (remember me)
- ✅ Clear button removes key from all storage
- ✅ Security notice display
- ✅ Dynamic help text based on storage mode
- ✅ Key persistence across page reloads

**Total Tests:** 8

#### 2. Route Search (`route-search.spec.js`)
- ✅ Form display and field validation
- ✅ Required vs optional fields
- ✅ Map container visibility
- ✅ Data file loading (routes-shapes.json, route-stops.json)
- ✅ JSON structure validation
- ✅ Leaflet map initialization
- ✅ Form field names match API

**Total Tests:** 12

#### 3. Vehicle Tracking (`vehicle-tracking.spec.js`)
- ✅ Form display and submission
- ✅ Required field validation
- ✅ Map container and canvas elements
- ✅ Template structure validation
- ✅ Leaflet integration
- ✅ Section header and descriptions
- ✅ Placeholder text

**Total Tests:** 9

#### 4. Stops Map (`stops-map.spec.js`)
- ✅ Section visibility and content
- ✅ Toggle button functionality
- ✅ Find nearby button display
- ✅ Data file loading (stops.json)
- ✅ JSON structure validation (3,825 stops)
- ✅ Coordinate validation (Honolulu bounds)
- ✅ Leaflet MarkerCluster plugin
- ✅ Global checkStopArrivals function
- ✅ ARIA labels for accessibility

**Total Tests:** 13

#### 5. Arrivals Lookup (`arrivals.spec.js`)
- ✅ Form display and validation
- ✅ Required field
- ✅ Template structure
- ✅ Results section display
- ✅ Section headers and descriptions
- ✅ Accessibility features
- ✅ Form styling

**Total Tests:** 8

#### 6. Page Structure (`page-structure.spec.js`)
- ✅ Page title
- ✅ Hero section display
- ✅ External library loading (Leaflet, MarkerCluster)
- ✅ All main sections present
- ✅ Usage tips section
- ✅ Semantic HTML structure
- ✅ Meta tags (viewport, charset, lang)
- ✅ Responsive design (mobile, tablet)
- ✅ No console errors
- ✅ Templates in DOM

**Total Tests:** 19

**Total Test Suite: 69 tests**

## Browser Coverage

Tests run on the following browsers and devices:

### Desktop
- ✅ Chromium (Chrome/Edge)
- ✅ Firefox
- ✅ WebKit (Safari)

### Mobile
- ✅ Pixel 5 (Android)
- ✅ iPhone 12 (iOS)

## Configuration

The test configuration is in `playwright.config.js`:

```javascript
{
  baseURL: 'http://127.0.0.1:8000',
  webServer: {
    command: 'python3 -m http.server 8000',
    reuseExistingServer: !process.env.CI
  },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
}
```

### Local Development
- Uses Python's built-in HTTP server
- Runs on `http://127.0.0.1:8000`
- Reuses existing server if already running

### CI/CD
- Starts fresh server for each run
- Enables retries (2x)
- Captures traces and screenshots on failure

## Writing New Tests

### Basic Test Template

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    const element = page.locator('#elementId');
    await expect(element).toBeVisible();
  });
});
```

### Best Practices

1. **Use descriptive test names**: Start with "should" for clarity
2. **Clean state**: Use `beforeEach` to reset state
3. **Wait for elements**: Use Playwright's auto-waiting
4. **Locator strategies**: Prefer semantic selectors (role, label) over CSS
5. **Assertions**: Use Playwright's built-in expect with auto-retry

### Common Patterns

**Check visibility:**
```javascript
await expect(page.locator('#element')).toBeVisible();
```

**Check text content:**
```javascript
await expect(page.locator('h1')).toContainText('Expected Text');
```

**Check attributes:**
```javascript
await expect(page.locator('input')).toHaveAttribute('required', '');
```

**Check element count:**
```javascript
expect(await page.locator('.item').count()).toBe(5);
```

**Evaluate JavaScript:**
```javascript
const result = await page.evaluate(() => window.someFunction());
```

## Data File Testing

The test suite validates the structure and content of static data files:

### stops.json (364 KB)
- 3,825 bus stops
- Required fields: id, code, name, lat, lon
- Coordinate validation for Honolulu bounds

### routes-shapes.json (397 KB)
- 120+ route paths
- Simplified to every 3rd point
- Polyline coordinates as [lat, lon] arrays

### route-stops.json (3 MB)
- Stop sequences for each route/shape
- Ordered by stop_sequence
- Includes stop metadata (name, code, coordinates)

## Accessibility Testing

Tests include basic accessibility checks:
- ✅ ARIA labels present
- ✅ Form labels associated with inputs
- ✅ Semantic HTML elements (header, main, section)
- ✅ Heading hierarchy
- ✅ Role attributes for dynamic content

## Performance Considerations

- Tests use `networkidle` for load state when needed
- Timeouts increased for large data files (10 seconds)
- MarkerCluster library tested for 3,825 markers
- Screenshots only captured on failure to reduce overhead

## Troubleshooting

### Tests fail with "Page not found"
Ensure the web server is running:
```bash
python3 -m http.server 8000
```

### Browser not installed
Run:
```bash
npx playwright install chromium
```

### Tests timeout
Increase timeout in test:
```javascript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

### View test results
After running tests:
```bash
npx playwright show-report
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run tests
        run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Future Enhancements

Potential test additions:
- API integration tests with mocked responses
- Visual regression testing
- Performance testing (Lighthouse scores)
- Enhanced accessibility testing (axe-core)
- User flow testing (complete workflows)
- Cross-browser screenshot comparison

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Writing Tests Guide](https://playwright.dev/docs/writing-tests)

## Support

For issues with tests:
1. Check test output for specific failures
2. Run in debug mode: `npm run test:debug`
3. View traces: `npx playwright show-trace trace.zip`
4. Review test reports: `npm run test:report`

---

**Last Updated:** 2025-10-28
**Test Suite Version:** 1.0.0
**Total Tests:** 69
**Code Coverage:** UI Components & Data Files
