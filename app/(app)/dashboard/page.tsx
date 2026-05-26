import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties } from "@/db/schema";
import { eq, and, sql, desc, count, isNotNull, inArray } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";
import { getPresetRange, presetDisplayLabel, type DatePreset } from "@/lib/date-ranges";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

// ─── Parse searchParams ───────────────────────────────────────────────────────

type DateRange = { start: string; end: string };

function parseDateRange(
  preset: string | undefined,
  start: string | undefined,
  end: string | undefined
): { range: DateRange | null; preset: DatePreset } {
  // Default to Month-to-Date when no filter is in the URL
  if (!preset) {
    const range = getPresetRange("mtd");
    return { range, preset: "mtd" };
  }
  if (preset === "all") return { range: null, preset: "all" };

  const namedPresets = ["mtd", "last-month", "ytd", "last-12", "last-cal-year"] as const;
  type Named = typeof namedPresets[number];

  if ((namedPresets as readonly string[]).includes(preset)) {
    const range = getPresetRange(preset as Named);
    return { range, preset: preset as DatePreset };
  }

  if (preset === "custom" && start && end) {
    return { range: { start, end }, preset: "custom" };
  }

  return { range: null, preset: "all" };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

async function getSummary(
  userId: string,
  range: DateRange | null,
  propertyId: string | null
) {
  const periodStart = range?.start ?? monthStart();
  const periodEnd = range?.end ?? null;
  const ys = yearStart();

  const accessiblePropertyIds = await getAccessiblePropertyIds(userId);

  const base = [
    inArray(transactions.propertyId, accessiblePropertyIds),
    eq(transactions.isDeleted, false),
    ...(propertyId ? [eq(transactions.propertyId, propertyId)] : []),
  ];

  const periodCond = [
    sql`${transactions.date} >= ${periodStart}::date`,
    ...(periodEnd ? [sql`${transactions.date} <= ${periodEnd}::date`] : []),
  ];

  const yearCond = [sql`${transactions.date} >= ${ys}::date`];

  const [expPeriod, expYear, incPeriod, incYear, topCat, needsReview] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(...base, eq(transactions.type, "expense"), ...periodCond)),

    range === null
      ? db.select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
          .from(transactions)
          .where(and(...base, eq(transactions.type, "expense"), ...yearCond))
      : Promise.resolve([{ total: "0" }]),

    db.select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(...base, eq(transactions.type, "income"), ...periodCond)),

    range === null
      ? db.select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
          .from(transactions)
          .where(and(...base, eq(transactions.type, "income"), ...yearCond))
      : Promise.resolve([{ total: "0" }]),

    db.select({ category: transactions.category, total: sql<string>`sum(${transactions.amount})` })
      .from(transactions)
      .where(and(...base, eq(transactions.type, "expense"), isNotNull(transactions.category), ...periodCond))
      .groupBy(transactions.category)
      .orderBy(sql`sum(${transactions.amount}) desc`)
      .limit(1),

    db.select({ value: count() })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.needsReview, true), eq(transactions.isDeleted, false))),
  ]);

  return {
    expensesMonth: parseFloat(expPeriod[0]?.total ?? "0"),
    expensesYear: parseFloat(expYear[0]?.total ?? "0"),
    incomeMonth: parseFloat(incPeriod[0]?.total ?? "0"),
    incomeYear: parseFloat(incYear[0]?.total ?? "0"),
    topCategory: topCat[0]?.category ?? null,
    topCategoryAmount: parseFloat(topCat[0]?.total ?? "0"),
    needsReviewCount: needsReview[0]?.value ?? 0,
  };
}

