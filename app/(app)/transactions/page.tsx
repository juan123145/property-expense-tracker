import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units, transactionAttachments } from "@/db/schema";
import { eq, and, desc, asc, inArray, or } from "drizzle-orm";
import { TransactionsClient } from "./transactions-client";

const INITIAL_PAGE_SIZE = 2;

async function getFirstPageTransactions(userId: string, accessibleIds: string[]) {
  console.time("getFirstPageTransactions");

  const txRows = await db
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
      propertyImage: properties.imageUrl,
      unitName: units.name,
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(
      and(
        eq(transactions.isDeleted, false),
        or(
          accessibleIds.length > 0 ? inArray(transactions.propertyId, accessibleIds) : undefined,
          eq(transactions.userId, userId)
        )
      )
    )
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(INITIAL_PAGE_SIZE);

  const txIds = txRows.map((tx) => tx.id);
  let attachmentsByTxId = new Map<string, Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>>();

  if (txIds.length > 0) {
    const attachmentRows = await db
      .select({
        transactionId: transactionAttachments.transactionId,
        id: transactionAttachments.id,
        url: transactionAttachments.url,
        name: transactionAttachments.name,
        sizeKb: transactionAttachments.sizeKb,
      })
      .from(transactionAttachments)
      .where(inArray(transactionAttachments.transactionId, txIds))
      .orderBy(transactionAttachments.transactionId, asc(transactionAttachments.position));

    for (const a of attachmentRows) {
      const list = attachmentsByTxId.get(a.transactionId) ?? [];
      list.push({ id: a.id, url: a.url, name: a.name, sizeKb: a.sizeKb });
      attachmentsByTxId.set(a.transactionId, list);
    }
  }

  const result = txRows.map((tx) => ({
    ...tx,
    attachments: attachmentsByTxId.get(tx.id) ?? [],
  }));

  console.timeEnd("getFirstPageTransactions");
  return result;
}

async function getProperties(accessibleIds: string[]) {
  console.time("getProperties");

  if (accessibleIds.length === 0) {
    console.timeEnd("getProperties");
    return [];
  }

  const result = await db
    .select({ id: properties.id, name: properties.name, imageUrl: properties.imageUrl })
    .from(properties)
    .where(and(inArray(properties.id, accessibleIds), eq(properties.isArchived, false)));

  console.timeEnd("getProperties");
  return result;
}

async function getAllUnits(accessibleIds: string[]) {
  console.time("getAllUnits");

  if (accessibleIds.length === 0) {
    console.timeEnd("getAllUnits");
    return [];
  }

  const result = await db
    .select({ id: units.id, propertyId: units.propertyId, name: units.name })
    .from(units)
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(inArray(properties.id, accessibleIds));

  console.timeEnd("getAllUnits");
  return result;
}

export default async function TransactionsPage() {
  console.time("TransactionsPage:total");

  const user = await requireAuth();
  const accessibleIds = await getAccessiblePropertyIds(user.id);

  const [txRows, propList, unitList] = await Promise.all([
    getFirstPageTransactions(user.id, accessibleIds),
    getProperties(accessibleIds),
    getAllUnits(accessibleIds),
  ]);

  console.timeEnd("TransactionsPage:total");

  return (
    <TransactionsClient
      transactions={txRows}
      trashedTransactions={[]}
      properties={propList}
      allUnits={unitList}
      userId={user.id}
    />
  );
}
