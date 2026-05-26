import { randomBytes } from "crypto";
import { db } from "@/db";
import { propertyInvitations, propertyMemberships, properties } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";

/**
 * Generate a secure random token for invitations
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a new invitation or resend to the same email
 */
export async function createInvitation(input: {
  propertyId: string;
  invitedEmail: string;
  invitedByUserId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  canShare: boolean;
}): Promise<{
  token: string;
  invitation: any;
  expiresAt: Date;
}> {
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  const normalizedEmail = input.invitedEmail.toLowerCase().trim();

  try {
    // Try insert with upsert (if unique constraint exists)
    const [invitation] = await db
      .insert(propertyInvitations)
      .values({
        propertyId: input.propertyId,
        invitedEmail: normalizedEmail,
        invitedByUserId: input.invitedByUserId,
        role: input.role,
        canShare: input.canShare,
        status: "PENDING",
        token,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [propertyInvitations.propertyId, propertyInvitations.invitedEmail],
        set: {
          role: input.role,
          canShare: input.canShare,
          status: "PENDING",
          token,
          expiresAt,
          respondedAt: null,
          tokenUsedByUserId: null,
        },
      })
      .returning();

    return { token, invitation, expiresAt };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // If unique constraint doesn't exist, try manual update
    // Check for various error patterns from Drizzle/database drivers
    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("Conflict target") ||
      errorMessage.includes("does not exist") ||
      errorMessage.includes("Failed query") ||
      errorMessage.includes("on conflict") ||
      errorMessage.includes("constraint") && errorMessage.includes("does not exist")
    ) {
      // Unique constraint doesn't exist in production DB
      // Try to find and update existing invitation
      const [existing] = await db
        .select()
        .from(propertyInvitations)
        .where(
          and(
            eq(propertyInvitations.propertyId, input.propertyId),
            eq(propertyInvitations.invitedEmail, normalizedEmail)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing invitation
        const [updated] = await db
          .update(propertyInvitations)
          .set({
            role: input.role,
            canShare: input.canShare,
            status: "PENDING",
            token,
            expiresAt,
            respondedAt: null,
            tokenUsedByUserId: null,
          })
          .where(eq(propertyInvitations.id, existing.id))
          .returning();

        return { token, invitation: updated, expiresAt };
      } else {
        // Create new invitation
        const [created] = await db
          .insert(propertyInvitations)
          .values({
            propertyId: input.propertyId,
            invitedEmail: normalizedEmail,
            invitedByUserId: input.invitedByUserId,
            role: input.role,
            canShare: input.canShare,
            status: "PENDING",
            token,
            expiresAt,
          })
          .returning();

        return { token, invitation: created, expiresAt };
      }
    }

    // Re-throw if it's a different error
    throw err;
  }
}

/**
 * Accept an invitation and create a property membership
 */
export async function acceptInvitation(
  token: string,
  acceptingUserId: string
): Promise<{ membership: any; propertyId: string }> {
  const [invitation] = await db
    .select()
    .from(propertyInvitations)
    .where(
      and(
        eq(propertyInvitations.token, token),
        eq(propertyInvitations.status, "PENDING")
      )
    )
    .limit(1);

  if (!invitation) {
    throw new Error("This invitation is invalid or has already been used.");
  }

  const now = new Date();
  if (invitation.expiresAt < now) {
    // Update to EXPIRED status
    await db
      .update(propertyInvitations)
      .set({ status: "EXPIRED" })
      .where(eq(propertyInvitations.id, invitation.id));
    throw new Error("This invitation has expired.");
  }

  // Check if accepting user is already the owner - if so, preserve OWNER role
  const [property] = await db
    .select()
    .from(propertyMemberships)
    .where(
      and(
        eq(propertyMemberships.propertyId, invitation.propertyId),
        eq(propertyMemberships.userId, acceptingUserId),
        eq(propertyMemberships.role, "OWNER")
      )
    )
    .limit(1);

  // If user is already OWNER, keep them as OWNER (ignore invitation role)
  const roleToAssign = property ? "OWNER" : invitation.role;

  // Create or update the property membership
  const [membership] = await db
    .insert(propertyMemberships)
    .values({
      propertyId: invitation.propertyId,
      userId: acceptingUserId,
      role: roleToAssign,
      canShare: property ? true : invitation.canShare, // Owner always has canShare
      status: "ACTIVE",
      acceptedAt: now,
    })
    .onConflictDoUpdate({
      target: [propertyMemberships.propertyId, propertyMemberships.userId],
      set: {
        role: roleToAssign, // Don't downgrade OWNER to EDITOR/VIEWER
        canShare: property ? true : invitation.canShare,
        status: "ACTIVE",
        acceptedAt: now,
      },
    })
    .returning();

  // Update invitation to ACCEPTED
  await db
    .update(propertyInvitations)
    .set({
      status: "ACCEPTED",
      tokenUsedByUserId: acceptingUserId,
      respondedAt: now,
    })
    .where(eq(propertyInvitations.id, invitation.id));

  return { membership, propertyId: invitation.propertyId };
}

/**
 * Decline an invitation
 */
export async function declineInvitation(
  token: string,
  decliningUserId: string
): Promise<void> {
  const [invitation] = await db
    .select()
    .from(propertyInvitations)
    .where(
      and(
        eq(propertyInvitations.token, token),
        eq(propertyInvitations.status, "PENDING")
      )
    )
    .limit(1);

  if (!invitation) {
    throw new Error("This invitation is invalid or has already been used.");
  }

  const now = new Date();
  await db
    .update(propertyInvitations)
    .set({
      status: "DECLINED",
      tokenUsedByUserId: decliningUserId,
      respondedAt: now,
    })
    .where(eq(propertyInvitations.id, invitation.id));
}

/**
 * Cancel an invitation (by the inviter)
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  await db
    .update(propertyInvitations)
    .set({ status: "CANCELED" })
    .where(eq(propertyInvitations.id, invitationId));
}

/**
 * Expire old PENDING invitations past their expiresAt date
 * Called by background job
 */
export async function expireOldInvitations(): Promise<void> {
  const now = new Date();
  await db
    .update(propertyInvitations)
    .set({ status: "EXPIRED" })
    .where(
      and(
        eq(propertyInvitations.status, "PENDING"),
        lt(propertyInvitations.expiresAt, now)
      )
    );
}

/**
 * Get all pending invitations for a user's email
 */
export async function getPendingInvitationsForUser(email: string): Promise<any[]> {
  const normalizedEmail = email.toLowerCase().trim();
  return await db
    .select()
    .from(propertyInvitations)
    .where(
      and(
        eq(propertyInvitations.invitedEmail, normalizedEmail),
        eq(propertyInvitations.status, "PENDING")
      )
    );
}

/**
 * Get all invitations for a property (any status)
 */
export async function getPropertyInvitations(propertyId: string): Promise<any[]> {
  return await db
    .select()
    .from(propertyInvitations)
    .where(eq(propertyInvitations.propertyId, propertyId));
}