async function getPropertyTotals(
  userId: string,
  range: DateRange | null,
  filterPropertyId: string | null
) {
  const periodStart = range?.start ?? monthStart();
  const periodEnd = range?.end ?? null;
  const ys = yearStart();

  const accessiblePropertyIds = await getAccessiblePropertyIds(userId);

  const propQuery = db
    .select({ id: properties.id, name: properties.name, address: properties.address, city: properties.city, state: properties.state, type: properties.type, imageUrl: properties.imageUrl })
    .from(properties)
    .where(and(inArray(properties.id, accessiblePropertyIds), eq(properties.isArchived, false)));

  const props = filterPropertyId
    ? (await propQuery).filter((p) => p.id === filterPropertyId)
    : await propQuery;

  if (props.length === 0) return [];

  // When a date range is active, use it; otherwise use YTD for "year" bucket
  const rangeStart = range !== null ? periodStart : ys;
  const monthBucketStart = periodStart;

  const periodExpr = sql<string>`case when ${transactions.date} >= '${sql.raw(monthBucketStart)}'::date ${periodEnd ? sql`and ${transactions.date} <= '${sql.raw(periodEnd)}'::date` : sql``} then 'month' else 'year' end`;

  const expenseRows = await db
    .select({
      propertyId: transactions.propertyId,
      period: periodExpr,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        eq(transactions.isDeleted, false),
        sql`${transactions.date} >= ${rangeStart}::date`,
        ...(periodEnd && range !== null ? [sql`${transactions.date} <= ${periodEnd}::date`] : [])
      )
    )
    .groupBy(transactions.propertyId, periodExpr);

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

async function getCategoryChart(
  userId: string,
  range: DateRange | null,
  propertyId: string | null
) {
  const periodStart = range?.start ?? monthStart();
  const periodEnd = range?.end ?? null;

  const accessiblePropertyIds = await getAccessiblePropertyIds(userId);

  const base = [
    inArray(transactions.propertyId, accessiblePropertyIds),
    eq(transactions.type, "expense"),
    eq(transactions.isDeleted, false),
    isNotNull(transactions.category),
    ...(propertyId ? [eq(transactions.propertyId, propertyId)] : []),
    sql`${transactions.date} >= ${periodStart}::date`,
    ...(periodEnd ? [sql`${transactions.date} <= ${periodEnd}::date`] : []),
  ];

  const rows = await db
    .select({ category: transactions.category, total: sql<string>`sum(${transactions.amount})` })
    .from(transactions)
    .where(and(...base))
    .groupBy(transactions.category)
    .orderBy(sql`sum(${transactions.amount}) desc`)
    .limit(8);

  return rows.map((r) => ({ category: r.category ?? "Uncategorized", total: parseFloat(r.total ?? "0") }));
}

async function getRecentTransactions(userId: string, propertyId: string | null) {
  const accessiblePropertyIds = await getAccessiblePropertyIds(userId);

  return db
    .select({ id: transactions.id, date: transactions.date, amount: transactions.amount, type: transactions.type, payee: transactions.payee, category: transactions.category, propertyName: properties.name })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .where(
      and(
        inArray(transactions.propertyId, accessiblePropertyIds),
        eq(transactions.isDeleted, false),
        ...(propertyId ? [eq(transactions.propertyId, propertyId)] : [])
      )
    )
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(5);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; preset?: string; start?: string; end?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const { range, preset } = parseDateRange(params.preset, params.start, params.end);
  const propertyId = params.property ?? null;

  const accessiblePropertyIds = await getAccessiblePropertyIds(user.id);

  const [summary, propertyTotals, categoryChart, recentTxs, userProperties] = await Promise.all([
    getSummary(user.id, range, propertyId),
    getPropertyTotals(user.id, range, propertyId),
    getCategoryChart(user.id, range, propertyId),
    getRecentTransactions(user.id, propertyId),
    db.select({ id: properties.id, name: properties.name })
      .from(properties)
      .where(and(inArray(properties.id, accessiblePropertyIds), eq(properties.isArchived, false))),
  ]);

  const periodLabel = presetDisplayLabel(preset, params.start, params.end);
  const hasDateFilter = preset !== "all";

  const currentMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <DashboardClient
      userName={user.name?.split(" ")[0] ?? "there"}
      currentMonth={currentMonth}
      summary={summary}
      propertyTotals={propertyTotals}
      categoryChart={categoryChart}
      recentTransactions={recentTxs}
      userProperties={userProperties}
      currentPropertyId={propertyId ?? ""}
      currentDateRange={{
        preset,
        start: params.start ?? "",
        end: params.end ?? "",
      }}
      periodLabel={periodLabel}
      hasDateFilter={hasDateFilter}
    />
  );
}
