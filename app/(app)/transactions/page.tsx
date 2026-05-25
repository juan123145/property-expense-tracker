import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TransactionsClient } from "./transactions-client";

async function getTransactions(userId: string) {
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
      attachmentUrl: transactions.attachmentUrl,
      needsReview: transactions.needsReview,
      propertyName: properties.name,
      unitName: units.name,
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(and(eq(transactions.userId, userId), eq(transactions.isDeleted, false)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
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

export default async function TransactionsPage() {
  const user = await requireAuth();

  const [txList, propList, unitList] = await Promise.all([
    getTransactions(user.id),
    getProperties(user.id),
    getAllUnits(user.id),
  ]);

  return (
    <TransactionsClient
      transactions={txList}
      properties={propList}
      allUnits={unitList}
    />
  );
}
