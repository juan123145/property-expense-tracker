"use server";

import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { propertyMemberships } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import {
  createInvitation,
  acceptInvitation,
  declineInvitation,
} from "@/lib/invitation-service";
import {
  canManageProperty,
  canGrantRole,
} from "@/lib/permissions";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://property-expense-tracker.vercel.app";

/**
 * Share a property with another user via email invitation
 */
export async function shareProperty(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean; inviteUrl?: string }> {
  const user = await requireAuth();

  const propertyId = formData.get("propertyId") as string;
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const roleRaw = formData.get("role") as string;
  const canShareRaw = formData.get("canShare") as string;

  // Validate required fields
  if (!propertyId || !email || !roleRaw) {
    return { error: "All fields are required." };
  }

  // Validate role
  if (!["EDITOR", "VIEWER"].includes(roleRaw)) {
    return { error: "Invalid role. Cannot share as OWNER." };
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email address." };
  }

  // Prevent self-sharing
  if (email === user.email?.toLowerCase()) {
    return { error: "You cannot share a property with yourself." };
  }

  // Check authorization
  const canManage = await canManageProperty(user.id, propertyId);
  if (!canManage) {
    return { error: "You are not authorized to share this property." };
  }

  const role = roleRaw as "EDITOR" | "VIEWER";
  const canShare = canShareRaw === "true";

  // Check if user can grant this role
  const canGrant = await canGrantRole(user.id, propertyId, role);
  if (!canGrant) {
    return { error: "You do not have permission to grant this role." };
  }

  try {
    // Create invitation
    let token: string;
    try {
      const result = await createInvitation({
        propertyId,
        invitedEmail: email,
        invitedByUserId: user.id,
        role,
        canShare,
      });
      token = result.token;
    } catch (invitationErr) {
      console.error("createInvitation failed:", {
        propertyId,
        email,
        role,
        canShare,
        error: invitationErr instanceof Error ? invitationErr.message : String(invitationErr),
        stack: invitationErr instanceof Error ? invitationErr.stack : undefined,
      });

      const errorMessage = invitationErr instanceof Error ? invitationErr.message : "Unknown invitation creation error";

      // Provide user-friendly error based on actual error
      if (errorMessage.includes("unique constraint") || errorMessage.includes("duplicate")) {
        return { error: "This user already has a pending invitation or accepted access to this property." };
      }
      if (errorMessage.includes("foreign key")) {
        return { error: "Invalid property or user. Please refresh and try again." };
      }

      return { error: `Failed to create invitation: ${errorMessage}` };
    }

    // Send email
    const inviteUrl = `${APP_URL}/invite/${token}`;
    try {
      await sendEmail({
        to: email,
        subject: `${user.name ?? "Someone"} shared a property with you — Property Tracker`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#1a2744">Property shared with you</h2>
            <p><strong>${user.name ?? user.email}</strong> has invited you to collaborate on Property Tracker.</p>
            <p>You have been granted <strong>${role === "EDITOR" ? "Edit" : "View Only"}</strong> access.</p>
            <p style="margin:24px 0">
              <a href="${inviteUrl}" style="background:#1a2744;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Accept Invitation</a>
            </p>
            <p style="color:#666;font-size:13px">If you did not expect this invitation, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("shareProperty email:", {
        email,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
      // Non-fatal if email fails
    }

    revalidatePath(`/properties/${propertyId}`);
    return { success: true, inviteUrl };
  } catch (err) {
    console.error("shareProperty unexpected error:", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { error: "Failed to create invitation. Please try again." };
  }
}

/**
 * Revoke access for a property member
 */
export async function revokeAccess(
  membershipId: string
): Promise<{ error?: string; success?: boolean }> {
  const user = await requireAuth();

  try {
    // Get membership
    const [membership] = await db
      .select()
      .from(propertyMemberships)
      .where(eq(propertyMemberships.id, membershipId))
      .limit(1);

    if (!membership) {
      return { error: "Membership not found." };
    }

    // Check authorization
    const canManage = await canManageProperty(user.id, membership.propertyId);
    if (!canManage) {
      return { error: "You are not authorized to revoke access." };
    }

    // Prevent revoking own OWNER access
    if (membership.userId === user.id && membership.role === "OWNER") {
      return { error: "You cannot revoke your own owner access." };
    }

    // Revoke access
    await db
      .update(propertyMemberships)
      .set({ status: "REVOKED", revokedAt: new Date() })
      .where(eq(propertyMemberships.id, membershipId));

    revalidatePath("/properties");
    return { success: true };
  } catch (err) {
    console.error("revokeAccess:", err);
    return { error: "Failed to revoke access. Please try again." };
  }
}

/**
 * Update a member's role and sharing permissions
 */
export async function updateMembershipRole(
  membershipId: string,
  newRole: "OWNER" | "EDITOR" | "VIEWER",
  canShare: boolean
): Promise<{ error?: string; success?: boolean }> {
  const user = await requireAuth();

  try {
    // Get membership
    const [membership] = await db
      .select()
      .from(propertyMemberships)
      .where(eq(propertyMemberships.id, membershipId))
      .limit(1);

    if (!membership) {
      return { error: "Membership not found." };
    }

    // Check authorization
    const canManage = await canManageProperty(user.id, membership.propertyId);
    if (!canManage) {
      return { error: "You are not authorized to update roles." };
    }

    // Prevent changing OWNER role
    if (membership.role === "OWNER" || newRole === "OWNER") {
      return { error: "Cannot change OWNER role." };
    }

    // Check if user can grant the new role
    const canGrant = await canGrantRole(user.id, membership.propertyId, newRole);
    if (!canGrant) {
      return { error: "You do not have permission to grant this role." };
    }

    // Update membership
    await db
      .update(propertyMemberships)
      .set({ role: newRole, canShare })
      .where(eq(propertyMemberships.id, membershipId));

    revalidatePath("/properties");
    return { success: true };
  } catch (err) {
    console.error("updateMembershipRole:", err);
    return { error: "Failed to update role. Please try again." };
  }
}

/**
 * Accept an invitation
 */
export async function acceptInvite(
  token: string
): Promise<{ error?: string; propertyId?: string }> {
  const user = await requireAuth();

  try {
    const { propertyId } = await acceptInvitation(token, user.id);
    revalidatePath("/properties");
    return { propertyId };
  } catch (err) {
    console.error("acceptInvite:", err);
    const message = err instanceof Error ? err.message : "Failed to accept invitation.";
    return { error: message };
  }
}

/**
 * Decline an invitation
 */
export async function declineInvite(
  token: string
): Promise<{ error?: string; success?: boolean }> {
  const user = await requireAuth();

  try {
    await declineInvitation(token, user.id);
    revalidatePath("/properties");
    return { success: true };
  } catch (err) {
    console.error("declineInvite:", err);
    const message = err instanceof Error ? err.message : "Failed to decline invitation.";
    return { error: message };
  }
}
