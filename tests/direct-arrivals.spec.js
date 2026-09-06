const { test, expect } = require('@playwright/test');

const xml = (date = '9/6/2026', time = '12:05 AM', flag = '0') => `<?xml version="1.0"?><stopTimes><stop>45</stop><timestamp>9/5/2026 11:55 PM</timestamp><errorMessage></errorMessage><arrival><id>0001</id><route>2</route><headsign>Waikiki &amp; Kahala</headsign><vehicle>249</vehicle><date>${date}</date><stopTime>${time}</stopTime><estimated>${flag}</estimated><canceled>0</canceled></arrival></stopTimes>`;
async function start(page, body) {
  await page.route('https://api.thebus.org/arrivals/**', route => route.fulfill({ contentType: 'text/xml', body }));
  await page.goto('/');
  await page.fill('#apiKey', 'test-key-12345');
}

for (const timezoneId of ['Pacific/Honolulu', 'America/New_York', 'Asia/Tokyo']) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId });
    test('normalizes XML and calculates midnight waits independent of viewer timezone', async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-09-06T09:55:00Z'));
      await start(page, xml());
      await page.check('#usePublicProxy');
      const proxies = [];
      page.on('request', req => { if (req.url().includes('corsproxy.io')) proxies.push(req.url()); });
      await page.fill('#stopNumber', '45');
      await page.click('#arrivalsForm button[type="submit"]');
      await expect(page.locator('#arrivalsResults')).toContainText('10 min');
      await expect(page.locator('#arrivalsResults')).toContainText('Scheduled only');
      await expect(page.locator('#arrivalsResults')).toContainText('Waikiki & Kahala');
      expect(proxies).toHaveLength(0);
    });
  });
}

for (const [date, time, expected] of [
  ['9/6/2026', '12:00 PM', 'Due'],
  ['9/6/2026', '5:00 PM', '300 min'],
  ['2/30/2026', '5:00 PM', '5:00 PM']
]) {
  test(`arrival clock ${date} ${time} renders ${expected}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-06T22:00:00Z'));
    await start(page, xml(date, time, '1'));
    await page.fill('#stopNumber', '45');
    await page.click('#arrivalsForm button[type="submit"]');
    await expect(page.locator('#arrivalsResults')).toContainText(expected);
    await expect(page.locator('#arrivalsResults')).toContainText('Real-time update');
  });
}

for (const [body, message] of [
  ['<stopTimes><stop>45</stop></stopTimes>', 'No upcoming arrivals'],
  ['<stopTimes><errorMessage>Invalid key test-key-12345</errorMessage></stopTimes>', 'API error'],
  ['<vehicles/>', 'unexpected response format'],
  ['<stopTimes><arrival>', 'unexpected response format']
]) {
  test(`XML result: ${message} ${body}`, async ({ page }) => {
    await start(page, body);
    await page.fill('#stopNumber', '45');
    await page.click('#arrivalsForm button[type="submit"]');
    await expect(page.locator('#arrivalsResults')).toContainText(message);
    await expect(page.locator('#arrivalsResults')).not.toContainText('test-key-12345');
  });
}

test('destination arrivals use direct XML and show normalized waits', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-06T09:55:00Z'));
  await page.route('**/stops.json', route => route.fulfill({ json: [{ id: '45', code: '45', name: 'Test stop', lat: 21.3, lon: -157.85 }] }));
  await start(page, xml());
  await page.fill('#proxyTemplate', 'invalid-template');
  await page.fill('#destinationSearch', '21.3, -157.85');
  await page.click('#towardDestinationForm button[type="submit"]');
  await expect(page.locator('#towardDestinationResults')).toContainText('10 min');
  await expect(page.locator('#towardDestinationResults')).toContainText('Waikiki & Kahala');
});

test('live timetable falls back to direct XML when static schedule is absent', async ({ page }) => {
  await page.route('**/routeJSON/**', route => route.fulfill({ json: { route: [{ routeNum: '2' }] } }));
  await page.route('**/schedules/routes/2.json', route => route.fulfill({ status: 404, body: '' }));
  await start(page, xml());
  await page.fill('#routeNumber', '2');
  await page.click('#routeForm button[type="submit"]');
  await page.click('#routeViewTimetableBtn');
  await expect(page.locator('#routeTimetable')).toContainText('12:05 AM');
  await expect(page.locator('#routeTimetable')).toContainText('Scheduled');
});

test('vehicle lookup without a proxy explains required setup without making a request', async ({ page }) => {
  const requests = [];
  await start(page, xml());
  page.on('request', req => { if (req.url().includes('api.thebus.org')) requests.push(req.url()); });
  await page.fill('#vehicleNumber', '249');
  await page.click('#vehicleForm button[type="submit"]');
  await expect(page.locator('#vehicleResults')).toContainText('Vehicle lookup requires a trusted proxy');
  expect(requests).toHaveLength(0);
});
