"use server";

import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { properties, propertyShares } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = "noreply@propertytracker.app";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://property-expense-tracker.vercel.app";

export async function shareProperty(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const user = await requireAuth();

  const propertyId = formData.get("propertyId") as string;
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const permission = formData.get("permission") as string;

  if (!propertyId || !email || !permission) return { error: "All fields are required." };
  if (!["view", "edit"].includes(permission)) return { error: "Invalid permission." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Invalid email address." };

  // Verify the user owns this property
  const [property] = await db
    .select({ id: properties.id, name: properties.name })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.userId, user.id)))
    .limit(1);

  if (!property) return { error: "Property not found." };
  if (email === user.email?.toLowerCase()) return { error: "You cannot share a property with yourself." };

  const token = randomUUID();

  try {
    await db
      .insert(propertyShares)
      .values({
        propertyId,
        ownerId: user.id,
        invitedEmail: email,
        permission,
        status: "pending",
        inviteToken: token,
      })
      .onConflictDoUpdate({
        target: [propertyShares.propertyId, propertyShares.invitedEmail],
        set: {
          permission,
          status: "pending",
          inviteToken: token,
          acceptedAt: null,
          sharedWithUserId: null,
        },
      });
  } catch (err) {
    console.error("shareProperty insert:", err);
    return { error: "Failed to create share. Please try again." };
  }

  // Send invite email
  const resend = getResend();
  const inviteUrl = `${APP_URL}/invite/${token}`;
  if (resend) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `${user.name ?? "Someone"} shared a property with you — Property Tracker`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#1a2744">Property shared with you</h2>
            <p><strong>${user.name ?? user.email}</strong> has shared the property <strong>${property.name}</strong> with you on Property Tracker.</p>
            <p>You have been granted <strong>${permission === "edit" ? "Edit" : "View Only"}</strong> access.</p>
            <p style="margin:24px 0">
              <a href="${inviteUrl}" style="background:#1a2744;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Accept Invitation</a>
            </p>
            <p style="color:#666;font-size:13px">If you did not expect this invitation, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("shareProperty email:", emailErr);
      // Don't fail the action if email fails — share was created
    }
  }

  revalidatePath(`/properties/${propertyId}`);
  return { success: true };
}

export async function revokeShare(shareId: string): Promise<void> {
  const user = await requireAuth();

  await db
    .update(propertyShares)
    .set({ status: "revoked" })
    .where(and(eq(propertyShares.id, shareId), eq(propertyShares.ownerId, user.id)));

  revalidatePath("/properties");
}

export async function acceptInvite(token: string): Promise<{ error?: string; propertyId?: string }> {
  const user = await requireAuth();

  const [share] = await db
    .select()
    .from(propertyShares)
    .where(and(eq(propertyShares.inviteToken, token), eq(propertyShares.status, "pending")))
    .limit(1);

  if (!share) return { error: "This invitation is invalid or has already been used." };
  if (share.ownerId === user.id) return { error: "You cannot accept your own invitation." };

  await db
    .update(propertyShares)
    .set({ status: "accepted", sharedWithUserId: user.id, acceptedAt: new Date() })
    .where(eq(propertyShares.id, share.id));

  revalidatePath("/properties");
  return { propertyId: share.propertyId };
}
