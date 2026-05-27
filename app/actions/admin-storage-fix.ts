"use server";

import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { storageOwnerships, transactionAttachments, transactions, properties } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

export async function fixStorageAttribution() {
  const user = await requireAuth();

  // Only property owners can run this
  const userProperties = await db
    .select({ id: properties.id, ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.ownerId, user.id));

  if (userProperties.length === 0) {
    throw new Error("You don't own any properties.");
  }

  let updated = 0;
  let errors: string[] = [];

  // For each property owned by this user
  for (const prop of userProperties) {
    try {
      // Find all transactions for this property
      const txsForProperty = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.propertyId, prop.id));

      const txIds = txsForProperty.map(t => t.id);

      if (txIds.length === 0) continue;

      // Find all attachments for these transactions
      const attachmentsForTxs = await db
        .select({ url: transactionAttachments.url })
        .from(transactionAttachments)
        .where(inArray(transactionAttachments.transactionId, txIds));

      const urls = attachmentsForTxs.map(a => a.url);

      if (urls.length === 0) continue;

      // Update storage ownership for these attachments to property owner
      await db
        .update(storageOwnerships)
        .set({
          ownerId: prop.ownerId,
          propertyId: prop.id,
        })
        .where(
          and(
            inArray(storageOwnerships.attachmentUrl, urls),
            isNull(storageOwnerships.deletedAt)
          )
        );

      updated += urls.length;
    } catch (err) {
      errors.push(`Error processing property ${prop.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return {
    success: true,
    updated,
    errors: errors.length > 0 ? errors : null,
  };
}
