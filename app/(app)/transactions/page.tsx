import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units, transactionAttachments, propertyMemberships } from "@/db/schema";
import { eq, and, desc, asc, inArray, or, sql } from "drizzle-orm";
import { TransactionsClient } from "./transactions-client";

async function getAccessiblePropertyIds(userId: string) {
  // Get properties owned/created by user
  const owned = await db
    .select({ id: properties.id })
    .from(properties)
    .where(or(eq(properties.userId, userId), eq(properties.ownerId, userId)));

  // Get properties user is member of
  const shared = await db
    .select({ id: propertyMemberships.propertyId })
    .from(propertyMemberships)
    .where(and(eq(propertyMemberships.userId, userId), eq(propertyMemberships.status, "ACTIVE")));

  const ownedIds = owned.map((p) => p.id);
  const sharedIds = shared.map((m) => m.id);
  const allIds = [...new Set([...ownedIds, ...sharedIds])];

  return allIds;
}

async function getTransactions(userId: string) {
  const accessibleIds = await getAccessiblePropertyIds(userId);

  if (accessibleIds.length === 0) {
    return [];
  }

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
    .where(and(inArray(transactions.propertyId, accessibleIds), eq(transactions.isDeleted, false)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

async function getTrashedTransactions(userId: string) {
  const accessibleIds = await getAccessiblePropertyIds(userId);

  if (accessibleIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      payee: transactions.payee,
      category: transactions.category,
      subcategory: transactions.subcategory,
      deletedAt: transactions.deletedAt,
      propertyName: properties.name,
      unitName: units.name,
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(and(inArray(transactions.propertyId, accessibleIds), eq(transactions.isDeleted, true)))
    .orderBy(desc(transactions.deletedAt));
}

async function getAttachments(userId: string) {
  const accessibleIds = await getAccessiblePropertyIds(userId);

  if (accessibleIds.length === 0) {
    return [];
  }

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
    .where(and(inArray(transactions.propertyId, accessibleIds), eq(transactions.isDeleted, false)))
    .orderBy(transactionAttachments.transactionId, asc(transactionAttachments.position));
}

async function getProperties(userId: string) {
  const accessibleIds = await getAccessiblePropertyIds(userId);

  if (accessibleIds.length === 0) {
    return [];
  }

  return db
    .select({ id: properties.id, name: properties.name })
    .from(properties)
    .where(and(inArray(properties.id, accessibleIds), eq(properties.isArchived, false)));
}

async function getAllUnits(userId: string) {
  const accessibleIds = await getAccessiblePropertyIds(userId);

  if (accessibleIds.length === 0) {
    return [];
  }

  return db
    .select({ id: units.id, propertyId: units.propertyId, name: units.name })
    .from(units)
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(inArray(properties.id, accessibleIds));
}

export default async function TransactionsPage() {
  const user = await requireAuth();

  const [txRows, trashedRows, attachmentRows, propList, unitList] = await Promise.all([
    getTransactions(user.id),
    getTrashedTransactions(user.id),
    getAttachments(user.id),
    getProperties(user.id),
    getAllUnits(user.id),
  ]);

  const attachmentsByTxId = new Map<string, Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>>();
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
    <TransactionsClient
      transactions={txList}
      trashedTransactions={trashedRows}
      properties={propList}
      allUnits={unitList}
    />
  );
}
