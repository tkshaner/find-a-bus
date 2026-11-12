const { test, expect } = require('@playwright/test');

async function setup(page, proxy = true) {
  await page.goto('/');
  await page.fill('#apiKey', 'test-key-private-12345');
  if (proxy) await page.fill('#proxyTemplate', 'https://proxy.example/?url={url}');
}

const lookups = [
  { name: 'route', input: '#routeNumber', value: '2', form: '#routeForm', result: '#routeResults', endpoint: '/routeJSON/' },
  { name: 'arrivals', input: '#stopNumber', value: '45', form: '#arrivalsForm', result: '#arrivalsResults', endpoint: '/arrivals/' },
  { name: 'vehicle', input: '#vehicleNumber', value: '249', form: '#vehicleForm', result: '#vehicleResults', endpoint: '/vehicle/' },
  { name: 'destination', input: '#destinationSearch', value: '21.3, -157.85', form: '#towardDestinationForm', result: '#towardDestinationResults', endpoint: '/arrivals/' }
];

for (const lookup of lookups) {
  test(`${lookup.name} preserves 401 using its designated transport without exposing secrets`, async ({ page }) => {
    let direct = 0;
    const requests = [];
    await page.route('https://api.thebus.org/**', route => { direct++; requests.push(route.request()); return route.fulfill({ status: 401, body: 'Unauthorized' }); });
    await page.route('https://proxy.example/**', route => {
      requests.push(route.request());
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Invalid key test-key-private-12345', status: 401 } }) });
    });
    await page.route('**/stops.json', route => route.fulfill({ json: [{ id: '45', code: '45', name: 'Test stop', lat: 21.3, lon: -157.85 }] }));
    await setup(page);
    await page.fill(lookup.input, lookup.value);
    await page.click(`${lookup.form} button[type="submit"]`);
    const result = page.locator(lookup.result);
    await expect(result).toContainText('HTTP 401');
    await expect(result).toContainText(lookup.endpoint);
    await expect(result).toContainText(lookup.name === 'vehicle' ? 'rejected by the proxy or TheBus upstream' : 'TheBus rejected authentication');
    await expect(result).not.toContainText('test-key-private-12345');
    expect(direct).toBe(lookup.name === 'vehicle' ? 0 : 1);
    expect(requests).toHaveLength(1);
    expect(requests[0].headers()['x-requested-with']).toBeUndefined();
    const upstream = lookup.name === 'vehicle' ? new URL(new URL(requests[0].url()).searchParams.get('url')) : new URL(requests[0].url());
    expect(upstream.pathname).toBe(lookup.endpoint);
    expect(upstream.searchParams.get('key')).toBe('test-key-private-12345');
  });
}

test('direct 401 remains an authentication failure', async ({ page }) => {
  await page.route('https://api.thebus.org/**', route => route.fulfill({ status: 401, body: 'Unauthorized' }));
  await setup(page, false);
  await page.fill('#stopNumber', '45');
  await page.click('#arrivalsForm button[type="submit"]');
  await expect(page.locator('#arrivalsResults')).toContainText('TheBus rejected authentication');
  await expect(page.locator('#arrivalsResults')).not.toContainText('CORS');
});

for (const status of [403, 429, 502]) {
  test(`vehicle preserves HTTP ${status}`, async ({ page }) => {
    await page.route('https://proxy.example/**', route => route.fulfill({ status, body: 'Error' }));
    await setup(page);
    await page.fill('#vehicleNumber', '249');
    await page.click('#vehicleForm button[type="submit"]');
    await expect(page.locator('#vehicleResults')).toContainText(`HTTP ${status}`);
  });
}

test('network failure is distinguished from HTTP failure', async ({ page }) => {
  await page.route('https://api.thebus.org/**', route => route.abort('failed'));
  await setup(page);
  await page.fill('#stopNumber', '45');
  await page.click('#arrivalsForm button[type="submit"]');
  await expect(page.locator('#arrivalsResults')).toContainText('could not reach or read TheBus response');
});

for (const body of ['<html>Login page</html>', '<unexpected/>', '<vehicles><vehicle>']) {
  test(`rejects unexpected vehicle response ${body}`, async ({ page }) => {
    await page.route('https://proxy.example/**', route => route.fulfill({ status: 200, body }));
    await setup(page);
    await page.fill('#vehicleNumber', '249');
    await page.click('#vehicleForm button[type="submit"]');
    await expect(page.locator('#vehicleResults')).toContainText('unexpected response format');
  });
}

test('vehicle lookup without a proxy explains how to set one up', async ({ page }) => {
  let calls = 0;
  await page.route('https://api.thebus.org/**', route => { calls++; return route.abort(); });
  await setup(page, false);
  await page.fill('#vehicleNumber', '249');
  await page.click('#vehicleForm button[type="submit"]');
  await expect(page.locator('#vehicleResults')).toContainText('fab-proxy');
  expect(calls).toBe(0);
});

test('legacy public proxy setting is cleared and never contacts corsproxy.io', async ({ page }) => {
  const contacted = [];
  page.on('request', req => { if (req.url().includes('corsproxy.io')) contacted.push(req.url()); });
  await page.addInitScript(() => window.localStorage.setItem('thebus-use-public-proxy', 'true'));
  await setup(page, false);
  await expect(page.locator('#usePublicProxy')).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem('thebus-use-public-proxy'))).toBeNull();
  await page.fill('#vehicleNumber', '249');
  await page.click('#vehicleForm button[type="submit"]');
  await expect(page.locator('#vehicleResults')).toContainText('requires a proxy');
  expect(contacted).toHaveLength(0);
});

test('configured custom proxy is used on localhost and accepts empty XML vehicle data', async ({ page }) => {
  let calls = 0;
  await page.route('https://proxy.example/**', route => {
    calls++;
    return route.fulfill({ contentType: 'application/xml', body: '<vehicles></vehicles>' });
  });
  await setup(page, false);
  await page.fill('#proxyTemplate', 'https://proxy.example/?url={url}');
  await page.fill('#vehicleNumber', '249');
  await page.click('#vehicleForm button[type="submit"]');
  await expect(page.locator('#vehicleResults')).toContainText('No vehicle data available');
  expect(calls).toBe(1);
});


test('a stalled request times out with a safe diagnostic', async ({ page }) => {
  await page.clock.install();
  let started;
  const requested = new Promise(resolve => { started = resolve; });
  await page.route('https://api.thebus.org/**', () => { started(); });
  await setup(page);
  await page.fill('#stopNumber', '45');
  await page.click('#arrivalsForm button[type="submit"]');
  await requested;
  await page.clock.fastForward(20001);
  await expect(page.locator('#arrivalsResults')).toContainText('request timed out');
});

for (const body of ['<html>Login</html>', '{broken', 'null', '{"errorMessage":"test-key-private-12345"}']) {
  test(`JSON failures do not leak response content: ${body}`, async ({ page }) => {
    await page.route('https://api.thebus.org/**', route => route.fulfill({ body }));
    await setup(page);
    await page.fill('#routeNumber', '2');
    await page.click('#routeForm button[type="submit"]');
    await expect(page.locator('#routeResults .error-state')).toBeVisible();
    await expect(page.locator('#routeResults')).not.toContainText('test-key-private-12345');
  });
}
