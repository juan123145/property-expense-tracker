import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties } from "@/db/schema";
import { eq, and, sql, desc, count, isNotNull } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

async function getSummary(userId: string) {
  const ms = monthStart();
  const ys = yearStart();

  const [expMonth, expYear, incMonth, incYear, topCat, needsReview] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), eq(transactions.isDeleted, false), sql`${transactions.date} >= ${ms}::date`)),

    db.select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), eq(transactions.isDeleted, false), sql`${transactions.date} >= ${ys}::date`)),

    db.select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "income"), eq(transactions.isDeleted, false), sql`${transactions.date} >= ${ms}::date`)),

    db.select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "income"), eq(transactions.isDeleted, false), sql`${transactions.date} >= ${ys}::date`)),

    db.select({ category: transactions.category, total: sql<string>`sum(${transactions.amount})` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), eq(transactions.isDeleted, false), isNotNull(transactions.category), sql`${transactions.date} >= ${ms}::date`))
      .groupBy(transactions.category)
      .orderBy(sql`sum(${transactions.amount}) desc`)
      .limit(1),

    db.select({ value: count() })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.needsReview, true), eq(transactions.isDeleted, false))),
  ]);

  return {
    expensesMonth: parseFloat(expMonth[0]?.total ?? "0"),
    expensesYear: parseFloat(expYear[0]?.total ?? "0"),
    incomeMonth: parseFloat(incMonth[0]?.total ?? "0"),
    incomeYear: parseFloat(incYear[0]?.total ?? "0"),
    topCategory: topCat[0]?.category ?? null,
    topCategoryAmount: parseFloat(topCat[0]?.total ?? "0"),
    needsReviewCount: needsReview[0]?.value ?? 0,
  };
}

async function getPropertyTotals(userId: string) {
  const ms = monthStart();
  const ys = yearStart();

  const props = await db
    .select({ id: properties.id, name: properties.name, address: properties.address, city: properties.city, state: properties.state, type: properties.type, imageUrl: properties.imageUrl })
    .from(properties)
    .where(and(eq(properties.userId, userId), eq(properties.isArchived, false)));

  if (props.length === 0) return [];

  const expenseRows = await db
    .select({
      propertyId: transactions.propertyId,
      period: sql<string>`case when ${transactions.date} >= ${ms}::date then 'month' else 'year' end`,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), eq(transactions.isDeleted, false), sql`${transactions.date} >= ${ys}::date`))
    .groupBy(transactions.propertyId, sql`case when ${transactions.date} >= ${ms}::date then 'month' else 'year' end`);

  const byProp = new Map<string, { month: number; year: number }>();
  for (const row of expenseRows) {
    if (!row.propertyId) continue;
    const entry = byProp.get(row.propertyId) ?? { month: 0, year: 0 };
    const amt = parseFloat(row.total ?? "0");
    if (row.period === "month") entry.month += amt;
    entry.year += amt;
    byProp.set(row.propertyId, entry);
  }

  return props
    .map((p) => ({ ...p, expensesMonth: byProp.get(p.id)?.month ?? 0, expensesYear: byProp.get(p.id)?.year ?? 0 }))
    .sort((a, b) => b.expensesMonth - a.expensesMonth);
}

async function getCategoryChart(userId: string) {
  const ms = monthStart();
  const rows = await db
    .select({ category: transactions.category, total: sql<string>`sum(${transactions.amount})` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), eq(transactions.isDeleted, false), isNotNull(transactions.category), sql`${transactions.date} >= ${ms}::date`))
    .groupBy(transactions.category)
    .orderBy(sql`sum(${transactions.amount}) desc`)
    .limit(8);

  return rows.map((r) => ({ category: r.category ?? "Uncategorized", total: parseFloat(r.total ?? "0") }));
}

async function getRecentTransactions(userId: string) {
  return db
    .select({ id: transactions.id, date: transactions.date, amount: transactions.amount, type: transactions.type, payee: transactions.payee, category: transactions.category, propertyName: properties.name })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .where(and(eq(transactions.userId, userId), eq(transactions.isDeleted, false)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(5);
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const [summary, propertyTotals, categoryChart, recentTxs] = await Promise.all([
    getSummary(user.id),
    getPropertyTotals(user.id),
    getCategoryChart(user.id),
    getRecentTransactions(user.id),
  ]);

  const currentMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <DashboardClient
      userName={user.name?.split(" ")[0] ?? "there"}
      currentMonth={currentMonth}
      summary={summary}
      propertyTotals={propertyTotals}
      categoryChart={categoryChart}
      recentTransactions={recentTxs}
    />
  );
}
