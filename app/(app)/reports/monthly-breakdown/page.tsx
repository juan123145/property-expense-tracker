import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units } from "@/db/schema";
import { eq, and, sql, ne, isNotNull, inArray } from "drizzle-orm";
import { EXCLUDED_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/report-utils";
import { MonthlyBreakdownClient } from "./client";

export default async function MonthlyBreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; unit?: string; year?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const currentYear = new Date().getFullYear();
  const year = params.year ? parseInt(params.year) : currentYear;
  const propertyId = params.property ?? null;
  const unitId = params.unit ?? null;

  const accessiblePropertyIds = await getAccessiblePropertyIds(user.id);

  const base = [
    inArray(transactions.propertyId, accessiblePropertyIds),
    eq(transactions.type, "expense"),
    eq(transactions.isDeleted, false),
    isNotNull(transactions.category),
    ...EXCLUDED_CATEGORIES.map((cat) => ne(transactions.category as Parameters<typeof ne>[0], cat)),
    sql`EXTRACT(YEAR FROM ${transactions.date}) = ${year}`,
    ...(propertyId ? [eq(transactions.propertyId, propertyId)] : []),
    ...(unitId ? [eq(transactions.unitId, unitId)] : []),
  ];

  const [rows, userProperties, allUnits] = await Promise.all([
    db
      .select({
        category: transactions.category,
        month: sql<number>`EXTRACT(MONTH FROM ${transactions.date})::int`,
        total: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(and(...base))
      .groupBy(transactions.category, sql`EXTRACT(MONTH FROM ${transactions.date})`),

    db
      .select({ id: properties.id, name: properties.name })
      .from(properties)
      .where(and(inArray(properties.id, accessiblePropertyIds), eq(properties.isArchived, false))),

    db
      .select({ id: units.id, propertyId: units.propertyId, name: units.name })
      .from(units),
  ]);

  // Build category × month grid
  const catMap = new Map<string, number[]>();
  for (const row of rows) {
    const cat = row.category ?? "Uncategorized";
    if (!catMap.has(cat)) catMap.set(cat, Array(12).fill(0));
    catMap.get(cat)![row.month - 1] += parseFloat(row.total ?? "0");
  }

  // Order by EXPENSE_CATEGORIES then any extras
  const orderedCategories: string[] = [];
  for (const ec of EXPENSE_CATEGORIES) {
    if (catMap.has(ec.name)) orderedCategories.push(ec.name);
  }
  for (const cat of catMap.keys()) {
    if (!orderedCategories.includes(cat)) orderedCategories.push(cat);
  }

  const data = orderedCategories.map((cat) => ({
    category: cat,
    months: catMap.get(cat)!,
    rowTotal: catMap.get(cat)!.reduce((s, v) => s + v, 0),
  }));

  const propertyName = userProperties.find((p) => p.id === propertyId)?.name ?? "";

  return (
    <MonthlyBreakdownClient
      data={data}
      year={year}
      userProperties={userProperties}
      allUnits={allUnits}
      currentPropertyId={propertyId ?? ""}
      currentUnitId={unitId ?? ""}
      propertyName={propertyName}
    />
  );
}
