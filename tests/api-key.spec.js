// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('API Key Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear storage before each test
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test('should display API key input field as password type', async ({ page }) => {
    const apiKeyInput = page.locator('#apiKey');
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  test('should show/hide API key when toggle button clicked', async ({ page }) => {
    const apiKeyInput = page.locator('#apiKey');
    const toggleButton = page.locator('#toggleKeyVisibility');

    // Initially password type
    await expect(apiKeyInput).toHaveAttribute('type', 'password');

    // Click to show
    await toggleButton.click();
    await expect(apiKeyInput).toHaveAttribute('type', 'text');

    // Click to hide again
    await toggleButton.click();
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  test('should store API key in sessionStorage by default', async ({ page }) => {
    const testKey = 'test-api-key-12345';
    const apiKeyInput = page.locator('#apiKey');

    await apiKeyInput.fill(testKey);
    await apiKeyInput.blur(); // Trigger storage

    const storedKey = await page.evaluate(() => sessionStorage.getItem('find-a-bus-api-key'));
    expect(storedKey).toBe(testKey);

    const localStorageKey = await page.evaluate(() => localStorage.getItem('find-a-bus-api-key'));
    expect(localStorageKey).toBeNull();
  });

  test('should store API key in localStorage when remember me is checked', async ({ page }) => {
    const testKey = 'test-api-key-67890';
    const apiKeyInput = page.locator('#apiKey');
    const rememberCheckbox = page.locator('#rememberKey');

    await rememberCheckbox.check();
    await apiKeyInput.fill(testKey);
    await apiKeyInput.blur();

    const storedKey = await page.evaluate(() => localStorage.getItem('find-a-bus-api-key'));
    expect(storedKey).toBe(testKey);
  });

  test('should clear API key from all storage when clear button clicked', async ({ page }) => {
    const testKey = 'test-api-key-clear';
    const apiKeyInput = page.locator('#apiKey');
    const clearButton = page.locator('#clearKey');

    // Store key in both storages
    await page.evaluate((key) => {
      sessionStorage.setItem('find-a-bus-api-key', key);
      localStorage.setItem('find-a-bus-api-key', key);
    }, testKey);

    // Fill input to show it has value
    await apiKeyInput.fill(testKey);

    // Click clear button
    await clearButton.click();

    // Check input is empty
    await expect(apiKeyInput).toHaveValue('');

    // Check both storages are cleared
    const sessionKey = await page.evaluate(() => sessionStorage.getItem('find-a-bus-api-key'));
    const localKey = await page.evaluate(() => localStorage.getItem('find-a-bus-api-key'));
    expect(sessionKey).toBeNull();
    expect(localKey).toBeNull();
  });

  test('should display security notice', async ({ page }) => {
    const securityNotice = page.locator('.security-notice');
    await expect(securityNotice).toBeVisible();
    await expect(securityNotice).toContainText('Security Notice');
    await expect(securityNotice).toContainText('API key is stored in your browser');
  });

  test('should update help text based on remember me checkbox', async ({ page }) => {
    const helpText = page.locator('#key-help');
    const rememberCheckbox = page.locator('#rememberKey');

    // Default: temporary storage
    await expect(helpText).toContainText('temporarily');

    // Check remember me
    await rememberCheckbox.check();
    await expect(helpText).toContainText('permanently');

    // Uncheck
    await rememberCheckbox.uncheck();
    await expect(helpText).toContainText('temporarily');
  });

  test('should persist API key across page reloads with localStorage', async ({ page }) => {
    const testKey = 'persistent-key-12345';
    const apiKeyInput = page.locator('#apiKey');
    const rememberCheckbox = page.locator('#rememberKey');

    // Store with remember me
    await rememberCheckbox.check();
    await apiKeyInput.fill(testKey);
    await apiKeyInput.blur();

    // Reload page
    await page.reload();

    // Check key is still there
    await expect(apiKeyInput).toHaveValue(testKey);
  });
});
