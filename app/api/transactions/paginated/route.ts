import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units, transactionAttachments } from "@/db/schema";
import { eq, and, desc, asc, inArray, or, ilike, gt, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

const PAGE_SIZE_LIMIT = 100;
const MIN_PAGE_SIZE = 10;

// Build WHERE clause once, reuse for COUNT and DATA queries
function buildWhereClause(
  userId: string,
  accessibleIds: string[],
  search: string | undefined,
  typeFilter: string | undefined,
  categoryFilter: string | undefined,
  propertyFilter: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  const conditions: any[] = [
    eq(transactions.isDeleted, false),
    or(
      accessibleIds.length > 0 ? inArray(transactions.propertyId, accessibleIds) : undefined,
      eq(transactions.userId, userId)
    ),
  ];

  if (search?.trim()) {
    const searchTerm = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(transactions.payee, searchTerm),
        ilike(transactions.notes, searchTerm),
        ilike(transactions.category, searchTerm)
      )
    );
  }

  if (typeFilter && typeFilter !== "all") {
    conditions.push(eq(transactions.type, typeFilter));
  }

  if (categoryFilter) {
    conditions.push(eq(transactions.category, categoryFilter));
  }

  if (propertyFilter) {
    conditions.push(eq(transactions.propertyId, propertyFilter));
  }

  if (startDate) {
    conditions.push(gt(transactions.date, startDate));
  }

  if (endDate) {
    conditions.push(lt(transactions.date, endDate));
  }

  return and(...conditions.filter(Boolean));
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const accessibleIds = await getAccessiblePropertyIds(user.id);

    // Parse query params with safety guards
    const searchParams = request.nextUrl.searchParams;
    let page = Math.max(0, parseInt(searchParams.get("page") || "0"));
    let pageSize = parseInt(searchParams.get("pageSize") || "10");

    // Clamp pageSize
    pageSize = Math.max(MIN_PAGE_SIZE, Math.min(pageSize, PAGE_SIZE_LIMIT));

    const search = searchParams.get("search")?.trim() || undefined;
    const typeFilter = searchParams.get("type") || undefined;
    const categoryFilter = searchParams.get("category") || undefined;
    const propertyFilter = searchParams.get("property") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    // Build WHERE clause once
    const whereClause = buildWhereClause(
      user.id,
      accessibleIds,
      search,
      typeFilter,
      categoryFilter,
      propertyFilter,
      startDate,
      endDate
    );

    // Get total count
    const [countResult] = await db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(transactions)
      .where(whereClause);

    const total = countResult?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Clamp page to valid range
    page = Math.min(page, totalPages - 1);

    // Fetch paginated transactions
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
      .where(whereClause)
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(pageSize)
      .offset(page * pageSize);

    // Batch fetch attachments for this page only
    const txIds = txRows.map((tx) => tx.id);
    let attachmentsByTxId = new Map<
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

    return NextResponse.json({
      data: result,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/transactions/paginated error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
