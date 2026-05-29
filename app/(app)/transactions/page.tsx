import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units, transactionAttachments } from "@/db/schema";
import { eq, and, desc, asc, inArray, or, sql, ilike, between, type SQL } from "drizzle-orm";
import { TransactionsClient } from "./transactions-client";
import { buildTransactionAccess } from "@/lib/transaction-auth";

const ALLOWED_PAGE_SIZES = [2, 10, 30] as const;
const DEFAULT_PAGE_SIZE = 2;

const ALLOWED_TABS = ["all", "needs-review", "trash"] as const;
type TabValue = (typeof ALLOWED_TABS)[number];

type Filters = {
  search: string;
  type: string;
  category: string;
  propertyId: string;
  dateStart: string;
  dateEnd: string;
};

// ─── WHERE clause builders ────────────────────────────────────────────────────

function buildFilterConditions(f: Filters) {
  const conditions: Parameters<typeof and>[0][] = [];
  if (f.search) {
    conditions.push(
      or(
        ilike(transactions.payee, `%${f.search}%`),
        ilike(transactions.notes, `%${f.search}%`),
        ilike(transactions.category, `%${f.search}%`),
      ),
    );
  }
  if (f.type && f.type !== "all") conditions.push(eq(transactions.type, f.type));
  if (f.category) conditions.push(eq(transactions.category, f.category));
  if (f.propertyId) conditions.push(eq(transactions.propertyId, f.propertyId));
  if (f.dateStart && f.dateEnd) conditions.push(between(transactions.date, f.dateStart, f.dateEnd));
  return conditions;
}

function buildAllWhere(userId: string, accessibleIds: string[], f: Filters) {
  return and(
    eq(transactions.isDeleted, false),
    buildTransactionAccess(userId, accessibleIds),
    ...buildFilterConditions(f),
  );
}

function buildNeedsReviewWhere(userId: string, accessibleIds: string[], f: Filters) {
  return and(
    eq(transactions.isDeleted, false),
    eq(transactions.needsReview, true),
    buildTransactionAccess(userId, accessibleIds),
    ...buildFilterConditions(f),
  );
}

function buildTrashWhere(userId: string, accessibleIds: string[], f: Filters) {
  return and(
    eq(transactions.isDeleted, true),
    buildTransactionAccess(userId, accessibleIds),
    ...buildFilterConditions(f),
  );
}

// ─── Count query ──────────────────────────────────────────────────────────────

async function countRows(where: SQL<unknown> | undefined): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(transactions)
    .where(where);
  return row?.count ?? 0;
}

// ─── Row queries ──────────────────────────────────────────────────────────────

async function getPageTransactions(
  where: SQL<unknown> | undefined,
  offset: number,
  pageSize: number,
) {
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
    .where(where)
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(pageSize)
    .offset(offset);

  if (txRows.length === 0) return [];

  const txIds = txRows.map((tx) => tx.id);
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

  const attachmentsByTxId = new Map<
    string,
    Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>
  >();
  for (const a of attachmentRows) {
    const list = attachmentsByTxId.get(a.transactionId) ?? [];
    list.push({ id: a.id, url: a.url, name: a.name, sizeKb: a.sizeKb });
    attachmentsByTxId.set(a.transactionId, list);
  }

  return txRows.map((tx) => ({
    ...tx,
    attachments: attachmentsByTxId.get(tx.id) ?? [],
  }));
}

async function getPageTrashedTransactions(
  where: SQL<unknown> | undefined,
  offset: number,
  pageSize: number,
) {
  const txRows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      payee: transactions.payee,
      category: transactions.category,
      subcategory: transactions.subcategory,
      notes: transactions.notes,
      propertyId: transactions.propertyId,
      unitId: transactions.unitId,
      deletedAt: transactions.deletedAt,
      propertyName: properties.name,
      propertyImage: properties.imageUrl,
      unitName: units.name,
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(where)
    .orderBy(desc(transactions.deletedAt), desc(transactions.createdAt))
    .limit(pageSize)
    .offset(offset);

  if (txRows.length === 0) return [];

  const txIds = txRows.map((tx) => tx.id);
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

  const attachmentsByTxId = new Map<
    string,
    Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>
  >();
  for (const a of attachmentRows) {
    const list = attachmentsByTxId.get(a.transactionId) ?? [];
    list.push({ id: a.id, url: a.url, name: a.name, sizeKb: a.sizeKb });
    attachmentsByTxId.set(a.transactionId, list);
  }

  return txRows.map((tx) => ({
    ...tx,
    attachments: attachmentsByTxId.get(tx.id) ?? [],
  }));
}

