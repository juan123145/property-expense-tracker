// QA Test — launches real Chrome with remote debug, uses existing login session
// Screenshots saved to .hermes/screenshots/
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');

const SCREENSHOTS_DIR = 'C:/Users/M225735/property-expense-tracker/.hermes/screenshots';
const ROUTES = ['/dashboard', '/expenses', '/properties', '/reports', '/settings'];

(async () => {
  // Launch a fresh Chrome instance with remote debugging enabled
  // Uses a dedicated QA session folder so it doesn't conflict with your open Chrome
  const sessionDir = 'C:/Users/M225735/property-expense-tracker/.hermes/qa_session';

  const context = await chromium.launchPersistentContext(sessionDir, {
    headless: false,
    channel: 'chrome',
    args: [
      '--profile-directory=Default',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    slowMo: 500,
  });

  const page = await context.newPage();
  const errors = [];

  page.on('console', m => {
    if (m.type() === 'error') errors.push('[error] ' + m.text());
  });
  page.on('pageerror', e => errors.push('[PAGE ERROR] ' + e.message));

  // Check if already logged in
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 20000 });

  // If redirected to login, wait up to 90 seconds for manual login
  if (page.url().includes('login') || page.url().includes('google') || page.url().includes('accounts')) {
    console.log('⚠️  Please log in with Google in the browser window...');
    let waited = 0;
    while ((page.url().includes('login') || page.url().includes('google') || page.url().includes('accounts')) && waited < 90000) {
      await page.waitForTimeout(2000);
      waited += 2000;
      process.stdout.write('.');
    }
    console.log('\n✅ Logged in!');
  }

  // Visit each page and take screenshots
  for (const r of ROUTES) {
    try {
      console.log('Navigating to: ' + r);
      await page.goto('http://localhost:3000' + r, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1500);
      const screenshotPath = SCREENSHOTS_DIR + '/qa' + r.replace(/\//g, '_') + '.png';
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log('✅ ' + r + ' → ' + await page.title());
    } catch (e) {
      console.log('❌ FAILED: ' + r + ' | ' + e.message);
    }
  }

  console.log('\n=== CONSOLE ERRORS (' + errors.length + ') ===');
  if (errors.length === 0) console.log('🎉 No errors found!');
  else errors.forEach(e => console.log(e));

  console.log('\n✅ Done! Screenshots in .hermes/screenshots/');
  await page.waitForTimeout(3000);
  await context.close();
})();
