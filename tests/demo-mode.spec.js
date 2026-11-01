// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Demo Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.reload();
  });

  test('shows the demo invite and hides the banner by default', async ({ page }) => {
    await expect(page.locator('#demoInvite')).toBeVisible();
    await expect(page.locator('#enterDemoBtn')).toBeVisible();
    await expect(page.locator('#demoBanner')).toBeHidden();
  });

  test('entering demo mode reveals the banner and prefills lookups', async ({ page }) => {
    await page.locator('#enterDemoBtn').click();

    await expect(page.locator('#demoBanner')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-demo', 'on');

    // Sample inputs are prefilled for a one-click tour.
    await expect(page.locator('#routeNumber')).toHaveValue('2');
    await expect(page.locator('#stopNumber')).toHaveValue('45');
    await expect(page.locator('#vehicleNumber')).toHaveValue('249');
    await expect(page.locator('#destinationSearch')).toHaveValue('Ala Moana Center');

    // The flag persists in sessionStorage, not localStorage.
    expect(await page.evaluate(() => sessionStorage.getItem('findabus-demo-mode'))).toBe('1');
    expect(await page.evaluate(() => localStorage.getItem('findabus-demo-mode'))).toBeNull();
  });

  test('renders sample arrivals with no API key', async ({ page }) => {
    await page.locator('#enterDemoBtn').click();
    await page.locator('#stopNumber').fill('45');
    await page.locator('#arrivalsForm button[type="submit"]').click();

    const results = page.locator('#arrivalsResults');
    await expect(results.locator('.arrival-card').first()).toBeVisible();
    await expect(results).toContainText('WAIKIKI KAPAHULU');
    await expect(results).toContainText('min');
  });

  test('renders a sample vehicle with no API key', async ({ page }) => {
    await page.locator('#enterDemoBtn').click();
    await page.locator('#vehicleNumber').fill('249');
    await page.locator('#vehicleForm button[type="submit"]').click();

    const results = page.locator('#vehicleResults');
    await expect(results.locator('.vehicle-card').first()).toBeVisible();
    await expect(results).toContainText('249');
  });

  test('exiting demo mode restores key-required behavior', async ({ page }) => {
    await page.locator('#enterDemoBtn').click();
    await expect(page.locator('#demoBanner')).toBeVisible();

    await page.locator('#exitDemoBtn').click();
    await expect(page.locator('#demoBanner')).toBeHidden();
    await expect(page.locator('body')).toHaveAttribute('data-demo', 'off');

    // With demo off and no key, a route search reports the missing key.
    await page.locator('#apiKey').fill('');
    await page.locator('#routeNumber').fill('2');
    await page.locator('#routeForm button[type="submit"]').click();
    await expect(page.locator('#routeResults')).toContainText('API key is required');
  });
});
