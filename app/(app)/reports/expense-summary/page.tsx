import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units } from "@/db/schema";
import { eq, and, sql, ne, isNotNull } from "drizzle-orm";
import { getPresetRange, presetDisplayLabel, type DatePreset } from "@/lib/date-ranges";
import { EXCLUDED_CATEGORIES } from "@/lib/report-utils";
import { ExpenseSummaryClient } from "./client";

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type DateRange = { start: string; end: string };

function parseDateRange(
  preset: string | undefined,
  start: string | undefined,
  end: string | undefined
): { range: DateRange; preset: DatePreset } {
  const namedPresets = ["mtd", "last-month", "ytd", "last-12", "last-cal-year"] as const;
  type Named = typeof namedPresets[number];

  if (preset && (namedPresets as readonly string[]).includes(preset)) {
    return { range: getPresetRange(preset as Named), preset: preset as DatePreset };
  }
  if (preset === "custom" && start && end) {
    return { range: { start, end }, preset: "custom" };
  }
  // Default: current month
  return { range: { start: monthStart(), end: todayIso() }, preset: "mtd" };
}

export default async function ExpenseSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; unit?: string; preset?: string; start?: string; end?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const { range, preset } = parseDateRange(params.preset, params.start, params.end);
  const propertyId = params.property ?? null;
  const unitId = params.unit ?? null;

  const base = [
    eq(transactions.userId, user.id),
    eq(transactions.type, "expense"),
    eq(transactions.isDeleted, false),
    isNotNull(transactions.category),
    ...EXCLUDED_CATEGORIES.map((cat) => ne(transactions.category as Parameters<typeof ne>[0], cat)),
    sql`${transactions.date} >= ${range.start}::date`,
    sql`${transactions.date} <= ${range.end}::date`,
    ...(propertyId ? [eq(transactions.propertyId, propertyId)] : []),
    ...(unitId ? [eq(transactions.unitId, unitId)] : []),
  ];

  const [rows, userProperties, allUnits] = await Promise.all([
    db
      .select({
        category: transactions.category,
        total: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(and(...base))
      .groupBy(transactions.category)
      .orderBy(sql`sum(${transactions.amount}) desc`),

    db
      .select({ id: properties.id, name: properties.name })
      .from(properties)
      .where(and(eq(properties.userId, user.id), eq(properties.isArchived, false))),

    db
      .select({ id: units.id, propertyId: units.propertyId, name: units.name })
      .from(units),
  ]);

  const grandTotal = rows.reduce((s, r) => s + parseFloat(r.total ?? "0"), 0);
  const data = rows.map((r) => ({
    category: r.category ?? "Uncategorized",
    total: parseFloat(r.total ?? "0"),
    pct: grandTotal > 0 ? (parseFloat(r.total ?? "0") / grandTotal) * 100 : 0,
  }));

  const periodLabel = presetDisplayLabel(preset, params.start, params.end);
  const propertyName = userProperties.find((p) => p.id === propertyId)?.name ?? "";

  return (
    <ExpenseSummaryClient
      data={data}
      grandTotal={grandTotal}
      userProperties={userProperties}
      allUnits={allUnits}
      currentPropertyId={propertyId ?? ""}
      currentUnitId={unitId ?? ""}
      currentDateRange={{ preset, start: params.start ?? "", end: params.end ?? "" }}
      periodLabel={periodLabel}
      propertyName={propertyName}
    />
  );
}
