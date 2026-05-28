// QA Test — uses your real Chrome executable with a separate session folder
// No conflict with your existing Chrome, and Google won't block login
const { chromium } = require('playwright');

(async () => {
  const sessionDir = 'C:/Users/M225735/property-expense-tracker/qa_session';

  console.log('Opening Chrome for QA session...');

  const context = await chromium.launchPersistentContext(sessionDir, {
    headless: false,
    channel: 'chrome',  // uses your real installed Chrome
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled', // hides automation flag
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await context.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 20000 });
  console.log('Browser open at: ' + page.url());
  console.log('Please sign in with Google. Session will be saved automatically.');
  console.log('Waiting... (tell Hermes when done)');

  // Keep open indefinitely until you say so
  await new Promise(() => {});
})();
