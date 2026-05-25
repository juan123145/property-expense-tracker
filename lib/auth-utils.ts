import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { properties, propertyShares } from "@/db/schema";
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

/** Returns all property IDs the user can access (owned + accepted shares). */
export async function getAccessiblePropertyIds(userId: string): Promise<string[]> {
  const [owned, shared] = await Promise.all([
    db.select({ id: properties.id }).from(properties)
      .where(and(eq(properties.userId, userId), eq(properties.isArchived, false))),
    db.select({ propertyId: propertyShares.propertyId }).from(propertyShares)
      .where(and(eq(propertyShares.sharedWithUserId, userId), eq(propertyShares.status, "accepted"))),
  ]);
  return [...owned.map((p) => p.id), ...shared.map((s) => s.propertyId)];
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
