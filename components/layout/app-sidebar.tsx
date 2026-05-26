"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Receipt, BarChart2, Settings, LogOut, Shield, ChevronLeft, ChevronRight,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/brand/logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/transactions", label: "Transactions", icon: Receipt, hasBadge: true },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

type Props = { needsReviewCount: number; isAdmin?: boolean };

export function AppSidebar({ needsReviewCount, isAdmin }: Props) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <aside className={cn(
      "hidden md:flex flex-col shrink-0 border-r bg-card h-screen sticky top-0 transition-all duration-300 ease-in-out",
      isMounted && isCollapsed ? "w-20" : "w-60"
    )}>
      <div className={cn(
        "flex items-center justify-between px-4 py-4 border-b transition-all duration-300",
        isMounted && isCollapsed && "flex-col gap-2"
      )}>
        {!isMounted || !isCollapsed ? <AppLogo /> : null}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-1.5 hover:bg-accent rounded-md transition-colors ml-auto",
            isMounted && isCollapsed && "ml-0"
          )}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isMounted && isCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, hasBadge }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const badge = hasBadge && needsReviewCount > 0 ? needsReviewCount : null;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors justify-center",
                isMounted && isCollapsed && "flex-col",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              title={isMounted && isCollapsed ? label : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {!isMounted || !isCollapsed ? (
                <>
                  <span className="flex-1">{label}</span>
                  {badge !== null && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </>
              ) : null}
              {isMounted && isCollapsed && badge !== null && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {isAdmin && (
        <div className={cn(
          "px-2 py-3 border-t border-b transition-all duration-300",
          isMounted && isCollapsed && "flex justify-center"
        )}>
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-primary font-medium hover:bg-primary/10 transition-colors border border-primary/20",
              isMounted && isCollapsed && "flex-col p-1.5"
            )}
            title={isMounted && isCollapsed ? "Admin" : undefined}
          >
            <Shield className="size-4 shrink-0" />
            {!isMounted || !isCollapsed ? "Admin" : null}
          </Link>
        </div>
      )}
      <div className={cn(
        "px-2 py-3 border-t transition-all duration-300",
        isMounted && isCollapsed && "flex justify-center"
      )}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
            isMounted && isCollapsed && "flex-col p-1.5"
          )}
          title={isMounted && isCollapsed ? "Sign out" : undefined}
        >
          <LogOut className="size-4 shrink-0" />
          {!isMounted || !isCollapsed ? "Sign out" : null}
        </button>
      </div>
    </aside>
  );
}

export function MobileBottomNav({ needsReviewCount, isAdmin }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 flex border-t bg-card/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {navItems.map(({ href, label, icon: Icon, hasBadge }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const badge = hasBadge && needsReviewCount > 0 ? needsReviewCount : null;

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <Icon className={cn("size-6", active ? "text-primary" : "text-muted-foreground")} />
              {badge !== null && (
                <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            {label}
          </Link>
        );
      })}
      {isAdmin && (
        <Link
          href="/admin"
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-colors",
            pathname === "/admin" || pathname.startsWith("/admin/")
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <Shield className={cn("size-6", pathname === "/admin" || pathname.startsWith("/admin/") ? "text-primary" : "text-muted-foreground")} />
          Admin
        </Link>
      )}
    </nav>
  );
}
