import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units } from "@/db/schema";
import { eq, and, sql, ne, isNotNull, inArray } from "drizzle-orm";
import { EXCLUDED_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/report-utils";
import { AnnualSummaryClient } from "./client";

export default async function AnnualSummaryPage({
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

  const baseFilters = (y: number) => [
    inArray(transactions.propertyId, accessiblePropertyIds),
    eq(transactions.type, "expense"),
    eq(transactions.isDeleted, false),
    isNotNull(transactions.category),
    ...EXCLUDED_CATEGORIES.map((cat) => ne(transactions.category as Parameters<typeof ne>[0], cat)),
    sql`EXTRACT(YEAR FROM ${transactions.date}) = ${y}`,
    ...(propertyId ? [eq(transactions.propertyId, propertyId)] : []),
    ...(unitId ? [eq(transactions.unitId, unitId)] : []),
  ];

  const [thisYearRows, lastYearRows, userProperties, allUnits] = await Promise.all([
    db
      .select({ category: transactions.category, total: sql<string>`sum(${transactions.amount})` })
      .from(transactions)
      .where(and(...baseFilters(year)))
      .groupBy(transactions.category),

    db
      .select({ category: transactions.category, total: sql<string>`sum(${transactions.amount})` })
      .from(transactions)
      .where(and(...baseFilters(year - 1)))
      .groupBy(transactions.category),

    db
      .select({ id: properties.id, name: properties.name })
      .from(properties)
      .where(and(inArray(properties.id, accessiblePropertyIds), eq(properties.isArchived, false))),

    db
      .select({ id: units.id, propertyId: units.propertyId, name: units.name })
      .from(units),
  ]);

  const thisYearMap = new Map(thisYearRows.map((r) => [r.category ?? "Uncategorized", parseFloat(r.total ?? "0")]));
  const lastYearMap = new Map(lastYearRows.map((r) => [r.category ?? "Uncategorized", parseFloat(r.total ?? "0")]));

  const allCats = new Set([...thisYearMap.keys(), ...lastYearMap.keys()]);
  const orderedCats: string[] = [];
  for (const ec of EXPENSE_CATEGORIES) {
    if (allCats.has(ec.name)) orderedCats.push(ec.name);
  }
  for (const cat of allCats) {
    if (!orderedCats.includes(cat)) orderedCats.push(cat);
  }

  const data = orderedCats.map((cat) => {
    const thisYear = thisYearMap.get(cat) ?? 0;
    const lastYear = lastYearMap.get(cat) ?? 0;
    const change = thisYear - lastYear;
    const changePct = lastYear > 0 ? (change / lastYear) * 100 : null;
    return { category: cat, thisYear, lastYear, change, changePct };
  });

  const hasPriorYearData = lastYearRows.length > 0;
  const propertyName = userProperties.find((p) => p.id === propertyId)?.name ?? "";

  return (
    <AnnualSummaryClient
      data={data}
      year={year}
      hasPriorYearData={hasPriorYearData}
      userProperties={userProperties}
      allUnits={allUnits}
      currentPropertyId={propertyId ?? ""}
      currentUnitId={unitId ?? ""}
      propertyName={propertyName}
    />
  );
}
