import dotenv from "dotenv";
import { db } from "../db/index";
import { properties, propertyMemberships } from "../db/schema";
import { and, eq } from "drizzle-orm";

// Load environment variables
dotenv.config({ path: ".env.local" });

interface Property {
  id: string;
  ownerId: string;
  createdAt: Date;
}

/**
 * Ensure all properties have OWNER memberships for their owners
 * This creates missing OWNER memberships with canShare = true
 */
export async function createOwnerMemberships() {
  try {
    console.log("Starting OWNER memberships creation...");

    // Fetch all properties
    const allProperties = await db.select().from(properties);
    console.log(`Found ${allProperties.length} properties`);

    let createdCount = 0;
    let alreadyExistsCount = 0;

    for (const prop of allProperties) {
      const typedProp = prop as unknown as Property;

      try {
        // Check if OWNER membership already exists
        const existing = await db
          .select()
          .from(propertyMemberships)
          .where(
            and(
              eq(propertyMemberships.propertyId, typedProp.id),
              eq(propertyMemberships.userId, typedProp.ownerId)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          // Create OWNER membership
          await db.insert(propertyMemberships).values({
            propertyId: typedProp.id,
            userId: typedProp.ownerId,
            role: "OWNER",
            canShare: true,
            status: "ACTIVE",
            createdAt: typedProp.createdAt,
            acceptedAt: typedProp.createdAt,
          });
          createdCount++;
          console.log(
            `✓ Created OWNER membership: ${typedProp.id} for user ${typedProp.ownerId}`
          );
        } else {
          alreadyExistsCount++;
          console.log(
            `⊘ OWNER membership already exists: ${typedProp.id} for user ${typedProp.ownerId}`
          );
        }
      } catch (error) {
        console.error(
          `✗ Error creating OWNER membership for property ${typedProp.id}:`,
          error
        );
      }
    }

    console.log("\n=== OWNER Memberships Summary ===");
    console.log(`Total properties: ${allProperties.length}`);
    console.log(`✓ OWNER memberships created: ${createdCount}`);
    console.log(`⊘ OWNER memberships already existed: ${alreadyExistsCount}`);
    console.log("OWNER memberships creation completed successfully!");
  } catch (error) {
    console.error("Fatal error during OWNER memberships creation:", error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  createOwnerMemberships().then(() => process.exit(0));
}
