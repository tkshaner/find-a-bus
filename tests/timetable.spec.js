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

  test('should serve the optional per-route schedule file when generated', async ({ page }) => {
    // schedules/routes/<route>.json is generated offline from GTFS and may be
    // absent. The app must tolerate a 404 (and fall back to the live API view),
    // so we only assert the response is either a valid file or a clean 404.
    const response = await page.request.get('/schedules/routes/1.json');
    expect([200, 404]).toContain(response.status());
  });

  test('per-route schedule files carry per-stop scheduled times', async ({ page }) => {
    const response = await page.request.get('/schedules/routes/1.json');
    if (response.status() === 404) {
      test.skip(true, 'Static schedule not generated in this environment');
      return;
    }
    const data = await response.json();
    expect(data).toHaveProperty('services');

    // Find any service-day with at least one direction block.
    const block = Object.values(data.services)
      .flat()
      .find((b) => Array.isArray(b.stops) && b.stops.length > 0);
    expect(block, 'a direction block with stops').toBeTruthy();

    // Every stop carries an id/name and its own array of scheduled times.
    const stop = block.stops[0];
    expect(stop).toHaveProperty('id');
    expect(stop).toHaveProperty('name');
    expect(Array.isArray(stop.times)).toBe(true);
    expect(stop.times.length).toBeGreaterThan(0);
    // Times are normalized HH:MM.
    expect(stop.times[0]).toMatch(/^\d{2}:\d{2}$/);
  });
});
