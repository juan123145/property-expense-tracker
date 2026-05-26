import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, properties, units, users } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppSidebar, MobileBottomNav } from "@/components/layout/app-sidebar";
import { AppLogo } from "@/components/brand/logo";
import { QuickAddFAB } from "@/components/ui/quick-add-fab";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  // Gate: if onboarding not complete, redirect to onboarding
  const [userRow] = await db
    .select({ onboardingComplete: users.onboardingComplete })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!userRow?.onboardingComplete) {
    redirect("/onboarding");
  }

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
  const isAdmin = !!(
    process.env.ADMIN_EMAIL &&
    user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
  );

  return (
    <div className="flex min-h-screen">
      <AppSidebar needsReviewCount={needsReviewCount} isAdmin={isAdmin} />

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center h-12 px-4 border-b bg-card/95 backdrop-blur-sm">
        <AppLogo />
      </header>

      <main className="flex-1 overflow-y-auto pt-12 pb-24 md:pt-0 md:pb-0">
        {children}
      </main>

      <MobileBottomNav needsReviewCount={needsReviewCount} isAdmin={isAdmin} />
      <QuickAddFAB properties={userProperties} allUnits={allUnits} />
    </div>
  );
}
