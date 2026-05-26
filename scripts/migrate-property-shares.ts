import { db } from "../db/index";
import {
  propertyShares,
  propertyMemberships,
  propertyInvitations,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

interface PropertyShare {
  id: string;
  propertyId: string;
  ownerId: string;
  invitedEmail: string;
  sharedWithUserId: string | null;
  permission: string;
  status: string;
  inviteToken: string;
  createdAt: Date;
  acceptedAt: Date | null;
}

/**
 * Migrate all propertyShares data to propertyMemberships and propertyInvitations
 * - ACCEPTED shares -> propertyMemberships (ACTIVE)
 * - PENDING shares -> propertyInvitations (PENDING)
 * - REVOKED shares are skipped
 */
export async function migratePropertyShares() {
  try {
    console.log("Starting propertyShares migration...");

    // Fetch all shares
    const shares = await db.select().from(propertyShares);
    console.log(`Found ${shares.length} propertyShares records to process`);

    let acceptedCount = 0;
    let pendingCount = 0;
    let skippedCount = 0;

    for (const share of shares) {
      const typedShare = share as unknown as PropertyShare;

      // Process ACCEPTED shares
      if (
        typedShare.status === "accepted" &&
        typedShare.sharedWithUserId
      ) {
        try {
          const role =
            typedShare.permission === "edit" ? "EDITOR" : "VIEWER";

          // Check if membership already exists
          const existing = await db
            .select()
            .from(propertyMemberships)
            .where(
              and(
                eq(propertyMemberships.propertyId, typedShare.propertyId),
                eq(propertyMemberships.userId, typedShare.sharedWithUserId)
              )
            )
            .limit(1);

          if (existing.length === 0) {
            await db.insert(propertyMemberships).values({
              propertyId: typedShare.propertyId,
              userId: typedShare.sharedWithUserId,
              role: role as "EDITOR" | "VIEWER",
              canShare: false,
              status: "ACTIVE",
              createdAt: typedShare.createdAt,
              acceptedAt: typedShare.acceptedAt || typedShare.createdAt,
            });
            acceptedCount++;
            console.log(
              `✓ Migrated ACCEPTED share: ${typedShare.propertyId} -> ${typedShare.sharedWithUserId} (${role})`
            );
          } else {
            console.log(
              `⊘ Skipped duplicate ACCEPTED share: ${typedShare.propertyId} -> ${typedShare.sharedWithUserId}`
            );
            skippedCount++;
          }
        } catch (error) {
          console.error(
            `✗ Error migrating ACCEPTED share ${typedShare.id}:`,
            error
          );
        }
      }

      // Process PENDING shares
      else if (typedShare.status === "pending") {
        try {
          const role =
            typedShare.permission === "edit" ? "EDITOR" : "VIEWER";

          // Calculate expiration (30 days from creation)
          const expiresAt = new Date(typedShare.createdAt);
          expiresAt.setDate(expiresAt.getDate() + 30);

          // Check if invitation already exists for this email + property
          const existing = await db
            .select()
            .from(propertyInvitations)
            .where(
              and(
                eq(propertyInvitations.propertyId, typedShare.propertyId),
                eq(propertyInvitations.invitedEmail, typedShare.invitedEmail)
              )
            )
            .limit(1);

          if (existing.length === 0) {
            await db.insert(propertyInvitations).values({
              propertyId: typedShare.propertyId,
              invitedEmail: typedShare.invitedEmail,
              invitedByUserId: typedShare.ownerId,
              role: role as "EDITOR" | "VIEWER",
              canShare: false,
              status: "PENDING",
              token: typedShare.inviteToken,
              expiresAt,
              createdAt: typedShare.createdAt,
            });
            pendingCount++;
            console.log(
              `✓ Migrated PENDING share: ${typedShare.propertyId} -> ${typedShare.invitedEmail} (${role})`
            );
          } else {
            console.log(
              `⊘ Skipped duplicate PENDING invitation: ${typedShare.propertyId} -> ${typedShare.invitedEmail}`
            );
            skippedCount++;
          }
        } catch (error) {
          console.error(
            `✗ Error migrating PENDING share ${typedShare.id}:`,
            error
          );
        }
      }

      // REVOKED shares are not migrated
      else if (typedShare.status === "revoked") {
        skippedCount++;
        console.log(`⊘ Skipped REVOKED share: ${typedShare.id}`);
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total shares processed: ${shares.length}`);
    console.log(`✓ ACCEPTED shares migrated: ${acceptedCount}`);
    console.log(`✓ PENDING shares migrated: ${pendingCount}`);
    console.log(`⊘ Shares skipped: ${skippedCount}`);
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Fatal error during migration:", error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  migratePropertyShares().then(() => process.exit(0));
}
