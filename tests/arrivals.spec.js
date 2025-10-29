// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Stop Arrivals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display arrivals form', async ({ page }) => {
    const arrivalsForm = page.locator('#arrivalsForm');
    const stopNumberInput = page.locator('#stopNumber');
    const submitButton = arrivalsForm.locator('button[type="submit"]');

    await expect(arrivalsForm).toBeVisible();
    await expect(stopNumberInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText('View Arrivals');
  });

  test('should require stop number field', async ({ page }) => {
    const stopNumberInput = page.locator('#stopNumber');
    await expect(stopNumberInput).toHaveAttribute('required', '');
  });

  test('should have correct form field name for API', async ({ page }) => {
    const stopNumberInput = page.locator('#stopNumber');
    await expect(stopNumberInput).toHaveAttribute('name', 'stop');
  });

  test('should display arrivals results section', async ({ page }) => {
    const arrivalsResults = page.locator('#arrivalsResults');
    await expect(arrivalsResults).toBeVisible();
    await expect(arrivalsResults).toHaveAttribute('role', 'status');
    await expect(arrivalsResults).toHaveAttribute('aria-live', 'polite');
  });

  test('should have arrival template in DOM', async ({ page }) => {
    const arrivalTemplate = page.locator('#arrival-template');
    await expect(arrivalTemplate).toBeAttached();

    const card = arrivalTemplate.locator('.card');
    await expect(card).toBeAttached();

    // Check for expected data fields
    const fields = [
      'route',
      'headsign',
      'stopTime',
      'estimated',
      'vehicle',
      'direction',
      'canceled'
    ];

    for (const field of fields) {
      const dataField = arrivalTemplate.locator(`[data-field="${field}"]`);
      await expect(dataField).toBeAttached();
    }
  });

  test('should display arrivals section header and description', async ({ page }) => {
    const section = page.locator('section').filter({ has: page.locator('#arrivals-title') });
    await expect(section).toBeVisible();

    const title = page.locator('#arrivals-title');
    await expect(title).toContainText('Check Stop Arrivals');

    const description = section.locator('p');
    await expect(description).toContainText('upcoming arrivals');
  });

  test('should have placeholder text for stop number', async ({ page }) => {
    const stopNumberInput = page.locator('#stopNumber');
    await expect(stopNumberInput).toHaveAttribute('placeholder');
    const placeholder = await stopNumberInput.getAttribute('placeholder');
    expect(placeholder).toContain('1'); // Example stop number
  });

  test('should accept numeric input for stop number', async ({ page }) => {
    const stopNumberInput = page.locator('#stopNumber');
    await stopNumberInput.fill('123');
    await expect(stopNumberInput).toHaveValue('123');
  });

  test('should have proper ARIA labels for accessibility', async ({ page }) => {
    const section = page.locator('section').filter({
      has: page.locator('#arrivals-title')
    });
    await expect(section).toHaveAttribute('aria-labelledby', 'arrivals-title');
  });

  test('should have form-grid styling for layout', async ({ page }) => {
    const form = page.locator('#arrivalsForm');
    await expect(form).toHaveClass(/form-grid/);
  });
});
