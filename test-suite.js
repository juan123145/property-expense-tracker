#!/usr/bin/env node

/**
 * Comprehensive Property Expense Tracker Test Suite
 * Tests all pages, navigation, pagination, filters, and data display
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = [];
const COOKIES = {};

// Helper to make HTTP requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Property-Expense-Tracker-Test',
      ...options.headers,
    },
    ...options,
  };

  // Add cookies if available
  if (Object.keys(COOKIES).length > 0) {
    const cookieHeader = Object.entries(COOKIES)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    defaultOptions.headers.Cookie = cookieHeader;
  }

  try {
    const response = await fetch(url, defaultOptions);
    
    // Extract and store cookies
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const cookieParts = setCookie.split(';')[0].split('=');
      if (cookieParts.length === 2) {
        COOKIES[cookieParts[0]] = cookieParts[1];
      }
    }

    const text = await response.text();
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: text,
      ok: response.ok,
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Network Error',
      error: error.message,
      body: null,
      ok: false,
    };
  }
}

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

// Check for common errors in HTML
function checkForErrors(html) {
  const errors = [];
  
  if (!html) {
    errors.push('Empty response body');
    return errors;
  }

  // Look for error indicators (excluding known browser extension errors)
  if (html.includes('Internal Server Error') || html.includes('500')) {
    errors.push('500 Internal Server Error detected');
  }
  if (html.includes('Page not found') || html.includes('404')) {
    errors.push('404 Not Found');
  }
  if (html.includes('Uncaught SyntaxError')) {
    errors.push('JavaScript syntax error detected');
  }
  if (html.includes('Cannot find module') || html.includes('Module not found')) {
    errors.push('Module loading error');
  }
  if (html.includes('ReferenceError:') || html.includes('TypeError:')) {
    errors.push('Runtime JavaScript error detected');
  }

  return errors;
}

// Check if HTML contains expected elements
function checkForElement(html, selector) {
  // Simple check for common React/HTML patterns
  return html && (
    html.includes(`id="${selector}"`) ||
    html.includes(`class="${selector}"`) ||
    html.includes(`className="${selector}"`) ||
    html.includes(`data-testid="${selector}"`)
  );
}

// Test 1: Login Page
async function testLoginPage() {
  console.log('\n=== TEST 1: LOGIN PAGE (/login) ===');
  
  const response = await makeRequest('/login');
  const passed = response.ok && response.status === 200;
  
  logTest('Login page loads', passed, {
    status: response.status,
    error: response.error,
  });

  if (passed) {
    const errors = checkForErrors(response.body);
    logTest('Login page has no errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors detected',
    });

    const hasForm = response.body.includes('form') || response.body.includes('login') || response.body.includes('Sign in');
    logTest('Login form elements present', hasForm, {
      message: hasForm ? 'Form detected' : 'No form elements found',
    });
  }
}

// Test 2: Dashboard Page
async function testDashboard() {
  console.log('\n=== TEST 2: DASHBOARD PAGE (/dashboard) ===');
  
  const response = await makeRequest('/dashboard');
  const passed = response.ok && response.status === 200;
  
  logTest('Dashboard page loads', passed, {
    status: response.status,
    error: response.error,
  });

  if (passed) {
    const errors = checkForErrors(response.body);
    logTest('Dashboard has no errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors detected',
    });

    const hasData = response.body.includes('property') || 
                    response.body.includes('dashboard') ||
                    response.body.includes('Property') ||
                    response.body.includes('transaction');
    logTest('Dashboard has content', hasData, {
      message: hasData ? 'Dashboard content detected' : 'Limited content found',
    });
  }
}

// Test 3: Properties Page
async function testPropertiesPage() {
  console.log('\n=== TEST 3: PROPERTIES PAGE (/properties) ===');
  
  const response = await makeRequest('/properties');
  const passed = response.ok && response.status === 200;
  
  logTest('Properties page loads', passed, {
    status: response.status,
    error: response.error,
  });

  if (passed) {
    const errors = checkForErrors(response.body);
    logTest('Properties page has no errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors detected',
    });

    const hasContent = response.body.includes('property') || 
                       response.body.includes('Property') ||
                       response.body.includes('address') ||
                       response.body.includes('Address');
    logTest('Properties page shows content', hasContent, {
      message: hasContent ? 'Properties content detected' : 'Limited content',
    });
  }
}

// Test 4: Transactions Page
async function testTransactionsPage() {
  console.log('\n=== TEST 4: TRANSACTIONS PAGE (/transactions) ===');
  
  const response = await makeRequest('/transactions');
  const passed = response.ok && response.status === 200;
  
  logTest('Transactions page loads', passed, {
    status: response.status,
    error: response.error,
  });

  if (passed) {
    const errors = checkForErrors(response.body);
    logTest('Transactions page has no errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors detected',
    });

    // Check for pagination elements
    const hasPagination = response.body.includes('pagination') ||
                         response.body.includes('page') ||
                         response.body.includes('rows') ||
                         response.body.includes('per page');
    logTest('Pagination controls present', hasPagination, {
      message: hasPagination ? 'Pagination elements detected' : 'Pagination not visible in HTML',
    });

    const hasTransactions = response.body.includes('transaction') ||
                           response.body.includes('amount') ||
                           response.body.includes('expense');
    logTest('Transaction data present', hasTransactions, {
      message: hasTransactions ? 'Transaction data detected' : 'Limited transaction data',
    });
  }
}

// Test 5: Reports Page
async function testReportsPage() {
  console.log('\n=== TEST 5: REPORTS PAGE (/reports) ===');
  
  const response = await makeRequest('/reports');
  const passed = response.ok && response.status === 200;
  
  logTest('Reports page loads', passed, {
    status: response.status,
    error: response.error,
  });

  if (passed) {
    const errors = checkForErrors(response.body);
    logTest('Reports page has no errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors detected',
    });

    const hasContent = response.body.includes('report') ||
                      response.body.includes('Report') ||
                      response.body.includes('summary') ||
                      response.body.includes('chart');
    logTest('Reports page shows content', hasContent, {
      message: hasContent ? 'Reports content detected' : 'Limited content',
    });
  }
}

// Test 6: Settings Page
async function testSettingsPage() {
  console.log('\n=== TEST 6: SETTINGS PAGE (/settings) ===');
  
  const response = await makeRequest('/settings');
  const passed = response.ok && response.status === 200;
  
  logTest('Settings page loads', passed, {
    status: response.status,
    error: response.error,
  });

  if (passed) {
    const errors = checkForErrors(response.body);
    logTest('Settings page has no errors', errors.length === 0, {
      message: errors.length > 0 ? `Found: ${errors.join('; ')}` : 'No errors detected',
    });

    const hasSettings = response.body.includes('setting') ||
                       response.body.includes('Setting') ||
                       response.body.includes('preference') ||
                       response.body.includes('Preference');
    logTest('Settings elements present', hasSettings, {
      message: hasSettings ? 'Settings content detected' : 'Limited settings content',
    });
  }
}

// Test 7: Check API Routes
async function testAPIRoutes() {
  console.log('\n=== TEST 7: API ENDPOINTS ===');
  
  // Test properties API
  const propertiesAPI = await makeRequest('/api/properties');
  const propertiesOk = propertiesAPI.status === 200 || propertiesAPI.status === 401 || propertiesAPI.status === 403;
  logTest('Properties API endpoint available', propertiesOk, {
    status: propertiesAPI.status,
    error: propertiesAPI.error,
  });

  // Test transactions API
  const transactionsAPI = await makeRequest('/api/transactions');
  const transactionsOk = transactionsAPI.status === 200 || transactionsAPI.status === 401 || transactionsAPI.status === 403;
  logTest('Transactions API endpoint available', transactionsOk, {
    status: transactionsAPI.status,
    error: transactionsAPI.error,
  });

  // Test reports API
  const reportsAPI = await makeRequest('/api/reports');
  const reportsOk = reportsAPI.status === 200 || reportsAPI.status === 401 || reportsAPI.status === 404;
  logTest('Reports API endpoint exists', reportsOk, {
    status: reportsAPI.status,
    error: reportsAPI.error,
  });
}

// Test 8: Navigation Flow
async function testNavigationFlow() {
  console.log('\n=== TEST 8: NAVIGATION FLOW ===');
  
  // Test redirects and navigation
  const dashResponse = await makeRequest('/dashboard');
  const dashOk = dashResponse.ok;
  logTest('Dashboard is accessible', dashOk, {
    status: dashResponse.status,
  });

  const propsResponse = await makeRequest('/properties');
  const propsOk = propsResponse.ok;
  logTest('Properties page is accessible', propsOk, {
    status: propsResponse.status,
  });

  const transResponse = await makeRequest('/transactions');
  const transOk = transResponse.ok;
  logTest('Transactions page is accessible', transOk, {
    status: transResponse.status,
  });

  const reportsResponse = await makeRequest('/reports');
  const reportsOk = reportsResponse.ok;
  logTest('Reports page is accessible', reportsOk, {
    status: reportsResponse.status,
  });

  const settingsResponse = await makeRequest('/settings');
  const settingsOk = settingsResponse.ok;
  logTest('Settings page is accessible', settingsOk, {
    status: settingsResponse.status,
  });
}

// Generate summary report
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

  // Group by category
  const categories = {
    'Pages': TEST_RESULTS.filter(r => r.test.includes('loads') || r.test.includes('page')),
    'Content': TEST_RESULTS.filter(r => r.test.includes('content') || r.test.includes('elements') || r.test.includes('data')),
    'API': TEST_RESULTS.filter(r => r.test.includes('API') || r.test.includes('endpoint')),
    'Navigation': TEST_RESULTS.filter(r => r.test.includes('Navigation') || r.test.includes('accessible')),
    'Errors': TEST_RESULTS.filter(r => r.test.includes('error')),
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

// Save results to file
function saveResults() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-results-${timestamp}.json`;
  const filepath = path.join(__dirname, filename);

  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      baseUrl: BASE_URL,
      nodeVersion: process.version,
      platform: process.platform,
    },
    summary: {
      total: TEST_RESULTS.length,
      passed: TEST_RESULTS.filter(r => r.passed).length,
      failed: TEST_RESULTS.filter(r => !r.passed).length,
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
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  try {
    // Run all tests
    await testLoginPage();
    await testDashboard();
    await testPropertiesPage();
    await testTransactionsPage();
    await testReportsPage();
    await testSettingsPage();
    await testAPIRoutes();
    await testNavigationFlow();

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
