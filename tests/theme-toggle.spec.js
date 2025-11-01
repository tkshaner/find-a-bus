// @ts-check
const { test, expect } = require('@playwright/test');

const iconForTheme = (theme) => (theme === 'dark' ? '🌙' : '🌞');

/**
 * Determine the next theme the toggle should switch to based on the current
 * theme that is applied to the document element.
 * @param {string|null} currentTheme
 */
const nextTheme = (currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark');

test.describe('Theme toggle accessibility and behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('updates text, icon, and document theme attribute', async ({ page }) => {
    const html = page.locator('html');
    const toggle = page.locator('#themeToggle');
    const label = toggle.locator('[data-theme-label]');
    const icon = toggle.locator('[data-theme-icon]');

    const initialTheme = await html.getAttribute('data-theme');
    const initialNextTheme = nextTheme(initialTheme);

    await expect(label).toHaveText(`Switch to ${initialNextTheme} mode`);
    await expect(icon).toHaveText(iconForTheme(initialNextTheme));

    await toggle.click();

    const toggledTheme = await html.getAttribute('data-theme');
    expect(toggledTheme).toBe(initialNextTheme);

    const toggledNextTheme = nextTheme(toggledTheme);
    await expect(label).toHaveText(`Switch to ${toggledNextTheme} mode`);
    await expect(icon).toHaveText(iconForTheme(toggledNextTheme));
  });
});
