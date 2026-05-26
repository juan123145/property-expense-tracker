import { db } from "@/db";
import {
  transactions,
  transactionAttachments,
  softDeleteQueue,
  storageOwnerships,
} from "@/db/schema";
import { eq, and, lte, inArray } from "drizzle-orm";
import { deleteFromR2 } from "@/lib/r2";

/**
 * Process permanent deletions for soft-deleted transactions.
 * Handles up to 100 transactions at a time in batches.
 * Attempts to delete files from R2 and database records.
 * On failure, marks records with DELETE_FAILED status and increments retry count.
 *
 * @returns Object with deletedCount and failedCount
 */
export async function processPermanentDeletions(): Promise<{
  deletedCount: number;
  failedCount: number;
}> {
  let deletedCount = 0;
  let failedCount = 0;

  // Get up to 100 soft-deleted transactions ready for permanent deletion
  const queuedRecords = await db
    .select({
      id: softDeleteQueue.id,
      transactionId: softDeleteQueue.transactionId,
    })
    .from(softDeleteQueue)
    .where(
      and(
        eq(softDeleteQueue.status, "SOFT_DELETED"),
        lte(softDeleteQueue.scheduledPermanentDeleteAt, new Date())
      )
    )
    .limit(100);

  for (const record of queuedRecords) {
    try {
      // Get all attachments for this transaction
      const attachments = await db
        .select({
          id: transactionAttachments.id,
          url: transactionAttachments.url,
        })
        .from(transactionAttachments)
        .where(eq(transactionAttachments.transactionId, record.transactionId));

      // Delete each attachment from R2
      for (const attachment of attachments) {
        try {
          await deleteFromR2(attachment.url);
        } catch (err) {
          console.error(
            `Failed to delete R2 file for attachment ${attachment.id}:`,
            err
          );
          // Continue with other attachments
        }
      }

      // Get all storage ownerships for these attachments and mark as deleted
      if (attachments.length > 0) {
        const attachmentUrls = attachments.map((a) => a.url);
        const storageRecords = await db
          .select({ id: storageOwnerships.id })
          .from(storageOwnerships)
          .where(inArray(storageOwnerships.attachmentUrl, attachmentUrls));

        if (storageRecords.length > 0) {
          const storageIds = storageRecords.map((s) => s.id);
          await db
            .update(storageOwnerships)
            .set({ deletedAt: new Date() })
            .where(inArray(storageOwnerships.id, storageIds));
        }
      }

      // Hard delete transaction and attachments (cascade)
      await db
        .delete(transactions)
        .where(eq(transactions.id, record.transactionId));

      // Update SoftDeleteQueue to PERMANENTLY_DELETED
      await db
        .update(softDeleteQueue)
        .set({
          status: "PERMANENTLY_DELETED",
          permanentDeleteAt: new Date(),
          attemptedDeleteAt: new Date(),
        })
        .where(eq(softDeleteQueue.id, record.id));

      deletedCount++;
    } catch (err) {
      console.error(
        `Error processing permanent deletion for queue ${record.id}:`,
        err
      );

      // Get current retry count
      const [current] = await db
        .select({ retryCount: softDeleteQueue.retryCount })
        .from(softDeleteQueue)
        .where(eq(softDeleteQueue.id, record.id))
        .limit(1);

      const newRetryCount = (current?.retryCount ?? 0) + 1;

      // Mark as failed and increment retry count
      await db
        .update(softDeleteQueue)
        .set({
          status: "DELETE_FAILED",
          retryCount: newRetryCount,
          errorMessage: err instanceof Error ? err.message : "Unknown error",
          attemptedDeleteAt: new Date(),
        })
        .where(eq(softDeleteQueue.id, record.id));

      failedCount++;
    }
  }

  return { deletedCount, failedCount };
}

/**
 * Retry failed deletion attempts.
 * Gets DELETE_FAILED records with retryCount < 5 and resets them to SOFT_DELETED.
 * This allows them to be reprocessed by the next processPermanentDeletions() call.
 *
 * @returns Object with retriedCount
 */
export async function retryFailedDeletions(): Promise<{ retriedCount: number }> {
  let retriedCount = 0;

  // Get DELETE_FAILED records with retryCount < 5
  const failedRecords = await db
    .select({ id: softDeleteQueue.id })
    .from(softDeleteQueue)
    .where(
      and(
        eq(softDeleteQueue.status, "DELETE_FAILED"),
        inArray(softDeleteQueue.retryCount, [0, 1, 2, 3, 4])
      )
    )
    .limit(50);

  for (const record of failedRecords) {
    try {
      // Reset status back to SOFT_DELETED to reprocess
      await db
        .update(softDeleteQueue)
        .set({ status: "SOFT_DELETED" })
        .where(eq(softDeleteQueue.id, record.id));

      retriedCount++;
    } catch (err) {
      console.error(`Error retrying deletion for queue ${record.id}:`, err);
    }
  }

  return { retriedCount };
}
