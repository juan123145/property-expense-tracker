/**
 * Browser QA with console error capture
 * Navigates all pages, collects console errors, takes screenshots
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_DIR = 'C:/Users/M225735/property-expense-tracker/.hermes/qa_session';
const SCREENSHOTS_DIR = 'C:/Users/M225735/property-expense-tracker/.hermes/screenshots';
const PAGES = ['/dashboard', '/properties', '/transactions', '/reports', '/settings'];

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(SESSION_DIR, { recursive: true });

(async () => {
  let context;
  try {
    context = await chromium.launchPersistentContext(SESSION_DIR, {
      headless: true,
      args: ['--no-first-run'],
    });
  } catch (e) {
    console.log('BROWSER_LAUNCH_FAILED: ' + e.message);
    process.exit(1);
  }

  const page = await context.newPage();
  const pageErrors = {};

  page.on('console', m => {
    const type = m.type();
    const text = m.text();
    const location = m.location();
    
    // Capture errors, warnings, and important logs
    if (['error', 'warning'].includes(type)) {
      console.log(`[${type.toUpperCase()}] ${text}`);
      console.log(`  → ${location.url}:${location.lineNumber}`);
    }
  });

  page.on('pageerror', e => {
    console.log(`[PAGE_ERROR] ${e.message}`);
  });

  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.includes('chrome-extension') && !url.includes('favicon')) {
      console.log(`[NETWORK_FAIL] ${url} | ${req.failure()?.errorText}`);
    }
  });

  // Check if logged in
  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 15000 });

  const finalUrl = page.url();
  console.log(`Current URL: ${finalUrl}`);

  if (finalUrl.includes('/login') || finalUrl.includes('google') || finalUrl.includes('accounts')) {
    console.log('NOT_AUTHENTICATED: Skipping QA test (need to be logged in)');
    await context.close();
    process.exit(0);
  }

  // Navigate each page
  for (const route of PAGES) {
    try {
      console.log(`\n=== TESTING: ${route} ===`);
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);

      const screenshotPath = path.join(SCREENSHOTS_DIR, `qa${route.replace(/\//g, '_')}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const title = await page.title();
      console.log(`✅ ${route} | Title: ${title}`);
    } catch (e) {
      console.log(`❌ FAILED: ${route} | ${e.message}`);
    }
  }

  console.log('\n=== QA COMPLETE ===');
  await context.close();
})();
