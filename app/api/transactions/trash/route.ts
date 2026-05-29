import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NextResponse, NextRequest } from "next/server";
import { buildTransactionAccess } from "@/lib/transaction-auth";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const accessibleIds = await getAccessiblePropertyIds(user.id);

  const result = await db
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
      propertyImage: properties.imageUrl,
      unitName: units.name,
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(
      and(
        eq(transactions.isDeleted, true),
        buildTransactionAccess(user.id, accessibleIds)
      )
    )
    .orderBy(desc(transactions.deletedAt));

  return NextResponse.json(result);
}
