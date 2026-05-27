import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { storageOwnerships, transactionAttachments, transactions } from "@/db/schema";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
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

  // Batch fetch all associated transactions in a single query
  const attachmentUrlMap = new Map(attachments.map(a => [a.attachmentUrl, a]));
  const attachmentUrls = Array.from(attachmentUrlMap.keys());

  const transactionMap = new Map<string, any>();
  if (attachmentUrls.length > 0) {
    const txResults = await db
      .select({
        attachmentUrl: transactionAttachments.url,
        txId: transactions.id,
        txDate: transactions.date,
        txPayee: transactions.payee,
        txAmount: transactions.amount,
        txType: transactions.type,
        txIsDeleted: transactions.isDeleted,
      })
      .from(transactionAttachments)
      .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
      .where(inArray(transactionAttachments.url, attachmentUrls));

    // Build map of attachment URL to transaction
    for (const result of txResults) {
      transactionMap.set(result.attachmentUrl, {
        id: result.txId,
        date: result.txDate,
        payee: result.txPayee,
        amount: result.txAmount,
        type: result.txType,
        isDeleted: result.txIsDeleted,
        status: result.txIsDeleted ? "Trash" : "All Transactions",
      });
    }
  }

  // Enrich attachments with transaction data
  const enriched = attachments.map(att => ({
    ...att,
    transaction: transactionMap.get(att.attachmentUrl) ?? null,
  }));

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
