import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, transactionAttachments } from "@/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const accessibleIds = await getAccessiblePropertyIds(user.id);
  const { id } = await params;

  const result = await db
    .select({
      id: transactionAttachments.id,
      url: transactionAttachments.url,
      name: transactionAttachments.name,
      sizeKb: transactionAttachments.sizeKb,
    })
    .from(transactionAttachments)
    .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.isDeleted, false),
        accessibleIds.length > 0 ? inArray(transactions.propertyId, accessibleIds) : eq(transactions.userId, user.id)
      )
    )
    .orderBy(asc(transactionAttachments.position));

  return NextResponse.json(result);
}
