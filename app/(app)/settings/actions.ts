"use server";

import { requireAuth } from "@/lib/auth-utils";
import { signOut } from "@/auth";
import { db } from "@/db";
import { properties, transactions, transactionAttachments } from "@/db/schema";
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
