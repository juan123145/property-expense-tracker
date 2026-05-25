import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { AppSidebar, MobileBottomNav } from "@/components/layout/app-sidebar";
import { AppLogo } from "@/components/brand/logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  const [row] = await db
    .select({ value: count() })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.needsReview, true),
        eq(transactions.isDeleted, false)
      )
    );

  const needsReviewCount = row?.value ?? 0;

  return (
    <div className="flex min-h-screen">
      <AppSidebar needsReviewCount={needsReviewCount} />

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center h-12 px-4 border-b bg-card/95 backdrop-blur-sm">
        <AppLogo />
      </header>

      <main className="flex-1 overflow-y-auto pt-12 pb-20 md:pt-0 md:pb-0">
        {children}
      </main>

      <MobileBottomNav needsReviewCount={needsReviewCount} />
    </div>
  );
}
