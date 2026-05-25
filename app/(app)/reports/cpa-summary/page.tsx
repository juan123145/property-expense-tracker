import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties } from "@/db/schema";
import { eq, and, sql, ne } from "drizzle-orm";
import { SCHEDULE_E_SECTIONS, type CpaSummarySection } from "@/lib/report-utils";
import { CpaSummaryClient } from "./client";

export default async function CpaSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; year?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const currentYear = new Date().getFullYear();
  const year = params.year ? parseInt(params.year) : currentYear;
  const propertyId = params.property ?? null;

  const base = [
    eq(transactions.userId, user.id),
    eq(transactions.isDeleted, false),
    ne(transactions.category as Parameters<typeof ne>[0], "Transfers"),
    sql`EXTRACT(YEAR FROM ${transactions.date}) = ${year}`,
    ...(propertyId ? [eq(transactions.propertyId, propertyId)] : []),
  ];

  const [rows, userProperties] = await Promise.all([
    db
      .select({
        category: transactions.category,
        subcategory: transactions.subcategory,
        type: transactions.type,
        total: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(and(...base))
      .groupBy(transactions.category, transactions.subcategory, transactions.type),

    db
      .select({ id: properties.id, name: properties.name })
      .from(properties)
      .where(and(eq(properties.userId, user.id), eq(properties.isArchived, false))),
  ]);

  // Build a lookup: category → subcategory → total
  const lookup = new Map<string, Map<string | null, number>>();
  for (const row of rows) {
    const cat = row.category ?? "Uncategorized";
    if (!lookup.has(cat)) lookup.set(cat, new Map());
    const subMap = lookup.get(cat)!;
    const key = row.subcategory ?? null;
    subMap.set(key, (subMap.get(key) ?? 0) + parseFloat(row.total ?? "0"));
  }

  const sections: CpaSummarySection[] = SCHEDULE_E_SECTIONS.map((section) => {
    const lines: CpaSummarySection["lines"] = [];

    for (const cat of (section.categories ?? [])) {
      const subMap = lookup.get(cat);
      if (!subMap) continue;

      for (const [subcat, total] of subMap.entries()) {
        if (section.subcategoryFilter && subcat !== section.subcategoryFilter) continue;
        lines.push({ category: cat, subcategory: subcat, total });
      }
    }

    lines.sort((a, b) => {
      const catOrd = (a.category ?? "").localeCompare(b.category ?? "");
      if (catOrd !== 0) return catOrd;
      return (a.subcategory ?? "").localeCompare(b.subcategory ?? "");
    });

    const sectionTotal = lines.reduce((s, l) => s + l.total, 0);
    return { label: section.label, lines, sectionTotal };
  });

  const propertyName = userProperties.find((p) => p.id === propertyId)?.name ?? "";

  return (
    <CpaSummaryClient
      sections={sections}
      year={year}
      userProperties={userProperties}
      currentPropertyId={propertyId ?? ""}
      propertyName={propertyName}
    />
  );
}
