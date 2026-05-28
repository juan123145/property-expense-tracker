#!/usr/bin/env node

/**
 * SHARED PROPERTIES FIX VERIFICATION CHECKLIST
 * 
 * Run this checklist to verify the hybrid system fix is working correctly.
 */

const checklist = {
  "Database Integrity": [
    {
      id: "db-1",
      task: "Check for NULL sharedWithUserId in propertyShares",
      sql: `SELECT COUNT(*) as null_count FROM property_shares 
           WHERE shared_with_user_id IS NULL 
           AND status = 'accepted';`,
      expectedResult: "0 rows (no NULLs)",
      severity: "CRITICAL",
    },
    {
      id: "db-2",
      task: "Check propertyShares accepted status",
      sql: `SELECT status, COUNT(*) as count FROM property_shares 
           GROUP BY status;`,
      expectedResult: "Should see 'accepted' shares",
      severity: "HIGH",
    },
    {
      id: "db-3",
      task: "Verify propertyMemberships records exist for shared users",
      sql: `SELECT COUNT(*) FROM property_memberships 
           WHERE status = 'ACTIVE';`,
      expectedResult: "> 0 rows if shares were migrated",
      severity: "MEDIUM",
    },
  ],

  "Code Changes": [
    {
      id: "code-1",
      task: "Verify getAccessiblePropertyIds imports propertyMemberships",
      file: "lib/auth-utils.ts",
      checkFor: "import { properties, propertyShares, propertyMemberships }",
      severity: "CRITICAL",
    },
    {
      id: "code-2",
      task: "Verify getAccessiblePropertyIds queries both tables",
      file: "lib/auth-utils.ts",
      checkFor: ["legacyShares", "newMemberships"],
      severity: "CRITICAL",
    },
    {
      id: "code-3",
      task: "Verify getUserPropertyRole checks propertyShares fallback",
      file: "lib/permissions.ts",
      checkFor: ["Fallback to legacy system", "propertyShares"],
      severity: "CRITICAL",
    },
    {
      id: "code-4",
      task: "Verify canReadProperty checks both systems",
      file: "lib/permissions.ts",
      checkFor: ["Check new system", "Check legacy system", "legacyShare"],
      severity: "CRITICAL",
    },
  ],

  "Functional Testing": [
    {
      id: "func-1",
      scenario: "Shared User Can See Property",
      steps: [
        "1. User A creates Property 1",
        "2. User A shares with User B (EDIT)",
        "3. User B logs in",
        "4. Check: User B sees Property 1 in property list",
      ],
      expectedResult: "Property 1 appears in User B's property list",
      severity: "CRITICAL",
    },
    {
      id: "func-2",
      scenario: "Shared User Can See All Transactions",
      steps: [
        "1. User A creates 3 transactions in shared Property 1",
        "2. User B shares the property",
        "3. User B navigates to Property 1",
        "4. Check: User B sees all 3 transactions from User A",
      ],
      expectedResult: "All 3 transactions visible (not filtered by userId)",
      severity: "CRITICAL",
    },
    {
      id: "func-3",
      scenario: "Shared User Cannot See Other Properties",
      steps: [
        "1. User A creates Property 2 (NOT shared)",
        "2. User A creates transactions in Property 2",
        "3. User B logs in",
        "4. Check: User B does NOT see Property 2",
        "5. Check: User B cannot access Property 2 directly",
      ],
      expectedResult: "Property 2 not visible, access denied",
      severity: "HIGH",
    },
    {
      id: "func-4",
      scenario: "Shared User Can Add Transactions",
      steps: [
        "1. User B has Property 1 shared with EDIT permission",
        "2. User B adds a new transaction to Property 1",
        "3. User A views Property 1",
        "4. Check: User A sees User B's transaction",
      ],
      expectedResult: "Transaction appears for both users",
      severity: "HIGH",
    },
    {
      id: "func-5",
      scenario: "Dashboard Shows Correct Counts",
      steps: [
        "1. User A creates 10 transactions total (8 in Property 1, 2 in Property 2)",
        "2. User A shares only Property 1 with User B",
        "3. User B views dashboard",
        "4. Check: User B's transaction count is 8 (not 10)",
      ],
      expectedResult: "Only shared property transactions counted",
      severity: "MEDIUM",
    },
  ],

  "Report Generation": [
    {
      id: "report-1",
      scenario: "Reports Include Shared Transactions",
      steps: [
        "1. User B shares a property (8 transactions) with User A",
        "2. User A navigates to expense summary report",
        "3. Check: Report includes the 8 shared transactions",
      ],
      expectedResult: "All shared transactions in reports",
      severity: "HIGH",
    },
    {
      id: "report-2",
      scenario: "Property Filter Works for Shared",
      steps: [
        "1. User B has 2 shared properties",
        "2. User B runs annual summary report",
        "3. Filter by specific shared property",
        "4. Check: Only transactions from that property shown",
      ],
      expectedResult: "Filtering works correctly",
      severity: "MEDIUM",
    },
  ],

  "Edge Cases": [
    {
      id: "edge-1",
      scenario: "Legacy Share (propertyShares only)",
      steps: [
        "1. Property share exists only in propertyShares table",
        "2. NOT migrated to propertyMemberships yet",
        "3. User with legacy share logs in",
        "4. Check: Can see property and transactions",
      ],
      expectedResult: "Access granted via fallback to propertyShares",
      severity: "CRITICAL",
    },
    {
      id: "edge-2",
      scenario: "Duplicate in Both Tables",
      steps: [
        "1. Same share exists in both propertyShares AND propertyMemberships",
        "2. User logs in",
        "3. Check: No duplicate property IDs in accessible list",
      ],
      expectedResult: "Deduplicated list (Set), no duplicates",
      severity: "MEDIUM",
    },
    {
      id: "edge-3",
      scenario: "Pending Share (propertyShares.status = pending)",
      steps: [
        "1. Share invitation created (status = pending)",
        "2. User with pending invite tries to access",
        "3. Check: Access DENIED (not accepted yet)",
      ],
      expectedResult: "Pending shares blocked, only accepted allowed",
      severity: "HIGH",
    },
    {
      id: "edge-4",
      scenario: "Revoked Share",
      steps: [
        "1. Share was previously revoked",
        "2. User with revoked share tries to access",
        "3. Check: Access DENIED",
      ],
      expectedResult: "Revoked shares blocked",
      severity: "HIGH",
    },
  ],

  "Performance": [
    {
      id: "perf-1",
      metric: "getAccessiblePropertyIds query time",
      baseline: "< 100ms",
      note: "Runs 3 parallel queries (owned, legacy, new)",
      severity: "MEDIUM",
    },
    {
      id: "perf-2",
      metric: "canReadProperty query time",
      baseline: "< 50ms",
      note: "Should hit database once (propertyMemberships first)",
      severity: "MEDIUM",
    },
    {
      id: "perf-3",
      metric: "Dashboard load time impact",
      baseline: "Should not increase > 10%",
      note: "Added 3rd query (propertyMemberships)",
      severity: "LOW",
    },
  ],
};

