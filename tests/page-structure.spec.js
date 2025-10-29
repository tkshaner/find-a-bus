// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Page Structure and Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper page title', async ({ page }) => {
    await expect(page).toHaveTitle('Find A Bus');
  });

  test('should have hero header section', async ({ page }) => {
    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();

    const h1 = hero.locator('h1');
    await expect(h1).toContainText('TheBus Route & Vehicle Explorer');
  });

  test('should have link to TheBus API in hero', async ({ page }) => {
    const apiLink = page.locator('a[href="https://api.thebus.org"]');
    await expect(apiLink).toBeVisible();
    await expect(apiLink).toHaveAttribute('target', '_blank');
    await expect(apiLink).toHaveAttribute('rel', 'noopener');
  });

  test('should load external Leaflet CSS', async ({ page }) => {
    const leafletCSS = page.locator('link[href*="leaflet.css"]');
    await expect(leafletCSS).toBeAttached();
  });

  test('should load Leaflet MarkerCluster CSS', async ({ page }) => {
    const markerClusterCSS = page.locator('link[href*="markercluster"]');
    expect(await markerClusterCSS.count()).toBeGreaterThanOrEqual(2); // Main + Default
  });

  test('should load Leaflet JS library', async ({ page }) => {
    const leafletJS = page.locator('script[src*="leaflet.js"]');
    await expect(leafletJS).toBeAttached();

    // Verify Leaflet is loaded and available
    const leafletAvailable = await page.evaluate(() => typeof window.L !== 'undefined');
    expect(leafletAvailable).toBeTruthy();
  });

  test('should load Leaflet MarkerCluster JS library', async ({ page }) => {
    const markerClusterJS = page.locator('script[src*="leaflet.markercluster.js"]');
    await expect(markerClusterJS).toBeAttached();
  });

  test('should load custom styles.css', async ({ page }) => {
    const customCSS = page.locator('link[href="styles.css"]');
    await expect(customCSS).toBeAttached();
  });

  test('should load app.js as module', async ({ page }) => {
    const appJS = page.locator('script[src="app.js"]');
    await expect(appJS).toBeAttached();
    await expect(appJS).toHaveAttribute('type', 'module');
  });

  test('should have all main sections', async ({ page }) => {
    // Stops map section
    const stopsSection = page.locator('section').filter({
      has: page.locator('#stops-map-title')
    });
    await expect(stopsSection).toBeVisible();

    // Routes section
    const routesSection = page.locator('section').filter({
      has: page.locator('#routes-title')
    });
    await expect(routesSection).toBeVisible();

    // Vehicle section
    const vehicleSection = page.locator('section').filter({
      has: page.locator('#vehicle-title')
    });
    await expect(vehicleSection).toBeVisible();

    // Arrivals section
    const arrivalsSection = page.locator('section').filter({
      has: page.locator('#arrivals-title')
    });
    await expect(arrivalsSection).toBeVisible();
  });

  test('should have usage tips section', async ({ page }) => {
    const usageTips = page.locator('section.panel--info');
    await expect(usageTips).toBeVisible();

    const heading = usageTips.locator('h2');
    await expect(heading).toContainText('Usage Tips');
  });

  test('should have link to get API key in usage tips', async ({ page }) => {
    const apiKeyLink = page.locator('a[href="https://www.honolulutransit.org/"]');
    expect(await apiKeyLink.count()).toBeGreaterThan(0);
  });

  test('should display all sections in main container', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();

    const sections = main.locator('section.panel');
    expect(await sections.count()).toBeGreaterThanOrEqual(5);
  });

  test('should have proper viewport meta tag', async ({ page }) => {
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toBeAttached();
    await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
  });

  test('should have charset meta tag', async ({ page }) => {
    const charsetMeta = page.locator('meta[charset]');
    await expect(charsetMeta).toBeAttached();
    await expect(charsetMeta).toHaveAttribute('charset', 'UTF-8');
  });

  test('should have language attribute on html tag', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
  });

  test('should apply panel styling to sections', async ({ page }) => {
    const panels = page.locator('section.panel');
    const count = await panels.count();
    expect(count).toBeGreaterThan(0);

    // Check first panel has proper styling classes
    const firstPanel = panels.first();
    await expect(firstPanel).toHaveClass(/panel/);
  });

  test('should have all templates in DOM', async ({ page }) => {
    const routeTemplate = page.locator('#route-template');
    const vehicleTemplate = page.locator('#vehicle-template');
    const arrivalTemplate = page.locator('#arrival-template');

    await expect(routeTemplate).toBeAttached();
    await expect(vehicleTemplate).toBeAttached();
    await expect(arrivalTemplate).toBeAttached();
  });

  test('should have proper semantic HTML structure', async ({ page }) => {
    // Header
    const header = page.locator('header.hero');
    await expect(header).toBeVisible();

    // Main content
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Sections with proper headings
    const h2Headings = page.locator('h2');
    expect(await h2Headings.count()).toBeGreaterThan(0);
  });

  test('should render without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Allow some errors for missing API key, but not JavaScript errors
    const jsErrors = errors.filter(e => !e.message.includes('API key'));
    expect(jsErrors.length).toBe(0);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/');

    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
    await page.goto('/');

    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