// ─── Properties / units lookups ───────────────────────────────────────────────

async function getProperties(accessibleIds: string[]) {
  if (accessibleIds.length === 0) return [];
  return db
    .select({ id: properties.id, name: properties.name, imageUrl: properties.imageUrl })
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TransactionsPage(props: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireAuth();
  const accessibleIds = await getAccessiblePropertyIds(user.id);

  // Validate tab
  const rawTab = String(searchParams.tab ?? "all");
  const activeTab: TabValue = (ALLOWED_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as TabValue)
    : "all";

  // Validate pageSize — only allow [2, 10, 30]
  const rawPageSize = parseInt(String(searchParams.pageSize ?? ""), 10);
  const pageSize: number = (ALLOWED_PAGE_SIZES as readonly number[]).includes(rawPageSize)
    ? rawPageSize
    : DEFAULT_PAGE_SIZE;

  // Parse filter params from URL
  const filters: Filters = {
    search: String(searchParams.search ?? "").trim(),
    type: String(searchParams.type ?? "all"),
    category: String(searchParams.category ?? ""),
    propertyId: String(searchParams.propertyId ?? ""),
    dateStart: String(searchParams.dateStart ?? ""),
    dateEnd: String(searchParams.dateEnd ?? ""),
  };

  // Build WHERE clauses for all three datasets
  const allWhere = buildAllWhere(user.id, accessibleIds, filters);
  const needsReviewWhere = buildNeedsReviewWhere(user.id, accessibleIds, filters);
  const trashWhere = buildTrashWhere(user.id, accessibleIds, filters);

  // Always count all three for accurate badge counts + properties/units in parallel
  const [allCount, needsReviewCount, trashCount, propList, unitList] = await Promise.all([
    countRows(allWhere),
    countRows(needsReviewWhere),
    countRows(trashWhere),
    getProperties(accessibleIds),
    getAllUnits(accessibleIds),
  ]);

  // Active tab's count drives pagination
  const tabCount =
    activeTab === "needs-review" ? needsReviewCount
    : activeTab === "trash" ? trashCount
    : allCount;

  // Clamp page to valid range (1-indexed in URL)
  const totalPages = Math.max(1, Math.ceil(tabCount / pageSize));
  const rawPage = parseInt(String(searchParams.page ?? "1"), 10);
  const page = Math.min(Math.max(1, isNaN(rawPage) ? 1 : rawPage), totalPages);
  const offset = (page - 1) * pageSize;

  // Fetch only the active tab's rows
  let txRows: Awaited<ReturnType<typeof getPageTransactions>> = [];
  let trashedRows: Awaited<ReturnType<typeof getPageTrashedTransactions>> = [];

  if (activeTab === "all") {
    txRows = await getPageTransactions(allWhere, offset, pageSize);
  } else if (activeTab === "needs-review") {
    txRows = await getPageTransactions(needsReviewWhere, offset, pageSize);
  } else {
    trashedRows = await getPageTrashedTransactions(trashWhere, offset, pageSize);
  }

  return (
    <TransactionsClient
      activeTab={activeTab}
      transactions={txRows}
      trashedTransactions={trashedRows}
      properties={propList}
      allUnits={unitList}
      userId={user.id}
      allCount={allCount}
      needsReviewCount={needsReviewCount}
      trashCount={trashCount}
      totalCount={tabCount}
      currentPage={page}
      currentPageSize={pageSize}
    />
  );
}
