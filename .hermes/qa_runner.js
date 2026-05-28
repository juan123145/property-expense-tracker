/**
 * QA Runner — visits all pages, captures console errors + terminal logs
 * Called automatically by pipeline.js after a successful build
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = 'C:/Users/M225735/property-expense-tracker';
const SCREENSHOTS_DIR = path.join(PROJECT_DIR, '.hermes', 'screenshots');
const SESSION_DIR = path.join(PROJECT_DIR, '.hermes', 'qa_session');
const PAGES = ['/dashboard', '/properties', '/transactions', '/reports', '/settings'];

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(SESSION_DIR, { recursive: true });

(async () => {
  let context;
  try {
    context = await chromium.launchPersistentContext(SESSION_DIR, {
      headless: true,
      args: ['--no-first-run', '--no-default-browser-check'],
    });
  } catch (e) {
    console.log('❌ Could not launch browser: ' + e.message);
    process.exit(1);
  }

  const page = await context.newPage();
  const allErrors = [];

  page.on('console', m => {
    if (m.type() === 'error') allErrors.push(`[error] ${m.text()}`);
  });
  page.on('pageerror', e => allErrors.push(`[PAGE ERROR] ${e.message}`));
  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.startsWith('chrome-extension') && !url.includes('favicon')) {
      allErrors.push(`[NET FAIL] ${url} — ${req.failure()?.errorText}`);
    }
  });

  // Check if logged in
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 15000 });

  if (page.url().includes('login') || page.url().includes('google')) {
    console.log('⚠️  NOT_LOGGED_IN: QA session needs login. Skipping authenticated tests.');
    await context.close();
    process.exit(0);
  }

  // Visit each page
  for (const route of PAGES) {
    try {
      await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);

      const screenshotPath = path.join(SCREENSHOTS_DIR, `qa${route.replace(/\//g, '_')}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`✅ ${route} → ${await page.title()}`);
    } catch (e) {
      console.log(`❌ FAILED: ${route} | ${e.message}`);
      allErrors.push(`[LOAD FAIL] ${route}: ${e.message}`);
    }
  }

  // Report errors
  if (allErrors.length === 0) {
    console.log('\n🎉 QA PASSED: No errors found across all pages.');
  } else {
    console.log(`\n⚠️  QA ERRORS (${allErrors.length}):`);
    allErrors.forEach(e => console.log(e));
  }

  await context.close();
})();
