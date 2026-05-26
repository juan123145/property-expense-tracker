import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getPresetRange, presetDisplayLabel, type DatePreset } from "@/lib/date-ranges";
import { ByPropertyClient } from "./client";

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
  return { range: { start: monthStart(), end: todayIso() }, preset: "mtd" };
}

export default async function ByPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const { range, preset } = parseDateRange(params.preset, params.start, params.end);

  const accessiblePropertyIds = await getAccessiblePropertyIds(user.id);

  const [props, txRows, allUnits] = await Promise.all([
    db
      .select({ id: properties.id, name: properties.name, address: properties.address, city: properties.city, state: properties.state })
      .from(properties)
      .where(and(inArray(properties.id, accessiblePropertyIds), eq(properties.isArchived, false))),

    db
      .select({
        propertyId: transactions.propertyId,
        unitId: transactions.unitId,
        type: transactions.type,
        total: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.propertyId, accessiblePropertyIds),
          eq(transactions.isDeleted, false),
          sql`${transactions.date} >= ${range.start}::date`,
          sql`${transactions.date} <= ${range.end}::date`
        )
      )
      .groupBy(transactions.propertyId, transactions.unitId, transactions.type),

    db.select({ id: units.id, propertyId: units.propertyId, name: units.name }).from(units),
  ]);

  // Build per-property + per-unit totals
  const unitMap = new Map<string, { id: string; name: string; propertyId: string; income: number; expenses: number }>();
  for (const u of allUnits) {
    if (u.propertyId) {
      unitMap.set(u.id, { id: u.id, name: u.name, propertyId: u.propertyId, income: 0, expenses: 0 });
    }
  }

  const propMap = new Map<string, { income: number; expenses: number }>(
    props.map((p) => [p.id, { income: 0, expenses: 0 }])
  );

  for (const row of txRows) {
    const amt = parseFloat(row.total ?? "0");
    if (row.propertyId && propMap.has(row.propertyId)) {
      const entry = propMap.get(row.propertyId)!;
      if (row.type === "income") entry.income += amt;
      else entry.expenses += amt;
    }
    if (row.unitId && unitMap.has(row.unitId)) {
      const entry = unitMap.get(row.unitId)!;
      if (row.type === "income") entry.income += amt;
      else entry.expenses += amt;
    }
  }

  const data = props.map((p) => {
    const totals = propMap.get(p.id) ?? { income: 0, expenses: 0 };
    const propUnits = [...unitMap.values()]
      .filter((u) => u.propertyId === p.id)
      .map((u) => ({ id: u.id, name: u.name, propertyId: u.propertyId, income: u.income, expenses: u.expenses, net: u.income - u.expenses }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: p.id,
      name: p.name,
      address: p.address,
      income: totals.income,
      expenses: totals.expenses,
      net: totals.income - totals.expenses,
      units: propUnits,
    };
  }).sort((a, b) => b.expenses - a.expenses);

  const periodLabel = presetDisplayLabel(preset, params.start, params.end);

  return (
    <ByPropertyClient
      data={data}
      currentDateRange={{ preset, start: params.start ?? "", end: params.end ?? "" }}
      periodLabel={periodLabel}
    />
  );
}
