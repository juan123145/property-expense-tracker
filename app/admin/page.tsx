import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { properties, transactions, transactionAttachments } from "@/db/schema";
import { eq, count, sum, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminClient } from "./admin-client";

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

  const propMap = Object.fromEntries(propertyCounts.map((r) => [r.userId, r.cnt]));
  const txMap = Object.fromEntries(txCounts.map((r) => [r.userId, r.cnt]));
  const storageMap = Object.fromEntries(storageTotals.map((r) => [r.userId, Number(r.totalKb ?? 0)]));

  const users = userIds.map((userId) => ({
    userId,
    propertyCount: propMap[userId] ?? 0,
    transactionCount: txMap[userId] ?? 0,
    storageKb: storageMap[userId] ?? 0,
  })).sort((a, b) => b.propertyCount - a.propertyCount);

  return <AdminClient users={users} currentUserId={user.id} />;
}
