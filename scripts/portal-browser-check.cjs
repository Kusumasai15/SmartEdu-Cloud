const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

// Run only against an isolated test database with the development seed accounts.
const appUrl = process.env.PORTAL_TEST_APP_URL || 'http://localhost:3001';
const apiUrl = process.env.PORTAL_TEST_API_URL || 'http://127.0.0.1:8001/api/v1';
const portals = {
  student: ['student1@smartedu.local', ['', 'courses', 'assignments', 'results', 'attendance', 'schedule', 'notifications', 'catalog']],
  faculty: ['faculty1@smartedu.local', ['', 'modules', 'assignments', 'gradebook', 'attendance', 'timetable', 'at-risk']],
  admin: ['admin@smartedu.local', ['', 'users', 'departments', 'courses', 'rooms', 'terms', 'policies', 'audit', 'timetable']],
  hod: ['hod.cse@smartedu.local', ['', 'courses', 'students', 'faculty', 'approvals', 'modules', 'at-risk', 'timetable', 'disputes']],
  vc: ['vc@smartedu.local', ['', 'curriculum', 'students', 'faculty', 'analytics', 'approvals', 'intelligence', 'timetable']],
};

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const reports = [];
  const output = path.resolve('test-results/portals');
  fs.mkdirSync(output, { recursive: true });
  try {
    for (const [portal, [email, tabs]] of Object.entries(portals)) {
      const login = await fetch(`${apiUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'DevPassword123!' }) });
      if (!login.ok) throw new Error(`Test login failed for ${portal}: ${login.status}`);
      const { data: tokens } = await login.json();
      for (const width of [1440, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        await context.addInitScript(tokens => {
          sessionStorage.setItem('smartedu_access_token', tokens.access_token);
          sessionStorage.setItem('smartedu_refresh_token', tokens.refresh_token);
        }, tokens);
        // Forward requests to the real isolated test API; do not fabricate responses.
        await context.route('**/api/v1/**', route => route.continue({ url: apiUrl + new URL(route.request().url()).pathname.split('/api/v1')[1] + new URL(route.request().url()).search }));
        const page = await context.newPage();
        let errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (response.url().includes('/api/v1/') && response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
        for (const tab of tabs) {
          errors = [];
          const url = `${appUrl}/${portal}${tab ? `?tab=${tab}` : ''}`;
          await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
          await page.waitForTimeout(400);
          const state = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            bodyWidth: document.documentElement.scrollWidth,
            textLength: document.querySelector('main')?.textContent?.trim().length || 0,
          }));
          if (!tab) await page.screenshot({ path: path.join(output, `${portal}-${width}.png`), fullPage: true });
          reports.push({ portal, tab: tab || 'overview', width, ...state, errors: [...new Set(errors)], url: page.url() });
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(reports, null, 2));
  }
  const failures = reports.filter(row => row.overflow || row.textLength < 30 || row.errors.length || row.url.includes('/login'));
  console.log(JSON.stringify({ screens: reports.length, failures }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
