const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('**/routeJSON/**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ route: [{ routeNum: '2', headsign: 'Test route' }] })
  }));
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.L));
  await page.evaluate(() => {
    L.Map.addInitHook(function () {
      if (this.getContainer().id === 'routeMapCanvas') window.testRouteMap = this;
    });
  });
  await page.fill('#apiKey', 'test-key-12345');
  await page.fill('#routeNumber', '2');
  await page.click('#routeForm button[type="submit"]');
  await expect(page.locator('#routeMap')).toBeVisible();
});

async function expectFitted(page) {
  await expect.poll(() => page.evaluate(() => {
    const map = window.testRouteMap;
    if (!map) return false;
    let bounds;
    map.eachLayer(layer => { if (layer instanceof L.Polyline) bounds = layer.getBounds(); });
    if (!bounds) return false;
    const size = map.getSize();
    const nw = map.latLngToContainerPoint(bounds.getNorthWest());
    const se = map.latLngToContainerPoint(bounds.getSouthEast());
    const expectedZoom = Math.min(16, map.getBoundsZoom(bounds, false, L.point(64, 64)));
    return nw.x >= 30 && nw.y >= 30 && se.x <= size.x - 30 &&
      se.y <= size.y - 30 && map.getZoom() === expectedZoom;
  })).toBe(true);
}

test('fits the route on first display and after viewport resize', async ({ page }) => {
  await expectFitted(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectFitted(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expectFitted(page);
});

test('defers a hidden variant fit and preserves manual zoom across tabs', async ({ page }) => {
  await expectFitted(page);
  await page.click('#routeViewTableBtn');
  await page.selectOption('#variantSelect', { index: 1 });
  await page.click('#routeViewMapBtn');
  await expectFitted(page);
  // Simulate rider zoom, then ensure a tab round trip does not reset it.
  await page.evaluate(() => window.testRouteMap.zoomIn(1, { animate: false }));
  const zoom = await page.evaluate(() => window.testRouteMap.getZoom());
  await page.click('#routeViewTimetableBtn');
  await page.click('#routeViewMapBtn');
  await expect.poll(() => page.evaluate(() => window.testRouteMap.getZoom())).toBe(zoom);
});
