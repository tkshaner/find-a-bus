// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Vehicle Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display vehicle tracking form', async ({ page }) => {
    const vehicleForm = page.locator('#vehicleForm');
    const vehicleNumberInput = page.locator('#vehicleNumber');
    const submitButton = vehicleForm.locator('button[type="submit"]');

    await expect(vehicleForm).toBeVisible();
    await expect(vehicleNumberInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText('Get Vehicle Info');
  });

  test('should require vehicle number field', async ({ page }) => {
    const vehicleNumberInput = page.locator('#vehicleNumber');
    await expect(vehicleNumberInput).toHaveAttribute('required', '');
  });

  test('should have correct form field name for API', async ({ page }) => {
    const vehicleNumberInput = page.locator('#vehicleNumber');
    await expect(vehicleNumberInput).toHaveAttribute('name', 'num');
  });

  test('should display vehicle map container initially hidden', async ({ page }) => {
    const vehicleMapContainer = page.locator('#vehicleMap');
    await expect(vehicleMapContainer).toBeHidden();
  });

  test('should display vehicle results section', async ({ page }) => {
    const vehicleResults = page.locator('#vehicleResults');
    await expect(vehicleResults).toBeVisible();
    await expect(vehicleResults).toHaveAttribute('role', 'status');
    await expect(vehicleResults).toHaveAttribute('aria-live', 'polite');
  });

  test('should have vehicle template in DOM', async ({ page }) => {
    const vehicleTemplate = page.locator('#vehicle-template');
    await expect(vehicleTemplate).toBeAttached();

    const card = vehicleTemplate.locator('.card');
    await expect(card).toBeAttached();

    // Check for expected data fields
    const fields = [
      'number',
      'route_short_name',
      'headsign',
      'adherence',
      'driver',
      'last_message',
      'latitude',
      'longitude',
      'trip',
      'trip_details'
    ];

    for (const field of fields) {
      const dataField = vehicleTemplate.locator(`[data-field="${field}"]`);
      await expect(dataField).toBeAttached();
    }
  });

  test('should display vehicle section header and description', async ({ page }) => {
    const section = page.locator('section').filter({ has: page.locator('#vehicle-title') });
    await expect(section).toBeVisible();

    const title = page.locator('#vehicle-title');
    await expect(title).toContainText('Track a Vehicle');

    const description = section.locator('p');
    await expect(description).toContainText('bus number');
  });

  test('should have placeholder text for vehicle number', async ({ page }) => {
    const vehicleNumberInput = page.locator('#vehicleNumber');
    await expect(vehicleNumberInput).toHaveAttribute('placeholder');
    const placeholder = await vehicleNumberInput.getAttribute('placeholder');
    expect(placeholder).toContain('249'); // Example vehicle number
  });

  test('should accept numeric input for vehicle number', async ({ page }) => {
    const vehicleNumberInput = page.locator('#vehicleNumber');
    await vehicleNumberInput.fill('249');
    await expect(vehicleNumberInput).toHaveValue('249');
  });

  test('should have map canvas element for vehicle tracking', async ({ page }) => {
    const vehicleMapCanvas = page.locator('#vehicleMapCanvas');
    await expect(vehicleMapCanvas).toBeAttached();
    await expect(vehicleMapCanvas).toHaveClass(/map-canvas/);
  });

  test('should initialize vehicle map when Leaflet loads', async ({ page }) => {
    // Check Leaflet is available
    const leafletLoaded = await page.evaluate(() => {
      return typeof window.L !== 'undefined';
    });
    expect(leafletLoaded).toBeTruthy();
  });

  test('should link vehicle route and headsign to route search', async ({ page }) => {
    await page.route('**/vehicle/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/xml',
        body: `<?xml version="1.0" encoding="UTF-8"?>
          <response>
            <timestamp>2026-04-17T00:00:00Z</timestamp>
            <vehicle>
              <number>249</number>
              <route_short_name>2</route_short_name>
              <headsign>SCHOOL ST-MIDDLE</headsign>
              <latitude>21.3099</latitude>
              <longitude>-157.8581</longitude>
            </vehicle>
          </response>`
      });
    });

    await page.route('**/trip/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ trip: [{ route: '2', headsign: 'SCHOOL ST-MIDDLE' }] })
      });
    });

    let routeSearchCount = 0;
    await page.route('**/routeJSON/**', async (route) => {
      routeSearchCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: [
            {
              routeNum: '2',
              headsign: 'SCHOOL ST-MIDDLE',
              firstStop: 'ALAPAI TRANSIT CENTER',
              shapeID: 'shape-1'
            }
          ]
        })
      });
    });

    await page.fill('#apiKey', 'test-key-12345');
    await page.fill('#vehicleNumber', '249');
    await page.click('#vehicleForm button[type="submit"]');

    const routeLink = page.locator('#vehicleResults [data-field="route_short_name"] a');
    const headsignLink = page.locator('#vehicleResults [data-field="headsign"] a');
    await expect(routeLink).toBeVisible();
    await expect(headsignLink).toBeVisible();

    await routeLink.click();

    await expect(page.locator('#routeNumber')).toHaveValue('2');
    await expect(page.locator('#routeHeadsign')).toHaveValue('SCHOOL ST-MIDDLE');
    await expect(page.locator('#routeResults .card')).toBeVisible();
    expect(routeSearchCount).toBe(1);
  });
});
