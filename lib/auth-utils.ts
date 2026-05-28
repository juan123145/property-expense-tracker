import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { properties, propertyShares, propertyMemberships } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

/**
 * Call at the top of any Server Component or Server Action that needs auth.
 * Returns the session user or redirects to /login.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user as { id: string; name?: string | null; email?: string | null; image?: string | null };
}

/**
 * Returns all property IDs the user can access (owned + accepted shares).
 * 
 * HYBRID APPROACH: Checks BOTH propertyShares (legacy) and propertyMemberships (new).
 * This ensures compatibility during migration period.
 * 
 * @param userId The user ID to get accessible properties for
 * @returns Array of property IDs the user has access to
 */
export async function getAccessiblePropertyIds(userId: string): Promise<string[]> {
  const [owned, legacyShares, newMemberships] = await Promise.all([
    // User's owned properties (not archived)
    db.select({ id: properties.id }).from(properties)
      .where(and(eq(properties.userId, userId), eq(properties.isArchived, false))),
    
    // Legacy system: accepted propertyShares with sharedWithUserId set
    db.select({ propertyId: propertyShares.propertyId }).from(propertyShares)
      .where(and(
        eq(propertyShares.sharedWithUserId, userId),
        eq(propertyShares.status, "accepted")
      )),
    
    // New system: active propertyMemberships
    db.select({ propertyId: propertyMemberships.propertyId }).from(propertyMemberships)
      .where(and(
        eq(propertyMemberships.userId, userId),
        eq(propertyMemberships.status, "ACTIVE")
      )),
  ]);

  // Combine and deduplicate IDs
  const allIds = [
    ...owned.map((p) => p.id),
    ...legacyShares.map((s) => s.propertyId),
    ...newMemberships.map((m) => m.propertyId),
  ];
  
  return [...new Set(allIds)]; // Remove duplicates
}

/** Returns true if the user owns the property OR has an accepted 'edit' share. */
export async function canWriteToProperty(userId: string, propertyId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        or(
          eq(properties.userId, userId),
          and(
            eq(propertyShares.sharedWithUserId, userId),
            eq(propertyShares.status, "accepted"),
            eq(propertyShares.permission, "edit"),
          )
        )
      )
    )
    .leftJoin(propertyShares, eq(propertyShares.propertyId, properties.id))
    .limit(1);
  return !!row;
}
