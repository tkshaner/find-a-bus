// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Route Timetable', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should include a Timetable tab in the route view toggle', async ({ page }) => {
    const timetableBtn = page.locator('#routeViewTimetableBtn');
    await expect(timetableBtn).toBeAttached();
    await expect(timetableBtn).toContainText('Timetable');
    await expect(timetableBtn).toHaveAttribute('role', 'tab');
    await expect(timetableBtn).toHaveAttribute('aria-selected', 'false');
  });

  test('should have the timetable container hidden initially', async ({ page }) => {
    const timetable = page.locator('#routeTimetable');
    await expect(timetable).toBeAttached();
    await expect(timetable).toBeHidden();
    await expect(timetable).toHaveAttribute('role', 'tabpanel');
  });

  test('should expose three route views (map, table, timetable)', async ({ page }) => {
    const toggle = page.locator('#routeViewToggle');
    const tabs = toggle.locator('button[role="tab"]');
    await expect(tabs).toHaveCount(3);
  });

  test('should serve the optional planned timetable file when generated', async ({ page }) => {
    // route-timetable.json is generated offline from GTFS and may be absent.
    // The app must tolerate a 404 (and fall back to the live API view), so we
    // only assert the response is either a valid file or a clean 404.
    const response = await page.request.get('/route-timetable.json');
    expect([200, 404]).toContain(response.status());
  });
});
