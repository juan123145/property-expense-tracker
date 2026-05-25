import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units } from "@/db/schema";
import { eq, and, sql, ne } from "drizzle-orm";
import { getPresetRange, presetDisplayLabel, type DatePreset } from "@/lib/date-ranges";
import { ExpenseSummaryClient } from "./client";

export type Interval = "by-month" | "by-property";

export type ReportColumn = { id: string; label: string };

export type RawRow = {
  type: string;
  category: string | null;
  subcategory: string | null;
  colKey: string;
  total: number;
};

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateRange(
  preset: string | undefined,
  start: string | undefined,
  end: string | undefined
): { range: { start: string; end: string }; preset: DatePreset } {
  const named = ["mtd", "last-month", "ytd", "last-12", "last-cal-year"] as const;
  type Named = typeof named[number];
  if (preset && (named as readonly string[]).includes(preset)) {
    return { range: getPresetRange(preset as Named), preset: preset as DatePreset };
  }
  if (preset === "custom" && start && end) return { range: { start, end }, preset: "custom" };
  return { range: { start: monthStart(), end: todayIso() }, preset: "mtd" };
}

export function getMonthsInRange(start: string, end: string): ReportColumn[] {
  const cols: ReportColumn[] = [];
  let [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (sy < ey || (sy === ey && sm <= em)) {
    cols.push({
      id: `${sy}-${sm}`,
      label: new Date(sy, sm - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" }),
    });
    sm++;
    if (sm > 12) { sm = 1; sy++; }
  }
  return cols;
}

export default async function ExpenseSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; unit?: string; preset?: string; start?: string; end?: string; interval?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const interval: Interval = params.interval === "by-property" ? "by-property" : "by-month";
  const { range, preset } = parseDateRange(params.preset, params.start, params.end);
  const propertyId = params.property ?? null;
  const unitId = params.unit ?? null;

  const base = [
    eq(transactions.userId, user.id),
    eq(transactions.isDeleted, false),
    ne(transactions.category as Parameters<typeof ne>[0], "Transfers"),
    sql`${transactions.date} >= ${range.start}::date`,
    sql`${transactions.date} <= ${range.end}::date`,
    ...(propertyId ? [eq(transactions.propertyId, propertyId)] : []),
    ...(unitId ? [eq(transactions.unitId, unitId)] : []),
  ];

  const [userProperties, allUnits] = await Promise.all([
    db.select({ id: properties.id, name: properties.name })
      .from(properties)
      .where(and(eq(properties.userId, user.id), eq(properties.isArchived, false))),
    db.select({ id: units.id, propertyId: units.propertyId, name: units.name })
      .from(units),
  ]);

  let columns: ReportColumn[];
  let rawRows: RawRow[];

  if (interval === "by-month") {
    columns = getMonthsInRange(range.start, range.end);

    const dbRows = await db
      .select({
        type: transactions.type,
        category: transactions.category,
        subcategory: transactions.subcategory,
        yr: sql<number>`EXTRACT(YEAR FROM ${transactions.date})::int`,
        mo: sql<number>`EXTRACT(MONTH FROM ${transactions.date})::int`,
        total: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(and(...base))
      .groupBy(
        transactions.type, transactions.category, transactions.subcategory,
        sql`EXTRACT(YEAR FROM ${transactions.date})`,
        sql`EXTRACT(MONTH FROM ${transactions.date})`
      );

    rawRows = dbRows.map((r) => ({
      type: r.type,
      category: r.category,
      subcategory: r.subcategory,
      colKey: `${r.yr}-${r.mo}`,
      total: parseFloat(r.total ?? "0"),
    }));
  } else {
    // By Property — or by Unit if a property is already selected
    const useUnits = Boolean(propertyId);
    const cols = useUnits
      ? allUnits.filter((u) => u.propertyId === propertyId).map((u) => ({ id: u.id, label: u.name }))
      : userProperties.map((p) => ({ id: p.id, label: p.name }));
    columns = cols;

    const groupField = useUnits ? transactions.unitId : transactions.propertyId;

    const dbRows = await db
      .select({
        type: transactions.type,
        category: transactions.category,
        subcategory: transactions.subcategory,
        colId: groupField,
        total: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(and(...base))
      .groupBy(transactions.type, transactions.category, transactions.subcategory, groupField);

    rawRows = dbRows.map((r) => ({
      type: r.type,
      category: r.category,
      subcategory: r.subcategory,
      colKey: r.colId ?? "",
      total: parseFloat(r.total ?? "0"),
    }));
  }

  const periodLabel = presetDisplayLabel(preset, params.start, params.end);
  const propertyName = userProperties.find((p) => p.id === propertyId)?.name ?? "";

  return (
    <ExpenseSummaryClient
      rawRows={rawRows}
      columns={columns}
      interval={interval}
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
