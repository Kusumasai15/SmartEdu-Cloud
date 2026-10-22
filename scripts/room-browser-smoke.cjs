const { chromium } = require('playwright');

const appUrl = process.env.PORTAL_TEST_APP_URL || 'http://127.0.0.1:3001';
const apiUrl = process.env.PORTAL_TEST_API_URL || 'http://127.0.0.1:8000/api/v1';
const password = process.env.PORTAL_TEST_ADMIN_PASSWORD;

if (!appUrl.startsWith('http://127.0.0.1:') || !apiUrl.startsWith('http://127.0.0.1:') || !password) {
  throw new Error('This smoke test requires local app/API URLs and PORTAL_TEST_ADMIN_PASSWORD.');
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const roomNumber = `QA-${Date.now().toString().slice(-8)}`;
  let roomId;
  let token;
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.goto(`${appUrl}/login`, { waitUntil: 'networkidle' });
    await page.locator('input[type=email]').fill('admin@smartedu.local');
    await page.locator('input[type=password]').fill(password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/admin*', { waitUntil: 'domcontentloaded', timeout: 60000 });
    token = await page.evaluate(() => sessionStorage.getItem('smartedu_access_token'));
    await page.goto(`${appUrl}/admin?tab=rooms`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Add Classroom / Hall' }).click();
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Create Room' }) });
    await form.getByPlaceholder('e.g. LH-301, Lab-2').fill(roomNumber);
    await form.getByPlaceholder('Building name').fill('QA Building');
    await form.getByPlaceholder('e.g. 3rd Floor, West Wing').fill('Second Floor');
    await form.getByRole('button', { name: 'Create Room' }).click();
    await page.getByText(roomNumber, { exact: true }).first().waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText(roomNumber, { exact: true }).first().waitFor();
    const roomsResponse = await page.request.get(`${apiUrl}/rooms`, { headers: { Authorization: `Bearer ${token}` } });
    if (!roomsResponse.ok()) throw new Error(`Room list failed: ${roomsResponse.status()}`);
    roomId = (await roomsResponse.json()).find((room) => room.room_number === roomNumber)?.id;
    if (!roomId) throw new Error('Room was not persisted in the API.');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow) throw new Error('Room page overflows a 390px viewport.');
    console.log('Admin room create, reload, API persistence, and mobile layout passed.');
  } finally {
    if (token) {
      await browser.newContext().then(async (context) => {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          if (!roomId) {
            const listed = await context.request.get(`${apiUrl}/rooms`, { headers });
            if (listed.ok()) roomId = (await listed.json()).find((room) => room.room_number === roomNumber)?.id;
          }
          if (roomId) {
            const response = await context.request.delete(`${apiUrl}/rooms/${roomId}`, { headers });
            if (!response.ok()) console.error(`Cleanup failed: HTTP ${response.status()}`);
          }
        } finally {
          await context.close();
        }
      });
    }
    await browser.close();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
