/**
 * DEBUG SCRIPT: Shared Property Transactions Not Appearing
 * 
 * This script investigates why User B cannot see transactions shared by User A
 * in a shared property scenario.
 */

import { db } from "./db";
import {
  properties,
  propertyShares,
  propertyMemberships,
  propertyInvitations,
  transactions,
  users,
} from "./db/schema";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/**
 * Simulates getAccessiblePropertyIds using the OLD propertyShares table
 */
async function getAccessiblePropertyIds_OLD(userId: string): Promise<string[]> {
  const [owned, shared] = await Promise.all([
    db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.userId, userId), eq(properties.isArchived, false))),
    db
      .select({ propertyId: propertyShares.propertyId })
      .from(propertyShares)
      .where(
        and(
          eq(propertyShares.sharedWithUserId, userId),
          eq(propertyShares.status, "accepted")
        )
      ),
  ]);
  return [...owned.map((p) => p.id), ...shared.map((s) => s.propertyId)];
}

/**
 * New approach using propertyMemberships table
 */
async function getAccessiblePropertyIds_NEW(userId: string): Promise<string[]> {
  const [owned, memberships] = await Promise.all([
    db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.userId, userId), eq(properties.isArchived, false))),
    db
      .select({ propertyId: propertyMemberships.propertyId })
      .from(propertyMemberships)
      .where(
        and(
          eq(propertyMemberships.userId, userId),
          eq(propertyMemberships.status, "ACTIVE")
        )
      ),
  ]);
  return [...owned.map((p) => p.id), ...memberships.map((m) => m.propertyId)];
}

