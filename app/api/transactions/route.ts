import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units, transactionAttachments } from "@/db/schema";
import { eq, and, desc, asc, inArray, or, sql, ilike, between } from "drizzle-orm";
import { buildTransactionAccess } from "@/lib/transaction-auth";

function buildFilterConditions(
  userId: string,
  accessibleIds: string[],
  filters: {
    search: string;
    type: string;
    category: string;
    propertyId: string;
    dateStart: string;
    dateEnd: string;
  }
) {
  const conditions: any[] = [
    eq(transactions.isDeleted, false),
    buildTransactionAccess(userId, accessibleIds),
  ];

  if (filters.search.trim()) {
    conditions.push(
      or(
        ilike(transactions.payee, `%${filters.search}%`),
        ilike(transactions.notes, `%${filters.search}%`),
        ilike(transactions.category, `%${filters.search}%`)
      )
    );
  }
  if (filters.type !== "all") {
    conditions.push(eq(transactions.type, filters.type));
  }
  if (filters.category) {
    conditions.push(eq(transactions.category, filters.category));
  }
  if (filters.propertyId) {
    conditions.push(eq(transactions.propertyId, filters.propertyId));
  }
  if (filters.dateStart && filters.dateEnd) {
    conditions.push(between(transactions.date, filters.dateStart, filters.dateEnd));
  }

  return and(...conditions);
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const accessibleIds = await getAccessiblePropertyIds(user.id);

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    const filters = {
      search: (searchParams.get("search") ?? "").trim(),
      type: searchParams.get("type") ?? "all",
      category: searchParams.get("category") ?? "",
      propertyId: searchParams.get("propertyId") ?? "",
      dateStart: searchParams.get("dateStart") ?? "",
      dateEnd: searchParams.get("dateEnd") ?? "",
    };

    const whereClause = buildFilterConditions(user.id, accessibleIds, filters);

    const [countResult, txRows] = await Promise.all([
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(transactions)
        .where(whereClause),
      db
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
        .where(whereClause)
        .orderBy(desc(transactions.date), desc(transactions.createdAt))
        .limit(pageSize)
        .offset(page * pageSize),
    ]);

    const total = countResult[0]?.count ?? 0;
    const txIds = txRows.map((tx) => tx.id);

    const attachmentsByTxId = new Map<
      string,
      Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>
    >();

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

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      transactions: result,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
