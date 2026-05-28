#!/usr/bin/env node

/**
 * DEBUG SCRIPT: Shared Property Transactions Not Appearing
 * 
 * This script investigates why User B cannot see transactions shared by User A
 * in a shared property scenario.
 * 
 * Run: node debug-shared-properties.js
 */

const fs = require('fs');
const path = require('path');

// Read key files directly to analyze code
const authUtilsPath = path.join(__dirname, 'lib', 'auth-utils.ts');
const permissionsPath = path.join(__dirname, 'lib', 'permissions.ts');
const transactionQueriesPath = path.join(__dirname, 'lib', 'transaction-queries.ts');
const schemaPath = path.join(__dirname, 'db', 'schema.ts');

console.log('\n🔍 DEBUG: Shared Property Transactions Architecture Analysis\n');
console.log('=' + '='.repeat(80));

try {
  // Read the files
  const authUtils = fs.readFileSync(authUtilsPath, 'utf8');
  const permissions = fs.readFileSync(permissionsPath, 'utf8');
  const transactionQueries = fs.readFileSync(transactionQueriesPath, 'utf8');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('\n1️⃣  ANALYZING getAccessiblePropertyIds() FUNCTION\n');
  
  // Check what getAccessiblePropertyIds uses
  if (authUtils.includes('propertyShares')) {
    console.log('   ✓ Uses propertyShares table: OLD SYSTEM');
    if (authUtils.includes('eq(propertyShares.sharedWithUserId, userId)')) {
      console.log('   ✓ Filters by sharedWithUserId (correct)');
    }
    if (authUtils.includes('eq(propertyShares.status, "accepted")')) {
      console.log('   ✓ Filters by status = "accepted" (correct)');
    }
  } else {
    console.log('   ✗ Does NOT use propertyShares table');
  }

  if (authUtils.includes('propertyMemberships')) {
    console.log('   ✗ ALSO uses propertyMemberships table: MIXED SYSTEMS');
  } else {
    console.log('   ✓ Does NOT use propertyMemberships: Consistent OLD system');
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n2️⃣  ANALYZING TRANSACTION VISIBILITY (getPropertyTransactions)\n');

  // Check transaction-queries
  if (transactionQueries.includes('canReadProperty')) {
    console.log('   ✓ Uses canReadProperty() for access check');
    console.log('   ⚠️  canReadProperty checks propertyMemberships table (NEW SYSTEM)');
  }

  if (transactionQueries.includes('userId')) {
    const uidMatch = transactionQueries.match(/eq\(transactions\.userId, userId\)/);
    if (uidMatch) {
      console.log('   ❌ FILTERS by transactions.userId - WILL HIDE SHARED TRANSACTIONS');
    } else {
      console.log('   ✓ Does NOT filter by transactions.userId');
    }
  }

  if (transactionQueries.includes('propertyId')) {
    if (transactionQueries.includes('eq(transactions.propertyId, propertyId)')) {
      console.log('   ✓ Correctly filters by propertyId only');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n3️⃣  ANALYZING SYSTEM MISMATCH\n');

  console.log('   Current architecture:');
  console.log('   1. getAccessiblePropertyIds() → uses propertyShares (OLD)');
  console.log('   2. canReadProperty() → uses propertyMemberships (NEW)');
  console.log('   3. getPropertyTransactions() → uses canReadProperty()');
  console.log('\n   Problem:');
  console.log('   - If a user has NO propertyMemberships entry');
  console.log('   - But HAS propertyShares entry with sharedWithUserId set');
  console.log('   - Then getAccessiblePropertyIds() WILL return the property ID');
  console.log('   - But canReadProperty() will FAIL (no propertyMemberships)');
  console.log('   - So getPropertyTransactions() will DENY access');
  console.log('\n   Result: Transactions visible in OLD system but not accessible!');

  console.log('\n' + '='.repeat(80));
  console.log('\n4️⃣  CHECKING propertyShares TABLE SCHEMA\n');

  if (schema.includes('sharedWithUserId')) {
    const shareSchema = schema.substring(
      schema.indexOf('propertyShares = pgTable'),
      schema.indexOf('propertyShares = pgTable') + 500
    );
    if (shareSchema.includes('nullable') || shareSchema.includes('notNull') === false) {
      console.log('   ✓ sharedWithUserId is defined (may be nullable)');
    }
  }

  if (schema.includes('propertyMemberships')) {
    console.log('   ✓ propertyMemberships table exists (NEW SYSTEM)');
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n5️⃣  CHECKING FOR PENDING STATUS ISSUES\n');

  const defaultStatus = schema.match(/\.default\("([^"]+)"\).*status/);
  if (schema.includes('status') && schema.includes('pending')) {
    console.log('   ⚠️  propertyShares may have default status of "pending"');
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 ROOT CAUSE ANALYSIS\n');

  console.log('Issue: SYSTEM MIGRATION INCOMPLETE');
  console.log('\nThe codebase has TWO parallel systems:');
  console.log('  OLD: propertyShares table (being phased out)');
  console.log('  NEW: propertyMemberships table (new system)');
  console.log('\nMismatch:');
  console.log('  - getAccessiblePropertyIds() uses OLD propertyShares');
  console.log('  - canReadProperty() uses NEW propertyMemberships');
  console.log('  - When property shares are created, they may only exist in propertyShares');
  console.log('  - They MUST also exist in propertyMemberships for access to work');
  console.log('  - Transactions use canReadProperty() which checks propertyMemberships');

  console.log('\n🔧 SOLUTIONS\n');

  console.log('OPTION 1: Complete the migration');
  console.log('  1. Run migrate-property-shares.ts script');
  console.log('  2. Verify all propertyShares are copied to propertyMemberships');
  console.log('  3. Update getAccessiblePropertyIds() to use propertyMemberships');
  console.log('  4. Retire propertyShares table');

  console.log('\nOPTION 2: Hybrid approach (safer)');
  console.log('  1. Update getAccessiblePropertyIds() to include propertyMemberships');
  console.log('  2. Ensure sharing creates entries in BOTH tables during migration period');
  console.log('  3. Update canReadProperty() to check BOTH tables');
  console.log('  4. Gradual deprecation of propertyShares');

  console.log('\nOPTION 3: Quick fix (temporary)');
  console.log('  1. Update canReadProperty() to also check propertyShares');
  console.log('  2. Keep both tables in sync via triggers or application logic');

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Analysis complete\n');

} catch (error) {
  console.error('❌ Error during analysis:', error.message);
  process.exit(1);
}
