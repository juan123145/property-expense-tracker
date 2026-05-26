import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { properties, transactions, transactionAttachments, users } from "@/db/schema";
import { eq, count, sum, sql, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminClient } from "./admin-client";

type FileRow = {
  userId: string;
  fileName: string | null;
  sizeKb: number | null;
  url: string;
  txDate: Date;
  txPayee: string | null;
  txAmount: string;
};

export default async function AdminPage() {
  const user = await requireAuth();

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    redirect("/dashboard");
  }

  // Collect all distinct userIds across the properties table
  const userRows = await db
    .selectDistinct({ userId: properties.userId })
    .from(properties);

  const userIds = userRows.map((r) => r.userId);

  if (userIds.length === 0) {
    return <AdminClient users={[]} />;
  }

  // Aggregate per user
  const propertyCounts = await db
    .select({ userId: properties.userId, cnt: count() })
    .from(properties)
    .groupBy(properties.userId);

  const txCounts = await db
    .select({ userId: transactions.userId, cnt: count() })
    .from(transactions)
    .where(eq(transactions.isDeleted, false))
    .groupBy(transactions.userId);

  const storageTotals = await db
    .select({ userId: transactions.userId, totalKb: sum(transactionAttachments.sizeKb) })
    .from(transactionAttachments)
    .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
    .groupBy(transactions.userId);

  const userProfiles = await db.select().from(users);
  const profileMap = Object.fromEntries(userProfiles.map((u) => [u.id, u]));

  const fileCounts = await db
    .select({ userId: transactions.userId, cnt: count() })
    .from(transactionAttachments)
    .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
    .groupBy(transactions.userId);
  const fileCountMap = Object.fromEntries(fileCounts.map((r) => [r.userId, r.cnt]));

  const allFiles = await db
    .select({
      userId: transactions.userId,
      fileName: transactionAttachments.name,
      sizeKb: transactionAttachments.sizeKb,
      url: transactionAttachments.url,
      txDate: transactions.date,
      txPayee: transactions.payee,
      txAmount: transactions.amount,
    })
    .from(transactionAttachments)
    .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
    .orderBy(desc(transactionAttachments.sizeKb));

  const filesByUser: Record<string, FileRow[]> = {};
  for (const f of allFiles) {
    if (!filesByUser[f.userId]) filesByUser[f.userId] = [];
    filesByUser[f.userId].push({
      ...f,
      txDate: typeof f.txDate === 'string' ? new Date(f.txDate) : f.txDate,
    });
  }

  const propMap = Object.fromEntries(propertyCounts.map((r) => [r.userId, r.cnt]));
  const txMap = Object.fromEntries(txCounts.map((r) => [r.userId, r.cnt]));
  const storageMap = Object.fromEntries(storageTotals.map((r) => [r.userId, Number(r.totalKb ?? 0)]));

  const userList = userIds
    .map((userId) => ({
      userId,
      email: profileMap[userId]?.email ?? null,
      name: profileMap[userId]?.name ?? null,
      image: profileMap[userId]?.image ?? null,
      propertyCount: propMap[userId] ?? 0,
      transactionCount: txMap[userId] ?? 0,
      fileCount: fileCountMap[userId] ?? 0,
      storageKb: storageMap[userId] ?? 0,
      files: filesByUser[userId] ?? [],
    }))
    .sort((a, b) => b.propertyCount - a.propertyCount);

  return <AdminClient users={userList} currentUserId={user.id} />;
}
