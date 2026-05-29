import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units, transactionAttachments } from "@/db/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { NeedsReviewClient } from "./needs-review-client";
import { buildTransactionAccess } from "@/lib/transaction-auth";

async function getNeedsReviewTransactions(userId: string, accessibleIds: string[]) {
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      payee: transactions.payee,
      category: transactions.category,
      subcategory: transactions.subcategory,
      propertyId: transactions.propertyId,
      unitId: transactions.unitId,
      notes: transactions.notes,
      needsReview: transactions.needsReview,
      propertyName: properties.name,
      unitName: units.name,
      attachmentUrl: transactions.attachmentUrl,
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(
      and(
        buildTransactionAccess(userId, accessibleIds),
        eq(transactions.needsReview, true),
        eq(transactions.isDeleted, false)
      )
    )
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

async function getAttachments(userId: string, accessibleIds: string[]) {
  return db
    .select({
      transactionId: transactionAttachments.transactionId,
      id: transactionAttachments.id,
      url: transactionAttachments.url,
      name: transactionAttachments.name,
      sizeKb: transactionAttachments.sizeKb,
    })
    .from(transactionAttachments)
    .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
    .where(
      and(
        buildTransactionAccess(userId, accessibleIds),
        eq(transactions.needsReview, true),
        eq(transactions.isDeleted, false)
      )
    )
    .orderBy(transactionAttachments.transactionId, asc(transactionAttachments.position));
}

async function getProperties(accessibleIds: string[]) {
  if (accessibleIds.length === 0) return [];
  return db
    .select({ id: properties.id, name: properties.name })
    .from(properties)
    .where(and(inArray(properties.id, accessibleIds), eq(properties.isArchived, false)));
}

async function getAllUnits(accessibleIds: string[]) {
  if (accessibleIds.length === 0) return [];
  return db
    .select({ id: units.id, propertyId: units.propertyId, name: units.name })
    .from(units)
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(inArray(properties.id, accessibleIds));
}

export default async function NeedsReviewPage() {
  const user = await requireAuth();
  const accessibleIds = await getAccessiblePropertyIds(user.id);

  const [txRows, attachmentRows, propList, unitList] = await Promise.all([
    getNeedsReviewTransactions(user.id, accessibleIds),
    getAttachments(user.id, accessibleIds),
    getProperties(accessibleIds),
    getAllUnits(accessibleIds),
  ]);

  const attachmentsByTxId = new Map<
    string,
    Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>
  >();
  for (const a of attachmentRows) {
    const list = attachmentsByTxId.get(a.transactionId) ?? [];
    list.push({ id: a.id, url: a.url, name: a.name, sizeKb: a.sizeKb });
    attachmentsByTxId.set(a.transactionId, list);
  }

  const txList = txRows.map((tx) => ({
    ...tx,
    attachments: attachmentsByTxId.get(tx.id) ?? [],
  }));

  return (
    <NeedsReviewClient
      transactions={txList}
      properties={propList}
      allUnits={unitList}
    />
  );
}