async function debugSharedProperties() {
  console.log("🔍 DEBUG: Shared Property Transactions\n");
  console.log("=" + "=".repeat(80));

  try {
    // Get all users
    const allUsers = await db.select().from(users).limit(10);
    console.log(
      `\n📊 Found ${allUsers.length} users in database:\n`,
      allUsers.map((u) => ({ id: u.id, email: u.email, name: u.name }))
    );

    if (allUsers.length < 2) {
      console.error(
        "\n❌ Not enough users for testing shared properties. Need at least 2 users."
      );
      return;
    }

    const userA = allUsers[0];
    const userB = allUsers[1];

    console.log(`\n✓ Using User A: ${userA.id} (${userA.email})`);
    console.log(`✓ Using User B: ${userB.id} (${userB.email})\n`);

    // Step 1: Check propertyShares table
    console.log("=" + "=".repeat(80));
    console.log("\n1️⃣  CHECKING propertyShares TABLE (OLD SYSTEM)\n");

    const shareRecords = await db
      .select()
      .from(propertyShares)
      .where(eq(propertyShares.sharedWithUserId, userB.id));

    console.log(`   Found ${shareRecords.length} property share records for User B:`);
    for (const share of shareRecords) {
      console.log(`   - propertyId: ${share.propertyId}`);
      console.log(`     sharedWithUserId: ${share.sharedWithUserId || "NULL ⚠️ "}`);
      console.log(`     status: ${share.status}`);
      console.log(`     permission: ${share.permission}`);
      console.log(
        `     Issue: ${
          !share.sharedWithUserId
            ? "❌ sharedWithUserId is NULL - NOT SET"
            : share.status !== "accepted"
            ? `❌ Status is "${share.status}" not "accepted"`
            : "✓ OK"
        }\n`
      );
    }

    // Step 2: Check propertyMemberships table (NEW SYSTEM)
    console.log("=" + "=".repeat(80));
    console.log("\n2️⃣  CHECKING propertyMemberships TABLE (NEW SYSTEM)\n");

    const membershipRecords = await db
      .select()
      .from(propertyMemberships)
      .where(eq(propertyMemberships.userId, userB.id));

    console.log(
      `   Found ${membershipRecords.length} property membership records for User B:`
    );
    for (const membership of membershipRecords) {
      console.log(`   - propertyId: ${membership.propertyId}`);
      console.log(`     role: ${membership.role}`);
      console.log(`     status: ${membership.status}`);
      console.log(`     Issue: ${membership.status !== "ACTIVE" ? "❌ Status not ACTIVE" : "✓ OK"}\n`);
    }

    // Step 3: Check propertyInvitations table
    console.log("=" + "=".repeat(80));
    console.log("\n3️⃣  CHECKING propertyInvitations TABLE\n");

    const invitationRecords = await db
      .select()
      .from(propertyInvitations)
      .where(eq(propertyInvitations.invitedEmail, userB.email || ""));

    console.log(
      `   Found ${invitationRecords.length} property invitation records for User B:`
    );
    for (const inv of invitationRecords) {
      console.log(`   - propertyId: ${inv.propertyId}`);
      console.log(`     status: ${inv.status}`);
      console.log(
        `     Issue: ${inv.status !== "ACCEPTED" ? `❌ Status is "${inv.status}" not "ACCEPTED"` : "✓ OK"}\n`
      );
    }

    // Step 4: Test getAccessiblePropertyIds() with BOTH systems
    console.log("=" + "=".repeat(80));
    console.log(
      "\n4️⃣  TESTING getAccessiblePropertyIds() FOR USER B\n"
    );

    const accessibleIds_OLD = await getAccessiblePropertyIds_OLD(userB.id);
    const accessibleIds_NEW = await getAccessiblePropertyIds_NEW(userB.id);

    console.log(`   OLD System (propertyShares): [${accessibleIds_OLD.join(", ")}]`);
    console.log(`   NEW System (propertyMemberships): [${accessibleIds_NEW.join(", ")}]`);
    console.log(
      `\n   Mismatch: ${JSON.stringify(accessibleIds_OLD) !== JSON.stringify(accessibleIds_NEW) ? "❌ YES - Systems out of sync!" : "✓ NO"}`
    );

    // Step 5: Check transaction visibility
    console.log("\n" + "=" + "=".repeat(80));
    console.log("\n5️⃣  CHECKING TRANSACTION VISIBILITY\n");

    // Get a property User B should have access to
    const sharedProperty =
      membershipRecords.length > 0 ? membershipRecords[0] : null;

    if (sharedProperty) {
      console.log(`   Using property: ${sharedProperty.propertyId}`);
      console.log(`   (shared with User B via propertyMemberships)\n`);

      // Count transactions in property (all users)
      const allTransactions = await db
        .select({ id: transactions.id, userId: transactions.userId })
        .from(transactions)
        .where(eq(transactions.propertyId, sharedProperty.propertyId));

      console.log(`   Total transactions in property: ${allTransactions.length}`);

      // Count transactions visible to User B via OLD system
      const visibleViaOLD = allTransactions.filter((tx) =>
        accessibleIds_OLD.includes(sharedProperty.propertyId)
      ).length;

      // Count transactions visible to User B via NEW system
      const visibleViaNEW = allTransactions.filter((tx) =>
        accessibleIds_NEW.includes(sharedProperty.propertyId)
      ).length;

      console.log(
        `   Visible via OLD system (propertyShares): ${visibleViaOLD}`
      );
      console.log(
        `   Visible via NEW system (propertyMemberships): ${visibleViaNEW}`
      );
      console.log(
        `\n   Issue: ${visibleViaOLD === 0 && visibleViaNEW > 0 ? "❌ NEW system sees transactions, OLD does not!" : visibleViaOLD === visibleViaNEW && visibleViaOLD > 0 ? "✓ Both systems see transactions" : "⚠️ Partial visibility"}`
      );

      // Show transaction breakdown
      const byUser: Record<string, number> = {};
      for (const tx of allTransactions) {
        byUser[tx.userId] = (byUser[tx.userId] || 0) + 1;
      }
      console.log("\n   Transactions by creator:");
      for (const [userId, count] of Object.entries(byUser)) {
        const userInfo = allUsers.find((u) => u.id === userId);
        console.log(
          `   - ${userInfo?.email || userId}: ${count} transaction(s)`
        );
      }
    } else {
      console.log(
        "   ⚠️ No shared properties found. Cannot test transaction visibility."
      );
    }

    // Step 6: Summary and recommendations
    console.log("\n" + "=" + "=".repeat(80));
    console.log("\n📋 FINDINGS & RECOMMENDATIONS\n");

    const issues: string[] = [];

    if (shareRecords.some((s) => !s.sharedWithUserId)) {
      issues.push(
        "❌ propertyShares.sharedWithUserId is NULL for some records"
      );
    }

    if (shareRecords.some((s) => s.status !== "accepted")) {
      issues.push(
        "❌ propertyShares records have status other than 'accepted'"
      );
    }

    if (accessibleIds_OLD.length === 0 && membershipRecords.length > 0) {
      issues.push(
        "❌ getAccessiblePropertyIds() returns empty using OLD propertyShares system"
      );
    }

    if (accessibleIds_NEW.length > accessibleIds_OLD.length) {
      issues.push(
        "❌ Mismatch: NEW propertyMemberships system returns more properties than OLD propertyShares"
      );
    }

    if (issues.length === 0) {
      console.log("✓ No major issues detected. Shared properties should work.");
    } else {
      console.log("Issues found:");
      for (const issue of issues) {
        console.log(`  ${issue}`);
      }

      console.log("\n🔧 RECOMMENDED FIXES:");
      if (issues.some((i) => i.includes("propertyShares.sharedWithUserId"))) {
        console.log(
          "  1. Run migration script to populate propertyMemberships table"
        );
        console.log("  2. Update getAccessiblePropertyIds() to use propertyMemberships");
      }
      if (
        issues.some((i) => i.includes("status") || i.includes("out of sync"))
      ) {
        console.log(
          "  1. Verify propertyMemberships migration is complete"
        );
        console.log(
          "  2. Consider retiring old propertyShares table after migration"
        );
      }
      if (
        issues.some(
          (i) =>
            i.includes("getAccessiblePropertyIds()") ||
            i.includes("returns")
        )
      ) {
        console.log(
          "  1. Update all components to use NEW propertyMemberships-based queries"
        );
        console.log("  2. This includes: dashboard, reports, transactions");
      }
    }

    console.log("\n" + "=" + "=".repeat(80));
    console.log("\n✅ Debug script completed.\n");
  } catch (error) {
    console.error("❌ Error during debug:", error);
    process.exit(1);
  }
}

debugSharedProperties().then(() => process.exit(0));
