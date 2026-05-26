import { db } from "@/db";
import { properties, propertyMemberships } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

/**
 * Fix missing owner membership records
 *
 * For any property where the owner (userId or ownerId) doesn't have
 * a membership record in propertyMemberships, create one.
 *
 * This is a one-time fix for properties created before this fix was implemented.
 */
export async function fixOwnerMemberships() {
  try {
    // Find all properties
    const allProperties = await db.select().from(properties);

    let fixed = 0;

    for (const property of allProperties) {
      const ownerId = property.ownerId || property.userId;

      if (!ownerId) continue;

      // Check if owner has a membership record
      const [existing] = await db
        .select()
        .from(propertyMemberships)
        .where(
          eq(propertyMemberships.propertyId, property.id)
        )
        .limit(1);

      // If no membership exists, create one for the owner
      if (!existing) {
        await db.insert(propertyMemberships).values({
          propertyId: property.id,
          userId: ownerId,
          role: "OWNER",
          status: "ACTIVE",
          canShare: true,
          acceptedAt: new Date(),
        });
        fixed++;
        console.log(`✅ Created OWNER membership for property ${property.id} (user: ${ownerId})`);
      }
    }

    return {
      success: true,
      message: `Fixed ${fixed} properties with missing owner memberships`,
      fixed,
    };
  } catch (err) {
    console.error("fixOwnerMemberships error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
