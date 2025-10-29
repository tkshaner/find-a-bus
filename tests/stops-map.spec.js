// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('All Stops Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display stops map section', async ({ page }) => {
    const section = page.locator('section').filter({ has: page.locator('#stops-map-title') });
    await expect(section).toBeVisible();
  });

  test('should display stops map title and description', async ({ page }) => {
    const title = page.locator('#stops-map-title');
    await expect(title).toContainText('All Bus Stops');

    const section = page.locator('section').filter({ has: title });
    const description = section.locator('p').first();
    await expect(description).toContainText('3,825');
    await expect(description).toContainText('TheBus stops');
  });

  test('should have toggle stops button', async ({ page }) => {
    const toggleButton = page.locator('#toggleStopsBtn');
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toContainText('Show All Stops on Map');
  });

  test('should have find nearby button initially hidden', async ({ page }) => {
    const nearbyButton = page.locator('#findNearbyBtn');
    await expect(nearbyButton).toBeHidden();
  });

  test('should have stops map container initially hidden', async ({ page }) => {
    const stopsMapContainer = page.locator('#stopsMap');
    await expect(stopsMapContainer).toBeHidden();
  });

  test('should have stops map canvas element', async ({ page }) => {
    const stopsMapCanvas = page.locator('#stopsMapCanvas');
    await expect(stopsMapCanvas).toBeAttached();
    await expect(stopsMapCanvas).toHaveClass(/map-canvas/);
  });

  test('should load stops.json data file', async ({ page }) => {
    const response = await page.request.get('/stops.json');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(3800); // Should have ~3,825 stops
  });

  test('should validate stops.json structure', async ({ page }) => {
    const response = await page.request.get('/stops.json');
    const data = await response.json();

    expect(data.length).toBeGreaterThan(0);

    const firstStop = data[0];
    expect(firstStop).toHaveProperty('id');
    expect(firstStop).toHaveProperty('code');
    expect(firstStop).toHaveProperty('name');
    expect(firstStop).toHaveProperty('lat');
    expect(firstStop).toHaveProperty('lon');

    // Validate data types
    expect(typeof firstStop.id).toBe('string');
    expect(typeof firstStop.name).toBe('string');
    expect(typeof firstStop.lat).toBe('number');
    expect(typeof firstStop.lon).toBe('number');

    // Validate coordinates are in valid range
    expect(firstStop.lat).toBeGreaterThan(21);
    expect(firstStop.lat).toBeLessThan(22);
    expect(firstStop.lon).toBeGreaterThan(-158);
    expect(firstStop.lon).toBeLessThan(-157);
  });

  test('should toggle stops map visibility when button clicked', async ({ page }) => {
    const toggleButton = page.locator('#toggleStopsBtn');
    const stopsMapContainer = page.locator('#stopsMap');

    // Initially hidden
    await expect(stopsMapContainer).toBeHidden();

    // Click to show
    await toggleButton.click();

    // Wait for map to load and display
    await expect(stopsMapContainer).toBeVisible({ timeout: 10000 });

    // Button text should change
    await expect(toggleButton).toContainText('Hide');

    // Nearby button should appear
    const nearbyButton = page.locator('#findNearbyBtn');
    await expect(nearbyButton).toBeVisible();
  });

  test('should load Leaflet MarkerCluster plugin', async ({ page }) => {
    // Check that MarkerCluster is loaded
    const markerClusterLoaded = await page.evaluate(() => {
      return typeof window.L !== 'undefined' &&
             typeof window.L.markerClusterGroup !== 'undefined';
    });
    expect(markerClusterLoaded).toBeTruthy();
  });

  test('should have checkStopArrivals function globally available', async ({ page }) => {
    const functionExists = await page.evaluate(() => {
      return typeof window.checkStopArrivals === 'function';
    });
    expect(functionExists).toBeTruthy();
  });

  test('should have info message container', async ({ page }) => {
    const infoMessage = page.locator('#stopsMessage');
    await expect(infoMessage).toBeAttached();
    await expect(infoMessage).toBeHidden(); // Initially hidden
  });

  test('should display stops count in description', async ({ page }) => {
    const section = page.locator('section').filter({
      has: page.locator('#stops-map-title')
    });
    const description = section.locator('.panel__header p');
    await expect(description).toContainText('3,825+');
  });

  test('should have proper ARIA labels for accessibility', async ({ page }) => {
    const section = page.locator('section').filter({
      has: page.locator('#stops-map-title')
    });
    await expect(section).toHaveAttribute('aria-labelledby', 'stops-map-title');
  });

  test('should have map controls container with proper styling', async ({ page }) => {
    const mapControls = page.locator('.map-controls');
    await expect(mapControls).toBeVisible();
  });
});
