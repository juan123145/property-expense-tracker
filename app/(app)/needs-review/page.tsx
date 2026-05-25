import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units, transactionAttachments } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { NeedsReviewClient } from "./needs-review-client";

async function getNeedsReviewTransactions(userId: string) {
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
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.needsReview, true),
        eq(transactions.isDeleted, false)
      )
    )
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

async function getAttachments(userId: string) {
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
        eq(transactions.userId, userId),
        eq(transactions.needsReview, true),
        eq(transactions.isDeleted, false)
      )
    )
    .orderBy(transactionAttachments.transactionId, asc(transactionAttachments.position));
}

async function getProperties(userId: string) {
  return db
    .select({ id: properties.id, name: properties.name })
    .from(properties)
    .where(and(eq(properties.userId, userId), eq(properties.isArchived, false)));
}

async function getAllUnits(userId: string) {
  return db
    .select({ id: units.id, propertyId: units.propertyId, name: units.name })
    .from(units)
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(eq(properties.userId, userId));
}

export default async function NeedsReviewPage() {
  const user = await requireAuth();

  const [txRows, attachmentRows, propList, unitList] = await Promise.all([
    getNeedsReviewTransactions(user.id),
    getAttachments(user.id),
    getProperties(user.id),
    getAllUnits(user.id),
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
