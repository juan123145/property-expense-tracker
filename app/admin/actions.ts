"use server";

import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { properties, transactions, transactionAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteFromR2 } from "@/lib/r2";

export async function adminDeleteUser(targetUserId: string): Promise<{ error?: string }> {
  const admin = await requireAuth();

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || admin.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return { error: "Not authorized." };
  }

  if (admin.id === targetUserId) {
    return { error: "Cannot delete your own account from admin panel." };
  }

  try {
    const attachments = await db
      .select({ url: transactionAttachments.url })
      .from(transactionAttachments)
      .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
      .where(eq(transactions.userId, targetUserId));

    const legacyAttachments = await db
      .select({ url: transactions.attachmentUrl })
      .from(transactions)
      .where(eq(transactions.userId, targetUserId));

    const allUrls = [
      ...attachments.map((a) => a.url),
      ...legacyAttachments.flatMap((a) => (a.url ? [a.url] : [])),
    ];
    await Promise.allSettled(allUrls.map((url) => deleteFromR2(url)));

    await db.delete(transactions).where(eq(transactions.userId, targetUserId));
    await db.delete(properties).where(eq(properties.userId, targetUserId));

    return {};
  } catch (err) {
    console.error("adminDeleteUser:", err);
    return { error: "Failed to delete user. Please try again." };
  }
}

export async function adminDeleteAttachment(attachmentId: string): Promise<{ error?: string }> {
  const admin = await requireAuth();

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || admin.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return { error: "Not authorized." };
  }

  try {
    const [att] = await db
      .select({ url: transactionAttachments.url })
      .from(transactionAttachments)
      .where(eq(transactionAttachments.id, attachmentId))
      .limit(1);

    if (!att) {
      return { error: "Not found." };
    }

    try {
      await deleteFromR2(att.url);
    } catch {
      // Non-fatal: file may already be deleted from R2
    }

    await db.delete(transactionAttachments).where(eq(transactionAttachments.id, attachmentId));
    return {};
  } catch (err) {
    console.error("adminDeleteAttachment:", err);
    return { error: "Failed to delete attachment." };
  }
}
