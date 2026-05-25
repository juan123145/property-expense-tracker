import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { properties, units, transactions, transactionAttachments } from "@/db/schema";
import { eq, and, sum, desc, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PropertyDetailClient } from "./property-detail-client";
import { TransactionsTableSection } from "@/app/(app)/transactions/transactions-client";

async function getProperty(id: string, userId: string) {
  const [property] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, id), eq(properties.userId, userId)))
    .limit(1);
  return property ?? null;
}

async function getUnits(propertyId: string) {
  return db.select().from(units).where(eq(units.propertyId, propertyId));
}

async function getPropertyTransactions(propertyId: string, userId: string) {
  const txRows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      payee: transactions.payee,
      category: transactions.category,
      subcategory: transactions.subcategory,
      propertyId: transactions.propertyId,
      unitId: transactions.unitId,
      notes: transactions.notes,
      needsReview: transactions.needsReview,
      propertyName: properties.name,
      unitName: units.name,
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(
      and(
        eq(transactions.propertyId, propertyId),
        eq(transactions.userId, userId),
        eq(transactions.isDeleted, false)
      )
    )
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  const attachmentRows = await db
    .select({
      transactionId: transactionAttachments.transactionId,
      id: transactionAttachments.id,
      url: transactionAttachments.url,
      name: transactionAttachments.name,
      sizeKb: transactionAttachments.sizeKb,
    })
    .from(transactionAttachments)
    .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
    .where(
      and(
        eq(transactions.propertyId, propertyId),
        eq(transactions.userId, userId),
        eq(transactions.isDeleted, false)
      )
    )
    .orderBy(transactionAttachments.transactionId, asc(transactionAttachments.position));

  const byTxId = new Map<string, Array<{ id: string; url: string; name: string | null; sizeKb: number | null }>>();
  for (const a of attachmentRows) {
    const list = byTxId.get(a.transactionId) ?? [];
    list.push({ id: a.id, url: a.url, name: a.name, sizeKb: a.sizeKb });
    byTxId.set(a.transactionId, list);
  }

  return txRows.map((tx) => ({ ...tx, attachments: byTxId.get(tx.id) ?? [] }));
}

async function getSummary(propertyId: string, userId: string) {
  const rows = await db
    .select({ type: transactions.type, total: sum(transactions.amount) })
    .from(transactions)
    .where(
      and(
        eq(transactions.propertyId, propertyId),
        eq(transactions.userId, userId),
        eq(transactions.isDeleted, false)
      )
    )
    .groupBy(transactions.type);

  const income = Number(rows.find((r) => r.type === "income")?.total ?? 0);
  const expenses = Number(rows.find((r) => r.type === "expense")?.total ?? 0);
  return { income, expenses, net: income - expenses };
}

type PageProps = { params: Promise<{ id: string }> };

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();

  const [property, unitList, summary, txList] = await Promise.all([
    getProperty(id, user.id),
    getUnits(id),
    getSummary(id, user.id),
    getPropertyTransactions(id, user.id),
  ]);

  if (!property) notFound();

  const location = [property.city, property.state].filter(Boolean).join(", ");
  const propertyForForm = [{ id: property.id, name: property.name }];
  const unitsForForm = unitList.map((u) => ({
    id: u.id,
    propertyId: property.id,
    name: u.name,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/properties" className="hover:text-foreground transition-colors">Properties</Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground font-medium">{property.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{property.name}</h1>
            {property.type && <Badge variant="secondary">{property.type}</Badge>}
            {property.isArchived && <Badge variant="outline">Archived</Badge>}
          </div>
          {(property.address || location) && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {[property.address, location].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
        <PropertyDetailClient property={property} units={unitList} />
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Income</p>
          <p className="text-xl font-bold text-green-600 mt-1">
            ${summary.income.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</p>
          <p className="text-xl font-bold text-red-600 mt-1">
            ${summary.expenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Income</p>
          <p className={`text-xl font-bold mt-1 ${summary.net >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${summary.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Units */}
      <div>
        <h2 className="font-semibold mb-3">Units ({unitList.length})</h2>
        {unitList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No units yet. Add a unit to get started.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unitList.map((unit) => (
              <div key={unit.id} className="px-4 py-3 rounded-lg border bg-card text-sm font-medium">
                {unit.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div>
        <h2 className="font-semibold mb-3">Transactions ({txList.length})</h2>
        <TransactionsTableSection
          transactions={txList}
          properties={propertyForForm}
          allUnits={unitsForForm}
          showAddButton={false}
        />
      </div>
    </div>
  );
}
