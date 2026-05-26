import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { AppSidebar, MobileBottomNav } from "@/components/layout/app-sidebar";
import { AppLogo } from "@/components/brand/logo";
import { QuickAddFAB } from "@/components/ui/quick-add-fab";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  const [nrRow, userProperties, allUnits] = await Promise.all([
    db
      .select({ value: count() })
      .from(transactions)
      .where(and(eq(transactions.userId, user.id), eq(transactions.needsReview, true), eq(transactions.isDeleted, false)))
      .then((r) => r[0]),

    db
      .select({ id: properties.id, name: properties.name })
      .from(properties)
      .where(and(eq(properties.userId, user.id), eq(properties.isArchived, false))),

    db
      .select({ id: units.id, propertyId: units.propertyId, name: units.name })
      .from(units),
  ]);

  const needsReviewCount = nrRow?.value ?? 0;

  return (
    <div className="flex min-h-screen">
      <AppSidebar needsReviewCount={needsReviewCount} />

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center h-12 px-4 border-b bg-card/95 backdrop-blur-sm">
        <AppLogo />
      </header>

      <main className="flex-1 overflow-y-auto pt-12 pb-24 md:pt-0 md:pb-0">
        {children}
      </main>

      <MobileBottomNav needsReviewCount={needsReviewCount} />
      <QuickAddFAB properties={userProperties} allUnits={allUnits} />
    </div>
  );
}
