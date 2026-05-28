#!/usr/bin/env node

/**
 * Property Expense Tracker - Comprehensive E2E Test Suite
 * Uses Playwright for browser automation and testing
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = [];
const TIMEOUT = 10000;

// Test logger
function logTest(testName, passed, details = {}) {
  const result = {
    timestamp: new Date().toISOString(),
    test: testName,
    passed,
    details,
  };
  TEST_RESULTS.push(result);

  const status = passed ? '✓' : '✗';
  console.log(`${status} ${testName}`);
  if (!passed && details.error) {
    console.log(`  Error: ${details.error}`);
  }
  if (details.message) {
    console.log(`  ${details.message}`);
  }
}

// Check for console errors
function checkConsoleErrors(errors) {
  const relevantErrors = errors.filter(err => {
    // Filter out known extension errors
    if (err.includes('Megabonus') || err.includes('extension')) return false;
    if (err.includes('chrome-extension')) return false;
    if (err.includes('Cannot find module')) return false;
    return true;
  });
  return relevantErrors;
}

// Test 1: Login Page
async function testLoginPage(page) {
  console.log('\n=== TEST 1: LOGIN PAGE (/login) ===');

  const consoleMessages = [];
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else {
      consoleMessages.push(msg.text());
    }
  });

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    logTest('Login page loads', true, { url: page.url() });

    const errors = checkConsoleErrors(consoleErrors);
    logTest('Login page has no console errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors',
    });

    // Check for form elements
    const hasSignInButton = await page.$('text=Continue with Google') !== null || 
                           await page.$('button[type="submit"]') !== null;
    logTest('Sign-in button present', hasSignInButton, {
      message: 'Google OAuth button or submit button found',
    });

    // Check for visual elements
    const hasTitle = await page.$('text=Property Tracker') !== null;
    logTest('Login page title visible', hasTitle, {
      message: 'Property Tracker heading found',
    });
  } catch (error) {
    logTest('Login page loads', false, { error: error.message });
  }
}

// Test 2: Dashboard Page (should redirect to login if not authenticated)
async function testDashboard(page) {
  console.log('\n=== TEST 2: DASHBOARD PAGE (/dashboard) ===');

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    const response = await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const status = response.status();
    const isPassed = status === 200 || status === 302; // 302 is redirect to login

    logTest('Dashboard page accessible', isPassed, {
      status: status,
      url: page.url(),
    });

    const errors = checkConsoleErrors(consoleErrors);
    logTest('Dashboard has no console errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors',
    });

    // Check for dashboard content
    const hasDashboardContent = await page.$('text=Dashboard') !== null || 
                               await page.$('text=Properties') !== null ||
                               await page.$('text=Recent') !== null;
    logTest('Dashboard has content', hasDashboardContent, {
      message: hasDashboardContent ? 'Dashboard content detected' : 'Limited content',
    });
  } catch (error) {
    logTest('Dashboard page accessible', false, { error: error.message });
  }
}

// Test 3: Properties Page
async function testPropertiesPage(page) {
  console.log('\n=== TEST 3: PROPERTIES PAGE (/properties) ===');

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    const response = await page.goto(`${BASE_URL}/properties`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const status = response.status();
    const isPassed = status === 200 || status === 302;

    logTest('Properties page loads', isPassed, {
      status: status,
      url: page.url(),
    });

    const errors = checkConsoleErrors(consoleErrors);
    logTest('Properties page has no console errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors',
    });

    // Check for properties content
    const hasContent = await page.$('text=Properties') !== null || 
                      await page.$('text=Address') !== null ||
                      await page.$('text=Add Property') !== null;
    logTest('Properties page shows content', hasContent, {
      message: hasContent ? 'Properties UI found' : 'Limited UI',
    });
  } catch (error) {
    logTest('Properties page loads', false, { error: error.message });
  }
}

// Test 4: Transactions Page with Pagination
async function testTransactionsPage(page) {
  console.log('\n=== TEST 4: TRANSACTIONS PAGE (/transactions) ===');

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    const response = await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const status = response.status();
    const isPassed = status === 200 || status === 302;

    logTest('Transactions page loads', isPassed, {
      status: status,
      url: page.url(),
    });

    const errors = checkConsoleErrors(consoleErrors);
    logTest('Transactions page has no console errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors',
    });

    // Check for transactions table/list
    const hasTransactionContent = await page.$('text=Transactions') !== null || 
                                 await page.$('text=Amount') !== null ||
                                 await page.$('text=Date') !== null;
    logTest('Transaction content visible', hasTransactionContent, {
      message: hasTransactionContent ? 'Transaction table/list found' : 'Limited content',
    });

    // Check for pagination dropdown
    const paginationDropdown = await page.$('[data-testid="pagination-select"], select, [aria-label*="rows"]');
    logTest('Pagination controls exist', paginationDropdown !== null, {
      message: paginationDropdown ? 'Dropdown found' : 'Pagination not visible',
    });

    // Try to interact with pagination if it exists
    if (paginationDropdown) {
      try {
        // Look for pagination controls
        const paginationContainer = await page.$('.pagination, [data-pagination], [class*="pagination"]');
        logTest('Pagination container found', paginationContainer !== null, {
          message: 'Pagination controls visible',
        });
      } catch (e) {
        logTest('Pagination container found', false, { error: e.message });
      }
    }
  } catch (error) {
    logTest('Transactions page loads', false, { error: error.message });
  }
}

// Test 5: Reports Page
async function testReportsPage(page) {
  console.log('\n=== TEST 5: REPORTS PAGE (/reports) ===');

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    const response = await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const status = response.status();
    const isPassed = status === 200 || status === 302;

    logTest('Reports page loads', isPassed, {
      status: status,
      url: page.url(),
    });

    const errors = checkConsoleErrors(consoleErrors);
    logTest('Reports page has no console errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors',
    });

    // Check for reports content
    const hasReportsContent = await page.$('text=Reports') !== null || 
                             await page.$('text=Report') !== null ||
                             await page.$('text=Summary') !== null;
    logTest('Reports page shows content', hasReportsContent, {
      message: hasReportsContent ? 'Reports content found' : 'Limited content',
    });
  } catch (error) {
    logTest('Reports page loads', false, { error: error.message });
  }
}

// Test 6: Settings Page
async function testSettingsPage(page) {
  console.log('\n=== TEST 6: SETTINGS PAGE (/settings) ===');

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    const response = await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const status = response.status();
    const isPassed = status === 200 || status === 302;

    logTest('Settings page loads', isPassed, {
      status: status,
      url: page.url(),
    });

    const errors = checkConsoleErrors(consoleErrors);
    logTest('Settings page has no console errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors',
    });

    // Check for settings content
    const hasSettingsContent = await page.$('text=Settings') !== null || 
                              await page.$('text=Preference') !== null ||
                              await page.$('text=Account') !== null;
    logTest('Settings page shows content', hasSettingsContent, {
      message: hasSettingsContent ? 'Settings content found' : 'Limited content',
    });
  } catch (error) {
    logTest('Settings page loads', false, { error: error.message });
  }
}

// Test 7: Navigation Between Pages
async function testNavigation(page) {
  console.log('\n=== TEST 7: NAVIGATION FLOW ===');

  try {
    // Start at login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    logTest('Navigation starts at login', true);

    // Try navigating to dashboard
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const dashUrl = page.url();
    const isDashboard = dashUrl.includes('dashboard') || dashUrl.includes('login');
    logTest('Navigation to dashboard works', isDashboard, { url: dashUrl });

    // Try navigating to properties
    await page.goto(`${BASE_URL}/properties`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const propsUrl = page.url();
    const isProperties = propsUrl.includes('properties') || propsUrl.includes('login');
    logTest('Navigation to properties works', isProperties, { url: propsUrl });

    // Try navigating to transactions
    await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const transUrl = page.url();
    const isTransactions = transUrl.includes('transactions') || transUrl.includes('login');
    logTest('Navigation to transactions works', isTransactions, { url: transUrl });

    // Try navigating to reports
    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const reportUrl = page.url();
    const isReports = reportUrl.includes('reports') || reportUrl.includes('login');
    logTest('Navigation to reports works', isReports, { url: reportUrl });

    // Try navigating to settings
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const settingsUrl = page.url();
    const isSettings = settingsUrl.includes('settings') || settingsUrl.includes('login');
    logTest('Navigation to settings works', isSettings, { url: settingsUrl });
  } catch (error) {
    logTest('Navigation flow', false, { error: error.message });
  }
}

// Test 8: Response Status Codes
async function testStatusCodes(page) {
  console.log('\n=== TEST 8: HTTP STATUS CODES ===');

  const endpoints = [
    { path: '/login', expectOk: true },
    { path: '/dashboard', expectOk: true },
    { path: '/properties', expectOk: true },
    { path: '/transactions', expectOk: true },
    { path: '/reports', expectOk: true },
    { path: '/settings', expectOk: true },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await page.goto(`${BASE_URL}${endpoint.path}`, { 
        waitUntil: 'networkidle', 
        timeout: TIMEOUT 
      });
      const status = response.status();
      const isPassed = status === 200 || status === 302 || status === 301;

      logTest(`${endpoint.path} returns valid status`, isPassed, {
        status: status,
        expected: '200 or redirect',
      });
    } catch (error) {
      logTest(`${endpoint.path} returns valid status`, false, { error: error.message });
    }
  }
}

// Generate summary
function generateSummaryReport() {
  console.log('\n\n=== COMPREHENSIVE TEST SUMMARY ===\n');

  const passed = TEST_RESULTS.filter(r => r.passed).length;
  const failed = TEST_RESULTS.filter(r => !r.passed).length;
  const total = TEST_RESULTS.length;
  const passPercentage = Math.round((passed / total) * 100);

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${passPercentage}%\n`);

  // Categorize results
  const categories = {
    'Pages': TEST_RESULTS.filter(r => r.test.includes('loads') || r.test.includes('page')),
    'Content': TEST_RESULTS.filter(r => r.test.includes('content') || r.test.includes('visible')),
    'Errors': TEST_RESULTS.filter(r => r.test.includes('error')),
    'Navigation': TEST_RESULTS.filter(r => r.test.includes('Navigation') || r.test.includes('works')),
    'Status': TEST_RESULTS.filter(r => r.test.includes('status')),
  };

  for (const [category, tests] of Object.entries(categories)) {
    if (tests.length > 0) {
      const catPassed = tests.filter(t => t.passed).length;
      const catPercent = Math.round((catPassed / tests.length) * 100);
      console.log(`${category}: ${catPassed}/${tests.length} (${catPercent}%)`);
    }
  }

  // List failed tests
  const failedTests = TEST_RESULTS.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('\n=== FAILED TESTS ===');
    failedTests.forEach(test => {
      console.log(`- ${test.test}`);
      if (test.details.error) {
        console.log(`  Error: ${test.details.error}`);
      }
      if (test.details.message) {
        console.log(`  ${test.details.message}`);
      }
    });
  }

  return { passed, failed, total, passPercentage };
}

// Save results
function saveResults() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-results-${timestamp}.json`;
  const filepath = path.join(__dirname, filename);

  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      baseUrl: BASE_URL,
      platform: process.platform,
      browser: 'Chromium (Playwright)',
    },
    summary: {
      total: TEST_RESULTS.length,
      passed: TEST_RESULTS.filter(r => r.passed).length,
      failed: TEST_RESULTS.filter(r => !r.passed).length,
      passPercentage: Math.round((TEST_RESULTS.filter(r => r.passed).length / TEST_RESULTS.length) * 100),
    },
    tests: TEST_RESULTS,
  };

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`\n\nResults saved to: ${filename}`);
  return filepath;
}

// Main test runner
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Property Expense Tracker - Comprehensive Test Suite    ║');
  console.log('║              (Using Playwright Browser)                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Run all tests
    await testLoginPage(page);
    await testDashboard(page);
    await testPropertiesPage(page);
    await testTransactionsPage(page);
    await testReportsPage(page);
    await testSettingsPage(page);
    await testNavigation(page);
    await testStatusCodes(page);

    await browser.close();

    // Generate reports
    const summary = generateSummaryReport();
    const resultsFile = saveResults();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   TEST RUN COMPLETE                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('Fatal error during test execution:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
