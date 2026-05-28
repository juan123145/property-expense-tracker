#!/usr/bin/env node

/**
 * Property Expense Tracker - API Endpoint Test
 * Tests API endpoints directly using fetch
 */

const BASE_URL = 'http://localhost:3000';
const fs = require('fs');
const path = require('path');

const API_ENDPOINTS = [
  { path: '/api/transactions', method: 'GET', expectedStatus: [200, 401, 403] },
  { path: '/api/transactions/paginated', method: 'GET', expectedStatus: [200, 401, 403] },
  { path: '/api/transactions/trash', method: 'GET', expectedStatus: [200, 401, 403] },
  { path: '/api/properties', method: 'GET', expectedStatus: [200, 401, 403] },
  { path: '/api/reports', method: 'GET', expectedStatus: [200, 401, 403] },
  { path: '/api/auth/signin', method: 'POST', expectedStatus: [200, 401, 405] },
  { path: '/api/auth/callback/google', method: 'GET', expectedStatus: [307, 302, 400] },
];

const TEST_RESULTS = [];

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
  if (details.status) {
    console.log(`  Status: ${details.status}`);
  }
  if (details.message) {
    console.log(`  ${details.message}`);
  }
}

async function testAPI() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Property Expense Tracker - API Endpoint Tests           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  for (const endpoint of API_ENDPOINTS) {
    try {
      const url = `${BASE_URL}${endpoint.path}`;
      const response = await fetch(url, { method: endpoint.method });
      
      const isPassed = endpoint.expectedStatus.includes(response.status);
      const contentType = response.headers.get('content-type');

      logTest(`${endpoint.method} ${endpoint.path}`, isPassed, {
        status: response.status,
        contentType: contentType,
        message: isPassed 
          ? `Valid response (expected: ${endpoint.expectedStatus.join(' or ')})`
          : `Unexpected status (expected: ${endpoint.expectedStatus.join(' or ')})`,
      });

      // For successful responses, check if we can parse the body
      if (response.status === 200) {
        try {
          const data = await response.text();
          const isJSON = contentType && contentType.includes('application/json');
          logTest(`${endpoint.method} ${endpoint.path} - Response parseable`, true, {
            message: isJSON ? 'Valid JSON response' : `Response format: ${contentType}`,
            size: data.length,
          });
        } catch (e) {
          logTest(`${endpoint.method} ${endpoint.path} - Response parseable`, false, {
            error: e.message,
          });
        }
      }
    } catch (error) {
      logTest(`${endpoint.method} ${endpoint.path}`, false, {
        error: error.message,
      });
    }
  }

  generateSummary();
}

function generateSummary() {
  console.log('\n\n=== SUMMARY ===\n');
  
  const passed = TEST_RESULTS.filter(r => r.passed).length;
  const failed = TEST_RESULTS.filter(r => !r.passed).length;
  const total = TEST_RESULTS.length;
  
  console.log(`Total API Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%\n`);

  const failedTests = TEST_RESULTS.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('=== FAILED TESTS ===');
    failedTests.forEach(t => {
      console.log(`- ${t.test}: ${t.details.error || t.details.message}`);
    });
  }

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `api-test-results-${timestamp}.json`;
  const filepath = path.join(__dirname, filename);

  const report = {
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed },
    tests: TEST_RESULTS,
  };

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`\nResults saved to: ${filename}`);
}

testAPI();