console.log("\n" + "=".repeat(80));
console.log("SHARED PROPERTIES FIX - VERIFICATION CHECKLIST");
console.log("=".repeat(80) + "\n");

for (const [category, items] of Object.entries(checklist)) {
  console.log(`\n${category.toUpperCase()}\n` + "-".repeat(40));

  for (const item of items) {
    const severity = item.severity || "INFO";
    const severityEmoji = {
      CRITICAL: "🔴",
      HIGH: "🟠",
      MEDIUM: "🟡",
      LOW: "🟢",
      INFO: "🔵",
    }[severity];

    console.log(
      `\n${severityEmoji} [${item.id || ""}] ${item.task || item.scenario || item.metric}`
    );

    if (item.sql) {
      console.log(`   SQL: ${item.sql}`);
      console.log(`   Expected: ${item.expectedResult}`);
    } else if (item.checkFor) {
      const checks = Array.isArray(item.checkFor)
        ? item.checkFor
        : [item.checkFor];
      console.log(`   File: ${item.file}`);
      for (const check of checks) {
        console.log(`   - Check for: "${check}"`);
      }
    } else if (item.steps) {
      for (const step of item.steps) {
        console.log(`   ${step}`);
      }
      console.log(`   Expected: ${item.expectedResult}`);
    } else if (item.baseline) {
      console.log(`   Baseline: ${item.baseline}`);
      if (item.note) console.log(`   Note: ${item.note}`);
    }

    if (item.note && !item.baseline) {
      console.log(`   Note: ${item.note}`);
    }
  }
}

console.log(
  "\n" + "=".repeat(80) + "\nCHECKLIST COMPLETE\n" + "=".repeat(80) + "\n"
);

// Summary
const criticalCount = Object.values(checklist)
  .flat()
  .filter((item) => item.severity === "CRITICAL").length;
const highCount = Object.values(checklist)
  .flat()
  .filter((item) => item.severity === "HIGH").length;

console.log(`Total Critical Items: ${criticalCount}`);
console.log(`Total High Priority Items: ${highCount}`);
console.log(
  "\n✅ All items must PASS before deploying to production.\n"
);
