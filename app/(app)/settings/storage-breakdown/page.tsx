import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { storageOwnerships, transactionAttachments, transactions, properties } from "@/db/schema";
import { eq, and, isNull, desc, inArray, sql } from "drizzle-orm";
import { StorageBreakdownClient } from "./client";

const QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB
const ALLOWED_PAGE_SIZES = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 25;

async function getStorageBreakdown(
  userId: string,
  offset: number,
  pageSize: number,
) {
  const rows = await db
    .select({
      id: storageOwnerships.id,
      attachmentUrl: storageOwnerships.attachmentUrl,
      fileName: storageOwnerships.filePath,
      sizeBytes: storageOwnerships.sizeBytes,
      contentType: storageOwnerships.contentType,
      propertyId: storageOwnerships.propertyId,
      propertyName: properties.name,
      createdAt: storageOwnerships.createdAt,
    })
    .from(storageOwnerships)
    .leftJoin(properties, eq(storageOwnerships.propertyId, properties.id))
    .where(and(
      eq(storageOwnerships.ownerId, userId),
      isNull(storageOwnerships.deletedAt),
    ))
    .orderBy(desc(storageOwnerships.createdAt))
    .limit(pageSize)
    .offset(offset);

  const attachmentUrls = rows.map((r) => r.attachmentUrl);
  const transactionMap = new Map<string, {
    id: string;
    date: string;
    payee: string | null;
    amount: string;
    type: string;
    isDeleted: boolean | null;
    status: string;
  }>();

  if (attachmentUrls.length > 0) {
    const txResults = await db
      .select({
        attachmentUrl: transactionAttachments.url,
        txId: transactions.id,
        txDate: transactions.date,
        txPayee: transactions.payee,
        txAmount: transactions.amount,
        txType: transactions.type,
        txIsDeleted: transactions.isDeleted,
      })
      .from(transactionAttachments)
      .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
      .where(inArray(transactionAttachments.url, attachmentUrls));

    for (const result of txResults) {
      transactionMap.set(result.attachmentUrl, {
        id: result.txId,
        date: result.txDate,
        payee: result.txPayee,
        amount: result.txAmount,
        type: result.txType,
        isDeleted: result.txIsDeleted,
        status: result.txIsDeleted ? "Trash" : "All Transactions",
      });
    }
  }

  return rows.map((att) => ({
    ...att,
    transaction: transactionMap.get(att.attachmentUrl) ?? null,
  }));
}

async function getTotalCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(storageOwnerships)
    .where(and(
      eq(storageOwnerships.ownerId, userId),
      isNull(storageOwnerships.deletedAt),
    ));
  return row?.count ?? 0;
}

async function getTotalUsage(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${storageOwnerships.sizeBytes}), 0)` })
    .from(storageOwnerships)
    .where(and(
      eq(storageOwnerships.ownerId, userId),
      isNull(storageOwnerships.deletedAt),
    ));
  return row?.total ?? 0;
}

async function getByType(userId: string): Promise<Record<string, { count: number; totalBytes: number }>> {
  const rows = await db
    .select({
      contentType: storageOwnerships.contentType,
      sizeBytes: storageOwnerships.sizeBytes,
    })
    .from(storageOwnerships)
    .where(and(
      eq(storageOwnerships.ownerId, userId),
      isNull(storageOwnerships.deletedAt),
    ));

  const byType = new Map<string, { count: number; totalBytes: number }>();
  for (const r of rows) {
    const type = r.contentType || "unknown";
    const current = byType.get(type) ?? { count: 0, totalBytes: 0 };
    current.count++;
    current.totalBytes += r.sizeBytes ?? 0;
    byType.set(type, current);
  }
  return Object.fromEntries(byType);
}

export default async function StorageBreakdownPage(props: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireAuth();

  const rawPageSize = parseInt(String(searchParams.pageSize ?? ""), 10);
  const pageSize: number = (ALLOWED_PAGE_SIZES as readonly number[]).includes(rawPageSize)
    ? rawPageSize
    : DEFAULT_PAGE_SIZE;

  const [totalCount, totalBytes, byType] = await Promise.all([
    getTotalCount(user.id),
    getTotalUsage(user.id),
    getByType(user.id),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rawPage = parseInt(String(searchParams.page ?? "1"), 10);
  const page = Math.min(Math.max(1, isNaN(rawPage) ? 1 : rawPage), totalPages);
  const offset = (page - 1) * pageSize;

  const attachments = await getStorageBreakdown(user.id, offset, pageSize);

  const usedKb = Math.round(totalBytes / 1024);
  const quotaKb = Math.round(QUOTA_BYTES / 1024);

  return (
    <StorageBreakdownClient
      attachments={attachments}
      byType={byType}
      usedKb={usedKb}
      quotaKb={quotaKb}
      totalCount={totalCount}
      currentPage={page}
      currentPageSize={pageSize}
    />
  );
}
