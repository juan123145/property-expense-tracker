"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const REPORT_TABS = [
  { href: "/reports/expense-summary", label: "Expense Summary" },
  { href: "/reports/monthly-breakdown", label: "Monthly Breakdown" },
  { href: "/reports/annual-summary", label: "Annual Summary" },
  { href: "/reports/by-property", label: "By Property" },
  { href: "/reports/cpa-summary", label: "CPA / Tax" },
];

function ReportNav() {
  const pathname = usePathname();
  return (
    <div className="border-b bg-card sticky top-12 md:top-0 z-20">
      <div className="flex overflow-x-auto scrollbar-none px-4 md:px-6">
        {REPORT_TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "?");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "shrink-0 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-full">
      <ReportNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
