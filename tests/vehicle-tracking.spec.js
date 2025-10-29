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
      'trip'
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
});
