"use server";

import { requireAuth } from "@/lib/auth-utils";
import { signOut } from "@/auth";
import { db } from "@/db";
import { properties, transactions, transactionAttachments, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { deleteFromR2 } from "@/lib/r2";

export async function deleteAccount() {
  const user = await requireAuth();

  // Collect all attachment URLs before deleting
  const attachments = await db
    .select({ url: transactionAttachments.url })
    .from(transactionAttachments)
    .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
    .where(eq(transactions.userId, user.id));

  // Also collect legacy single-attachment URLs from transactions table
  const legacyAttachments = await db
    .select({ url: transactions.attachmentUrl })
    .from(transactions)
    .where(eq(transactions.userId, user.id));

  // Delete R2 files (fire-and-forget failures — DB records must still be purged)
  const allUrls = [
    ...attachments.map((a) => a.url),
    ...legacyAttachments.flatMap((a) => (a.url ? [a.url] : [])),
  ];
  await Promise.allSettled(allUrls.map((url) => deleteFromR2(url)));

  // Hard delete in FK order: transactions (cascades transaction_attachments), then properties (cascades units)
  await db.delete(transactions).where(eq(transactions.userId, user.id));
  await db.delete(properties).where(eq(properties.userId, user.id));

  await signOut({ redirectTo: "/login" });
}

export async function updateUserProfile(formData: FormData): Promise<{ error?: string }> {
  const user = await requireAuth();

  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;

  if (!username || username.length < 3 || username.length > 20) {
    return { error: "Username must be 3-20 characters" };
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, and underscores" };
  }

  if (!name || name.length < 1 || name.length > 100) {
    return { error: "Name is required (1-100 characters)" };
  }

  try {
    // Check if username is already taken by another user
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existing.length > 0 && existing[0].id !== user.id) {
      return { error: "Username already taken" };
    }

    // Update the user profile
    await db
      .update(users)
      .set({
        username,
        name,
        phone,
        lastSeenAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return {};
  } catch (err: any) {
    console.error("updateUserProfile:", err);
    return { error: "Failed to update profile" };
  }
}
