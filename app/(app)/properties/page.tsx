import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { properties, units, transactions, propertyMemberships } from "@/db/schema";
import { eq, and, count, sum, sql, inArray } from "drizzle-orm";
import { PropertiesClient } from "./properties-client";

async function getPropertiesWithStats(userId: string, includeArchived = false) {
  const rows = await db
    .select({
      id: properties.id,
      name: properties.name,
      address: properties.address,
      city: properties.city,
      state: properties.state,
      type: properties.type,
      isArchived: properties.isArchived,
      imageUrl: properties.imageUrl,
      createdAt: properties.createdAt,
    })
    .from(properties)
    .where(
      includeArchived
        ? eq(properties.userId, userId)
        : and(eq(properties.userId, userId), eq(properties.isArchived, false))
    );

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const unitCounts = await db
    .select({ propertyId: units.propertyId, cnt: count() })
    .from(units)
    .where(sql`${units.propertyId} = ANY(${sql.raw(`ARRAY[${ids.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`)
    .groupBy(units.propertyId);

  const expenseTotals = await db
    .select({ propertyId: transactions.propertyId, total: sum(transactions.amount) })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        eq(transactions.isDeleted, false),
        sql`${transactions.propertyId} = ANY(${sql.raw(`ARRAY[${ids.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`
      )
    )
    .groupBy(transactions.propertyId);

  const unitMap = Object.fromEntries(unitCounts.map((u) => [u.propertyId, Number(u.cnt)]));
  const expenseMap = Object.fromEntries(expenseTotals.map((e) => [e.propertyId, Number(e.total ?? 0)]));

  return rows.map((p) => ({
    ...p,
    unitCount: unitMap[p.id] ?? 0,
    totalExpenses: expenseMap[p.id] ?? 0,
  }));
}

async function getSharedProperties(userId: string) {
  const memberships = await db
    .select({ propertyId: propertyMemberships.propertyId, role: propertyMemberships.role })
    .from(propertyMemberships)
    .where(and(eq(propertyMemberships.userId, userId), eq(propertyMemberships.status, "ACTIVE"), sql`${propertyMemberships.role} != 'OWNER'`));

  if (memberships.length === 0) return [];

  const ids = memberships.map((m) => m.propertyId);
  const roleMap = Object.fromEntries(memberships.map((m) => [m.propertyId, m.role]));

  const rows = await db
    .select({ id: properties.id, name: properties.name, address: properties.address, city: properties.city, state: properties.state, type: properties.type, isArchived: properties.isArchived, imageUrl: properties.imageUrl, createdAt: properties.createdAt })
    .from(properties)
    .where(and(inArray(properties.id, ids), eq(properties.isArchived, false)));

  return rows.map((p) => ({ ...p, unitCount: 0, totalExpenses: 0, sharedPermission: roleMap[p.id] === "EDITOR" ? "edit" : "view" }));
}

export default async function PropertiesPage() {
  const user = await requireAuth();
  const [activeProps, archivedProps, sharedProps] = await Promise.all([
    getPropertiesWithStats(user.id, false),
    getPropertiesWithStats(user.id, true).then((all) => all.filter((p) => p.isArchived)),
    getSharedProperties(user.id),
  ]);

  return (
    <PropertiesClient
      activeProperties={activeProps}
      archivedProperties={archivedProps}
      sharedProperties={sharedProps}
    />
  );
}
