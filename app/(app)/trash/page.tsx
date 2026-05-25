import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TrashClient } from "./trash-client";

async function getTrashedTransactions(userId: string) {
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
    .where(and(eq(transactions.userId, userId), eq(transactions.isDeleted, true)))
    .orderBy(desc(transactions.deletedAt));
}

export default async function TrashPage() {
  const user = await requireAuth();
  const txRows = await getTrashedTransactions(user.id);

  return <TrashClient transactions={txRows} />;
}
