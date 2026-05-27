import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { storageOwnerships, transactionAttachments, transactions } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { StorageBreakdownClient } from "./client";

const QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB

async function getStorageBreakdown(userId: string) {
  const attachments = await db
    .select({
      id: storageOwnerships.id,
      attachmentUrl: storageOwnerships.attachmentUrl,
      fileName: storageOwnerships.filePath,
      sizeBytes: storageOwnerships.sizeBytes,
      contentType: storageOwnerships.contentType,
      propertyId: storageOwnerships.propertyId,
      createdAt: storageOwnerships.createdAt,
    })
    .from(storageOwnerships)
    .where(and(
      eq(storageOwnerships.ownerId, userId),
      isNull(storageOwnerships.deletedAt)
    ))
    .orderBy(desc(storageOwnerships.createdAt));

  // For each attachment, find associated transaction and its status
  const enriched = await Promise.all(
    attachments.map(async (att) => {
      const result = await db
        .select({
          txId: transactions.id,
          txDate: transactions.date,
          txPayee: transactions.payee,
          txAmount: transactions.amount,
          txType: transactions.type,
          txIsDeleted: transactions.isDeleted,
        })
        .from(transactionAttachments)
        .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
        .where(eq(transactionAttachments.url, att.attachmentUrl))
        .limit(1);

      const txData = result.length > 0
        ? {
            id: result[0].txId,
            date: result[0].txDate,
            payee: result[0].txPayee,
            amount: result[0].txAmount,
            type: result[0].txType,
            isDeleted: result[0].txIsDeleted,
            status: result[0].txIsDeleted ? "Trash" : "All Transactions",
          }
        : null;

      return { ...att, transaction: txData };
    })
  );

  return enriched;
}

export default async function StorageBreakdownPage() {
  const user = await requireAuth();
  const attachments = await getStorageBreakdown(user.id);

  const totalBytes = attachments.reduce((sum, a) => sum + (a.sizeBytes ?? 0), 0);
  const usedKb = Math.round(totalBytes / 1024);
  const quotaKb = Math.round(QUOTA_BYTES / 1024);

  // Group by type
  const byType = new Map<string, { count: number; totalBytes: number }>();
  for (const a of attachments) {
    const type = a.contentType || "unknown";
    const current = byType.get(type) || { count: 0, totalBytes: 0 };
    current.count++;
    current.totalBytes += a.sizeBytes ?? 0;
    byType.set(type, current);
  }

  return (
    <StorageBreakdownClient
      attachments={attachments}
      byType={Object.fromEntries(byType)}
      usedKb={usedKb}
      quotaKb={quotaKb}
    />
  );
}
