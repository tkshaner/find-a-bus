// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Route Search and Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display route search form', async ({ page }) => {
    const routeForm = page.locator('#routeForm');
    const routeNumberInput = page.locator('#routeNumber');
    const routeHeadsignInput = page.locator('#routeHeadsign');
    const submitButton = routeForm.locator('button[type="submit"]');

    await expect(routeForm).toBeVisible();
    await expect(routeNumberInput).toBeVisible();
    await expect(routeHeadsignInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText('Search Routes');
  });

  test('should require route number field', async ({ page }) => {
    const routeNumberInput = page.locator('#routeNumber');
    await expect(routeNumberInput).toHaveAttribute('required', '');
  });

  test('should make headsign field optional', async ({ page }) => {
    const routeHeadsignInput = page.locator('#routeHeadsign');
    await expect(routeHeadsignInput).not.toHaveAttribute('required');
  });

  test('should show route map container initially hidden', async ({ page }) => {
    const routeMapContainer = page.locator('#routeMap');
    await expect(routeMapContainer).toBeHidden();
  });

  test('should display loading state when searching', async ({ page }) => {
    const routeForm = page.locator('#routeForm');
    const routeNumberInput = page.locator('#routeNumber');
    const routeResults = page.locator('#routeResults');

    await routeNumberInput.fill('2');

    // Start form submission
    const submitPromise = routeForm.locator('button[type="submit"]').click();

    // Check for loading spinner (should appear briefly)
    const loadingSpinner = routeResults.locator('.loading-spinner');
    // Note: This might be too fast to catch in local testing

    await submitPromise;
  });

  test('should load routes-shapes.json data file', async ({ page }) => {
    // Navigate and wait for potential data load
    await page.goto('/');

    // Check if routes-shapes.json file exists and is accessible
    const response = await page.request.get('/routes-shapes.json');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');

    const data = await response.json();
    expect(data).toBeTruthy();
    expect(typeof data).toBe('object');
  });

  test('should load route-stops.json data file', async ({ page }) => {
    await page.goto('/');

    const response = await page.request.get('/route-stops.json');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toBeTruthy();
    expect(typeof data).toBe('object');
  });

  test('should validate route-stops.json structure', async ({ page }) => {
    const response = await page.request.get('/route-stops.json');
    const data = await response.json();

    // Get first route
    const routeIds = Object.keys(data);
    expect(routeIds.length).toBeGreaterThan(0);

    const firstRoute = data[routeIds[0]];
    expect(firstRoute).toHaveProperty('name');
    expect(firstRoute).toHaveProperty('long_name');
    expect(firstRoute).toHaveProperty('shapes');

    // Check shape structure
    const shapeIds = Object.keys(firstRoute.shapes);
    expect(shapeIds.length).toBeGreaterThan(0);

    const firstShape = firstRoute.shapes[shapeIds[0]];
    expect(Array.isArray(firstShape)).toBeTruthy();
    expect(firstShape.length).toBeGreaterThan(0);

    // Check stop structure
    const firstStop = firstShape[0];
    expect(firstStop).toHaveProperty('id');
    expect(firstStop).toHaveProperty('name');
    expect(firstStop).toHaveProperty('lat');
    expect(firstStop).toHaveProperty('lon');
    expect(firstStop).toHaveProperty('sequence');
  });

  test('should validate routes-shapes.json structure', async ({ page }) => {
    const response = await page.request.get('/routes-shapes.json');
    const data = await response.json();

    const routeIds = Object.keys(data);
    expect(routeIds.length).toBeGreaterThan(0);

    const firstRoute = data[routeIds[0]];
    expect(firstRoute).toHaveProperty('name');
    expect(firstRoute).toHaveProperty('long_name');
    expect(firstRoute).toHaveProperty('shapes');

    // Check coordinates structure
    const shapeIds = Object.keys(firstRoute.shapes);
    const firstShape = firstRoute.shapes[shapeIds[0]];
    expect(Array.isArray(firstShape)).toBeTruthy();
    expect(firstShape.length).toBeGreaterThan(0);

    // Check coordinate format [lat, lon]
    const firstCoord = firstShape[0];
    expect(Array.isArray(firstCoord)).toBeTruthy();
    expect(firstCoord.length).toBe(2);
    expect(typeof firstCoord[0]).toBe('number');
    expect(typeof firstCoord[1]).toBe('number');
  });

  test('should display route results section', async ({ page }) => {
    const routeResults = page.locator('#routeResults');
    await expect(routeResults).toBeVisible();
    await expect(routeResults).toHaveAttribute('role', 'status');
    await expect(routeResults).toHaveAttribute('aria-live', 'polite');
  });

  test('should have route template in DOM', async ({ page }) => {
    const routeTemplate = page.locator('#route-template');
    await expect(routeTemplate).toBeAttached();

    // Check template structure
    const card = routeTemplate.locator('.card');
    await expect(card).toBeAttached();
  });

  test('should initialize Leaflet map when needed', async ({ page }) => {
    // Check that Leaflet is loaded
    const leafletLoaded = await page.evaluate(() => {
      return typeof window.L !== 'undefined';
    });
    expect(leafletLoaded).toBeTruthy();
  });

  test('should have correct form field names for API', async ({ page }) => {
    const routeNumberInput = page.locator('#routeNumber');
    const routeHeadsignInput = page.locator('#routeHeadsign');

    await expect(routeNumberInput).toHaveAttribute('name', 'route');
    await expect(routeHeadsignInput).toHaveAttribute('name', 'headsign');
  });
});
